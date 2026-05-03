import Database from 'better-sqlite3';
import path from 'path';

// Connect to SQLite database
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_orders (
      id TEXT PRIMARY KEY,
      order_date DATE NOT NULL,
      status TEXT CHECK( status IN ('open', 'ordered', 'delivered', 'closed') ) NOT NULL DEFAULT 'open',
      created_by TEXT NOT NULL,
      restaurant_id TEXT,
      closes_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      daily_order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      restaurant_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(daily_order_id) REFERENCES daily_orders(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
    );

    CREATE TABLE IF NOT EXISTS restaurant_meals (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec(`ALTER TABLE daily_orders ADD COLUMN closes_at DATETIME;`);
    console.log('Added closes_at column to daily_orders.');
  } catch (err: any) {
    // Column might already exist
  }

  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_orders'").get() as any;
    if (tableInfo?.sql?.includes('UNIQUE')) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE daily_orders_new (
          id TEXT PRIMARY KEY,
          order_date DATE NOT NULL,
          status TEXT CHECK(status IN ('open','ordered','delivered','closed')) NOT NULL DEFAULT 'open',
          created_by TEXT NOT NULL,
          closes_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(created_by) REFERENCES users(id)
        );
        INSERT INTO daily_orders_new SELECT * FROM daily_orders;
        DROP TABLE daily_orders;
        ALTER TABLE daily_orders_new RENAME TO daily_orders;
      `);
      db.pragma('foreign_keys = ON');
      console.log('Removed UNIQUE constraint from daily_orders.order_date');
    }
  } catch (err: any) {
    db.pragma('foreign_keys = ON');
    console.log('daily_orders migration skipped:', err.message);
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT;`);
    console.log('Added phone column to users.');
  } catch (err: any) {
    // Column might already exist
  }

  try {
    db.exec(`ALTER TABLE daily_orders ADD COLUMN restaurant_id TEXT REFERENCES restaurants(id);`);
    console.log('Added restaurant_id column to daily_orders.');
  } catch (err: any) {
    // Column might already exist
  }

  console.log('Database initialized successfully.');
};

export default db;
