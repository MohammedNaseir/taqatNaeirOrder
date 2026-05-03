import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db, { initDb } from './src/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { sendWhatsAppMessage } from './src/whatsappService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_office_food_order_key_123';

initDb();

// Seed initial admin if no users exist
const adminCheck = db.prepare('SELECT count(*) as count FROM users');
const { count } = adminCheck.get() as { count: number };
if (count === 0) {
  const hash = bcrypt.hashSync('password', 10);
  db.prepare('INSERT INTO users (id, username, password, full_name, is_admin) VALUES (?, ?, ?, ?, ?)').run(
    randomUUID(), 'admin', hash, 'مدير النظام', 1
  );
  console.log('Admin user seeded. username: admin, password: password');
}

const app = express();
app.use(express.json());

// Auth Middleware
const authenticate = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden. Admin only.' });
  }
  next();
};

// API ROUTES
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin === 1 }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, is_admin: user.is_admin === 1 } });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const user = db.prepare('SELECT id, username, full_name, is_admin FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { ...user, is_admin: user.is_admin === 1 } });
});

app.put('/api/users/me', authenticate, (req: any, res) => {
  const { currentPassword, newPassword, newUsername, newFullName } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  let finalUsername = user.username;
  if (newUsername && newUsername !== user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(newUsername);
    if (existing) return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
    finalUsername = newUsername;
  }

  const finalFullName = newFullName || user.full_name;
  let finalPassword = user.password;
  if (newPassword) {
    finalPassword = bcrypt.hashSync(newPassword, 10);
  }

  db.prepare('UPDATE users SET username = ?, full_name = ?, password = ? WHERE id = ?')
    .run(finalUsername, finalFullName, finalPassword, req.user.id);

  const token = jwt.sign({ id: user.id, username: finalUsername, is_admin: user.is_admin === 1 }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, username: finalUsername, full_name: finalFullName, is_admin: user.is_admin === 1 } });
});

app.get('/api/users', authenticate, (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, is_admin, phone, created_at FROM users').all();
  res.json(users.map((u: any) => ({ ...u, is_admin: u.is_admin === 1 })));
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, full_name, is_admin, phone } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, username, password, full_name, is_admin, phone) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, username, hash, full_name, is_admin ? 1 : 0, phone || null
    );
    res.json({ id, username, full_name, is_admin, phone: phone || null });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticate, requireAdmin, (req: any, res) => {
  const { full_name, username, is_admin, newPassword, phone } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً' });
  }

  const finalUsername = username || user.username;
  const finalFullName = full_name || user.full_name;
  const finalIsAdmin = is_admin !== undefined ? (is_admin ? 1 : 0) : user.is_admin;
  const finalPhone = phone !== undefined ? (phone || null) : user.phone;
  let finalPassword = user.password;
  if (newPassword) finalPassword = bcrypt.hashSync(newPassword, 10);

  db.prepare('UPDATE users SET username = ?, full_name = ?, is_admin = ?, password = ?, phone = ? WHERE id = ?')
    .run(finalUsername, finalFullName, finalIsAdmin, finalPassword, finalPhone, req.params.id);

  res.json({ success: true, id: req.params.id, username: finalUsername, full_name: finalFullName, is_admin: finalIsAdmin === 1, phone: finalPhone });
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req: any, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/restaurants', authenticate, (req, res) => {
  const restaurants = db.prepare('SELECT * FROM restaurants ORDER BY name').all();
  res.json(restaurants);
});

app.post('/api/restaurants', authenticate, requireAdmin, (req: any, res) => {
  const { name } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO restaurants (id, name, created_by) VALUES (?, ?, ?)').run(id, name, req.user.id);
  res.json({ id, name, created_by: req.user.id });
});

app.delete('/api/restaurants/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/restaurants/:id/meals', authenticate, (req, res) => {
  const meals = db.prepare('SELECT * FROM restaurant_meals WHERE restaurant_id = ? ORDER BY name').all(req.params.id);
  res.json(meals);
});

app.post('/api/restaurants/:id/meals', authenticate, requireAdmin, (req: any, res) => {
  const { name, price } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO restaurant_meals (id, restaurant_id, name, price) VALUES (?, ?, ?, ?)').run(id, req.params.id, name, price);
  res.json({ id, restaurant_id: req.params.id, name, price });
});

app.delete('/api/restaurants/meals/:meal_id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM restaurant_meals WHERE id = ?').run(req.params.meal_id);
  res.json({ success: true });
});

