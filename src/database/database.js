// database.js

const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

class OrderDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.SQL = null;
  }

  // =========================================================
  // INIT
  // =========================================================

  async initialize() {
    this.SQL = await initSqlJs();

    const userDataPath = app.getPath("userData");
    this.dbPath = path.join(userDataPath, "orders.db");

    let dbData = null;
    if (fs.existsSync(this.dbPath)) {
      dbData = fs.readFileSync(this.dbPath);
    }

    this.db = new this.SQL.Database(dbData);

    if (!dbData) this.createTables();
    else this.migrateDatabaseSchema();

    return true;
  }

  saveDatabase() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  // =========================================================
  // TABLES
  // =========================================================

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        contact TEXT NOT NULL,
        alternate_contact TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        order_time TIME NOT NULL,
        weight TEXT,
        image_path TEXT,
        order_notes TEXT,
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        delivered_at DATETIME,
        deleted INTEGER DEFAULT 0,
        deleted_at DATETIME,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      )
    `);

    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_order_date ON orders(order_date)`,
    );
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_status ON orders(status)`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_payment_status ON orders(payment_status)`,
    );

    this.saveDatabase();
  }

  migrateDatabaseSchema() {
    // kept minimal
    this.saveDatabase();
  }

  // =========================================================
  // ORDERS
  // =========================================================

  async addOrder(orderData) {
    const {
      customerId,
      customer,
      orderDate,
      orderTime,
      weight = "",
      imagePath,
      orderNotes = "",
      paymentStatus = "pending",
    } = orderData;

    try {
      this.db.run("BEGIN");

      let finalCustomerId = customerId;

      if (!finalCustomerId) {
        this.db.run(
          `
          INSERT INTO customers (name, address, contact, alternate_contact)
          VALUES (?, ?, ?, ?)
        `,
          [
            customer.name,
            customer.address || "",
            customer.contact,
            customer.alternateContact || "",
          ],
        );

        finalCustomerId = this.db.exec(`SELECT last_insert_rowid()`)[0]
          .values[0][0];
      }

      this.db.run(
        `
        INSERT INTO orders
        (customer_id, order_date, order_time, weight, image_path, order_notes, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          finalCustomerId,
          orderDate,
          orderTime,
          weight,
          imagePath,
          orderNotes,
          paymentStatus,
        ],
      );

      const orderId = this.db.exec(`SELECT last_insert_rowid()`)[0]
        .values[0][0];

      this.db.run("COMMIT");
      this.saveDatabase();

      return orderId;
    } catch (e) {
      this.db.run("ROLLBACK");
      throw e;
    }
  }

  // =========================================================
  // GET ORDERS (SEARCH + PAGINATION SAFE)
  // =========================================================

  async getOrders(filter = {}) {
    try {
      const params = [];
      const conditions = [];

      let sql = `
        SELECT
          orders.*,
          customers.name AS customer_name,
          customers.contact,
          customers.address,
          customers.alternate_contact
        FROM orders
        JOIN customers ON customers.id = orders.customer_id
      `;

      // filters
      if (!filter.includeDeleted) {
        conditions.push("orders.deleted = 0");
      }

      if (filter.status) {
        conditions.push("orders.status = ?");
        params.push(filter.status);
      }

      if (filter.paymentStatus) {
        conditions.push("orders.payment_status = ?");
        params.push(filter.paymentStatus);
      }

      if (filter.search) {
        conditions.push("(customers.name LIKE ? OR customers.contact LIKE ?)");
        params.push(`%${filter.search}%`, `%${filter.search}%`);
      }

      if (conditions.length) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      // sorting
      const sortMap = {
        "date-desc": "orders.order_date DESC, orders.order_time DESC",
        "date-asc": "orders.order_date ASC, orders.order_time ASC",
        "name-asc": "customers.name ASC",
        "name-desc": "customers.name DESC",
      };

      sql += ` ORDER BY ${sortMap[filter.sort] || sortMap["date-desc"]}`;

      // count
      const countSql = `
        SELECT COUNT(*)
        FROM orders
        JOIN customers ON customers.id = orders.customer_id
        ${conditions.length ? " WHERE " + conditions.join(" AND ") : ""}
      `;

      const total = this.db.exec(countSql, params)[0]?.values[0][0] || 0;

      // pagination
      if (filter.limit) {
        sql += " LIMIT ?";
        params.push(filter.limit);
      }

      if (filter.offset) {
        sql += " OFFSET ?";
        params.push(filter.offset);
      }

      const result = this.db.exec(sql, params);

      if (!result.length) {
        return { success: true, orders: [], total };
      }

      const cols = result[0].columns;

      const orders = result[0].values.map((row) => {
        const obj = {};
        cols.forEach((c, i) => (obj[c] = row[i]));
        return obj;
      });

      return { success: true, orders, total };
    } catch (e) {
      return { success: false, orders: [], total: 0, error: e.message };
    }
  }

  // =========================================================
  // ORDER BY ID
  // =========================================================

  async getOrderById(id) {
    const result = await this.getOrders({
      includeDeleted: true,
      limit: 1,
      offset: 0,
    });

    return result.orders.find((o) => o.id === id) || null;
  }

  // =========================================================
  // CUSTOMER SEARCH
  // =========================================================

  async searchCustomers(search) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM customers
      WHERE name LIKE ? OR contact LIKE ?
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    stmt.bind([`%${search}%`, `%${search}%`]);

    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());

    stmt.free();

    return rows;
  }

  // =========================================================
  // SIDEBAR STATS
  // =========================================================
  async getStats() {
    try {
      const queries = {
        total: `
        SELECT COUNT(*) FROM orders
        WHERE deleted = 0
      `,
        today: `
        SELECT COUNT(*) FROM orders
        WHERE deleted = 0
        AND order_date = date('now')
      `,
        week: `
        SELECT COUNT(*) FROM orders
        WHERE deleted = 0
        AND order_date BETWEEN date('now','-6 day') AND date('now')
      `,
        pending: `
        SELECT COUNT(*) FROM orders
        WHERE deleted = 0
        AND status = 'pending'
      `,
      };

      const get = (sql) => this.db.exec(sql)[0]?.values[0][0] || 0;

      return {
        success: true,
        stats: {
          total: get(queries.total),
          today: get(queries.today),
          week: get(queries.week),
          pending: get(queries.pending),
        },
      };
    } catch (e) {
      return { success: false, stats: {} };
    }
  }

  async updateCustomer(customer) {
    const sql = `
    UPDATE customers
    SET name = ?, contact = ?, alternate_contact = ?, address = ?, updated_at = datetime('now')
    WHERE id = ?
  `;

    this.db.run(sql, [
      customer.name,
      customer.contact,
      customer.alternate_contact || "",
      customer.address || "",
      customer.id,
    ]);

    this.saveDatabase();
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

      // ✅ return updated order (same as status)
      return await this.getOrderById(id);
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  }

  async updateOrderStatus(id, status) {
    try {
      const sql = `
      UPDATE orders 
      SET status = ?, updated_at = datetime('now'), delivered_at = datetime('now')
      WHERE id = ?
    `;

      this.db.run(sql, [status, id]);
      this.saveDatabase();

      // ✅ return updated order (same as status)
      return await this.getOrderById(id);
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  }

  close() {
    this.saveDatabase();
    this.db.close();
  }
}

module.exports = new OrderDatabase();
