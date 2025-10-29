// database.js 

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class OrderDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.SQL = null;
  }

  async initialize() {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();
      
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'orders.db');
      
      let dbData = null;
      
      // Load existing database if it exists
      if (fs.existsSync(this.dbPath)) {
        dbData = fs.readFileSync(this.dbPath);
      }
      
      // Create database instance
      this.db = new this.SQL.Database(dbData);
      console.log('Connected to SQLite database');

      // Create tables if database is new, or migrate existing database
      if (!dbData) {
        this.createTables();
      } else {
        this.migrateDatabaseSchema();
      }

      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  createTables() {
    try {
      const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          order_date DATE NOT NULL,
          order_time TIME NOT NULL,
          weight TEXT,
          address TEXT,
          image_path TEXT,
          order_notes TEXT,
          status TEXT DEFAULT 'pending',
          payment_status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          delivery_time DATETIME
        )
      `;

      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date)',
        'CREATE INDEX IF NOT EXISTS idx_customer_name ON orders(customer_name)',
        'CREATE INDEX IF NOT EXISTS idx_phone_number ON orders(phone_number)',
        'CREATE INDEX IF NOT EXISTS idx_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_payment_status ON orders(payment_status)'
      ];

      this.db.run(createOrdersTable);
      createIndexes.forEach(indexSql => this.db.run(indexSql));
      
      console.log('Database tables created successfully');
      this.saveDatabase();
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

 migrateDatabaseSchema() {
  // use this function to run migration conditionally
 }
  saveDatabase() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  async addOrder(orderData) {
    try {
      const {
        customerName,
        phoneNumber,
        orderDate,
        orderTime,
        weight = '',
        address = '',
        imagePath,
        orderNotes = '',
        paymentStatus = 'pending'
      } = orderData;

      const sql = `
        INSERT INTO orders (
          customer_name, phone_number, order_date, order_time,
          weight, address, image_path, order_notes, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        customerName, phoneNumber, orderDate, orderTime,
        weight, address, imagePath, orderNotes, paymentStatus
      ]);
      
      // Get the last inserted ID
      const result = this.db.exec("SELECT last_insert_rowid() as id");
      const lastId = result[0].values[0][0];
      
      this.saveDatabase();
      return lastId;
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  }

  async getOrders(filter = {}) {
    try {
      let sql = 'SELECT * FROM orders';
      const params = [];
      const conditions = [];

      if (filter.status) {
        conditions.push('status = ?');
        params.push(filter.status);
      }

      if (filter.paymentStatus) {
        conditions.push('payment_status = ?');
        params.push(filter.paymentStatus);
      }

      if (filter.date) {
        conditions.push('order_date = ?');
        params.push(filter.date);
      }

      if (filter.dateRange) {
        conditions.push('order_date BETWEEN ? AND ?');
        params.push(filter.dateRange.start);
        params.push(filter.dateRange.end);
      }

      if (filter.search) {
        conditions.push('(customer_name LIKE ? OR phone_number LIKE ?)');
        params.push(`%${filter.search}%`);
        params.push(`%${filter.search}%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY order_date DESC, order_time DESC';

      if (filter.limit) {
        sql += ' LIMIT ?';
        params.push(filter.limit);
      }

      if (filter.offset) {
        sql += ' OFFSET ?';
        params.push(filter.offset);
      }

      const result = this.db.exec(sql, params);
      
      if (result.length === 0) {
        return [];
      }
      
      const columns = result[0].columns;
      const values = result[0].values;
      
      const orders = values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
      
      return orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrderById(id) {
    try {
      const sql = 'SELECT * FROM orders WHERE id = ?';
      const stmt = this.db.prepare(sql);
      stmt.bind([id]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      
      stmt.free();
      return null;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  async updateOrderStatus(id, status) {
    try {
      const sql = `
        UPDATE orders 
        SET status = ?, 
            delivery_time = CASE WHEN ? = 'delivered' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now') 
        WHERE id = ?
      `;
      this.db.run(sql, [status, status, id]);
      this.saveDatabase();
      return 1;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async updateOrderPaymentStatus(id, status) {
    try {
      const sql = `
        UPDATE orders 
        SET payment_status = ?, updated_at = datetime('now') 
        WHERE id = ?
      `;
      this.db.run(sql, [status, id]);
      this.saveDatabase();
      return 1;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async updatePaymentStatus(id, paymentStatus) {
    try {
      const sql = `
        UPDATE orders 
        SET payment_status = ?, updated_at = datetime('now') 
        WHERE id = ?
      `;
      this.db.run(sql, [paymentStatus, id]);
      this.saveDatabase();
      return 1;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async getTodaysOrders() {
    const today = new Date().toISOString().split('T')[0];
    return this.getOrders({ date: today });
  }

  async getThisWeeksOrders() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (6 - today.getDay()));

    return this.getOrders({
      dateRange: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      }
    });
  }

  async getOrderCount(filter = {}) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM orders';
      const params = [];
      const conditions = [];

      if (filter.status) {
        conditions.push('status = ?');
        params.push(filter.status);
      }

      if (filter.paymentStatus) {
        conditions.push('payment_status = ?');
        params.push(filter.paymentStatus);
      }

      if (filter.search) {
        conditions.push('(customer_name LIKE ? OR phone_number LIKE ?)');
        params.push(`%${filter.search}%`);
        params.push(`%${filter.search}%`);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row.count;
      }
      
      stmt.free();
      return 0;
    } catch (error) {
      console.error('Error counting orders:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      console.log('Clearing all data from database...');
      this.db.run('DELETE FROM orders');
      this.db.run("DELETE FROM sqlite_sequence WHERE name='orders'");
      console.log('All data cleared successfully');
      this.saveDatabase();
      return { success: true, message: 'All data cleared successfully' };
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  close() {
    if (this.db) {
      try {
        this.saveDatabase();
        this.db.close();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
}

module.exports = new OrderDatabase();