app.get('/api/orders', authenticate, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, r.name as restaurant_name
    FROM daily_orders o
    LEFT JOIN restaurants r ON o.restaurant_id = r.id
    ORDER BY o.order_date DESC
  `).all();
  res.json(orders);
});

app.get('/api/orders/today', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const order = db.prepare(`
    SELECT o.*, r.name as restaurant_name
    FROM daily_orders o
    LEFT JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.order_date = ?
  `).get(today);
  res.json(order || null);
});

app.get('/api/orders/:id', authenticate, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, r.name as restaurant_name
    FROM daily_orders o
    LEFT JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.id = ?
  `).get(req.params.id);
  res.json(order || null);
});

app.post('/api/orders', authenticate, requireAdmin, (req: any, res) => {
  const { date, restaurant_id } = req.body || {};
  if (!restaurant_id) return res.status(400).json({ error: 'يجب اختيار مطعم للطلبية' });
  const orderDate = date || new Date().toISOString().split('T')[0];

  const id = randomUUID();
  db.prepare('INSERT INTO daily_orders (id, order_date, status, created_by, restaurant_id) VALUES (?, ?, ?, ?, ?)').run(
    id, orderDate, 'open', req.user.id, restaurant_id
  );
  res.json({ id, order_date: orderDate, status: 'open', restaurant_id });
});

app.put('/api/orders/:id/status', authenticate, requireAdmin, (req: any, res) => {
  const { status } = req.body;
  db.prepare('UPDATE daily_orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

app.put('/api/orders/:id/timer', authenticate, requireAdmin, (req: any, res) => {
  const { closes_at } = req.body; // ISO string or null
  db.prepare('UPDATE daily_orders SET closes_at = ? WHERE id = ?').run(closes_at || null, req.params.id);
  res.json({ success: true });
});

app.get('/api/orders/:id/items', authenticate, (req, res) => {
  const items = db.prepare(`
    SELECT oi.*, u.full_name as user_name, r.name as restaurant_name 
    FROM order_items oi 
    JOIN users u ON oi.user_id = u.id 
    JOIN restaurants r ON oi.restaurant_id = r.id 
    WHERE oi.daily_order_id = ?
  `).all(req.params.id);
  res.json(items);
});

app.post('/api/orders/:id/items', authenticate, (req: any, res) => {
  const { restaurant_id, item_name, price, notes } = req.body;
  const order = db.prepare('SELECT status FROM daily_orders WHERE id = ?').get(req.params.id) as any;

  if (!order || order.status !== 'open') {
    return res.status(400).json({ error: 'Only open orders can receive new items' });
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO order_items (id, daily_order_id, user_id, restaurant_id, item_name, price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.user.id, restaurant_id, item_name, price, notes || null);

  res.json({ id, daily_order_id: req.params.id, user_id: req.user.id, restaurant_id, item_name, price, notes });
});

app.delete('/api/orders/items/:id', authenticate, (req: any, res) => {
  const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(req.params.id) as any;
  if (!item) return res.status(404).json({ error: 'Not found' });
  
  if (!req.user.is_admin && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own items' });
  }

  const order = db.prepare('SELECT status FROM daily_orders WHERE id = ?').get(item.daily_order_id) as any;
  if (!order || order.status !== 'open') {
    return res.status(400).json({ error: 'Order is not open anymore' });
  }

  db.prepare('DELETE FROM order_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/whatsapp/send', authenticate, requireAdmin, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message are required' });
  const result = await sendWhatsAppMessage(phone, message);
  if (result.success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: result.error });
  }
});

app.post('/api/whatsapp/send-bulk', authenticate, requireAdmin, async (req, res) => {
  const { phones, message } = req.body;
  if (!phones?.length || !message) return res.status(400).json({ error: 'phones and message are required' });

  const results = await Promise.allSettled(
    (phones as string[]).map((phone: string) => sendWhatsAppMessage(phone, message))
  );
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  res.json({ success: true, sent, failed: results.length - sent, total: results.length });
});

app.post('/api/whatsapp/broadcast', authenticate, requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const usersWithPhone = db.prepare("SELECT id, full_name, phone FROM users WHERE phone IS NOT NULL AND phone != ''").all() as any[];
  if (usersWithPhone.length === 0) return res.json({ success: true, sent: 0, failed: 0 });

  const results = await Promise.allSettled(
    usersWithPhone.map(u => sendWhatsAppMessage(u.phone, message))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
  const failed = results.length - sent;
  res.json({ success: true, sent, failed, total: results.length });
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
