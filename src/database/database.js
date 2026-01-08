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
      // Create users table
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone_number TEXT NOT NULL UNIQUE,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create orders table with user_id foreign key
      const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
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
          delivered_at DATETIME,
          deleted INTEGER DEFAULT 0,
          deleted_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `;

      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)',
        'CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)',
        'CREATE INDEX IF NOT EXISTS idx_order_user_id ON orders(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date)',
        'CREATE INDEX IF NOT EXISTS idx_customer_name ON orders(customer_name)',
        'CREATE INDEX IF NOT EXISTS idx_phone_number ON orders(phone_number)',
        'CREATE INDEX IF NOT EXISTS idx_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_payment_status ON orders(payment_status)'
      ];

      this.db.run(createUsersTable);
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
    try {
      // Check if users table exists
      const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      const usersTableExists = tablesResult.length > 0 && tablesResult[0].values.length > 0;

      if (!usersTableExists) {
        console.log('Creating users table...');
        const createUsersTable = `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone_number TEXT NOT NULL UNIQUE,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `;
        this.db.run(createUsersTable);
        this.db.run('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)');
      }

      // Check and migrate orders table
      const tableInfo = this.db.exec('PRAGMA table_info(orders)');
      const columns = tableInfo.length > 0
        ? tableInfo[0].values.map(column => column[1])
        : [];

      const addColumn = (name, definition) => {
        console.log(`Adding column ${name} to orders table`);
        this.db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
      };

      if (!columns.includes('user_id')) {
        addColumn('user_id', 'INTEGER');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_order_user_id ON orders(user_id)');
      }

      if (!columns.includes('delivered_at')) {
        addColumn('delivered_at', 'DATETIME');
        this.db.run(`UPDATE orders SET delivered_at = datetime('now') WHERE status = 'delivered'`);
      } else {
        this.db.run(`UPDATE orders SET delivered_at = datetime('now') WHERE status = 'delivered' AND (delivered_at IS NULL OR delivered_at = '')`);
      }

      if (columns.includes('delivery_time')) {
        this.db.run(`UPDATE orders SET delivered_at = COALESCE(delivered_at, delivery_time) WHERE delivery_time IS NOT NULL`);
      }

      if (!columns.includes('deleted')) {
        addColumn('deleted', 'INTEGER DEFAULT 0');
        this.db.run('UPDATE orders SET deleted = 0');
      }

      if (!columns.includes('deleted_at')) {
        addColumn('deleted_at', 'DATETIME');
      }

      this.saveDatabase();
    } catch (error) {
      console.error('Error migrating database schema:', error);
      throw error;
    }
  }

  saveDatabase() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, data);
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // ============ USER MANAGEMENT METHODS ============

  async addUser(userData) {
    try {
      const { name, phoneNumber, address = '' } = userData;

      const sql = `
        INSERT INTO users (name, phone_number, address)
        VALUES (?, ?, ?)
      `;

      this.db.run(sql, [name, phoneNumber, address]);
      
      const result = this.db.exec("SELECT last_insert_rowid() as id");
      const lastId = result[0].values[0][0];
      
      this.saveDatabase();
      return lastId;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async getUserByPhone(phoneNumber) {
    try {
      const sql = 'SELECT * FROM users WHERE phone_number = ?';
      const result = this.db.exec(sql, [phoneNumber]);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return null;
      }
      
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const user = {};
      columns.forEach((col, index) => {
        user[col] = row[index];
      });
      
      return user;
    } catch (error) {
      console.error('Error fetching user by phone:', error);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const result = this.db.exec(sql, [id]);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return null;
      }
      
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const user = {};
      columns.forEach((col, index) => {
        user[col] = row[index];
      });
      
      return user;
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }
  }

  async searchUsers(searchTerm) {
    try {
      const sql = `
        SELECT * FROM users 
        WHERE name LIKE ? OR phone_number LIKE ?
        ORDER BY name ASC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const result = this.db.exec(sql, [searchPattern, searchPattern]);
      
      if (result.length === 0) {
        return [];
      }
      
      const columns = result[0].columns;
      const values = result[0].values;
      
      const users = values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async updateUser(id, userData) {
    try {
      const { name, phoneNumber, address } = userData;
      
      const sql = `
        UPDATE users 
        SET name = ?, phone_number = ?, address = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(sql, [name, phoneNumber, address, id]);
      this.saveDatabase();
      
      return await this.getUserById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async findOrCreateUser(userData) {
    try {
      const { name, phoneNumber, address = '' } = userData;
      
      // Try to find existing user by phone number
      let user = await this.getUserByPhone(phoneNumber);
      
      if (user) {
        // Update user info if it has changed
        if (user.name !== name || user.address !== address) {
          user = await this.updateUser(user.id, { name, phoneNumber, address });
        }
        return user;
      }
      
      // Create new user if not found
      const userId = await this.addUser({ name, phoneNumber, address });
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw error;
    }
  }

  // ============ ORDER MANAGEMENT METHODS ============

  async addOrder(orderData) {
    try {
      const {
        userId,
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

      let finalUserId = userId;

      // If no userId provided but we have customer details, find or create user
      if (!userId && customerName && phoneNumber) {
        const user = await this.findOrCreateUser({
          name: customerName,
          phoneNumber: phoneNumber,
          address: address
        });
        finalUserId = user.id;
      }

      const sql = `
        INSERT INTO orders (
          user_id, customer_name, phone_number, order_date, order_time,
          weight, address, image_path, order_notes, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        finalUserId, customerName, phoneNumber, orderDate, orderTime,
        weight, address, imagePath, orderNotes, paymentStatus
      ]);
      
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

      const includeDeleted = filter.includeDeleted === true;

      if (Object.prototype.hasOwnProperty.call(filter, 'deleted')) {
        conditions.push('deleted = ?');
        params.push(filter.deleted ? 1 : 0);
      } else if (!includeDeleted) {
        conditions.push('deleted = 0');
      }

      if (filter.userId) {
        conditions.push('user_id = ?');
        params.push(filter.userId);
      }

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

  async getOrdersByUserId(userId) {
    return this.getOrders({ userId });
  }

  async updateOrderStatus(id, status) {
    try {
      const sql = `
        UPDATE orders 
        SET status = ?, 
            delivered_at = CASE WHEN ? = 'delivered' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now') 
        WHERE id = ? AND deleted = 0
      `;
      this.db.run(sql, [status, status, id]);
      this.saveDatabase();
      return await this.getOrderById(id);
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

      const includeDeleted = filter.includeDeleted === true;

      if (Object.prototype.hasOwnProperty.call(filter, 'deleted')) {
        conditions.push('deleted = ?');
        params.push(filter.deleted ? 1 : 0);
      } else if (!includeDeleted) {
        conditions.push('deleted = 0');
      }

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
      this.db.run('DELETE FROM users');
      this.db.run("DELETE FROM sqlite_sequence WHERE name='orders'");
      this.db.run("DELETE FROM sqlite_sequence WHERE name='users'");
      console.log('All data cleared successfully');
      this.saveDatabase();
      return { success: true, message: 'All data cleared successfully' };
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async deleteOrder(id) {
    try {
      const sql = `
        UPDATE orders
        SET deleted = 1,
            deleted_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `;
      this.db.run(sql, [id]);
      this.saveDatabase();
      return await this.getOrderById(id);
    } catch (error) {
      console.error('Error deleting order:', error);
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