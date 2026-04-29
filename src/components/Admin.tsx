import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Store, Calendar, Plus } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

function AdminOrders() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [timerMinutes, setTimerMinutes] = useState('30');

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders/today', { headers: { Authorization: `Bearer ${token}` } });
      setOrder(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, []);

  const handleCreateOrder = async () => {
    const token = localStorage.getItem('token');
    await fetch('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchOrder();
  };

  const handleChangeStatus = async (status: string) => {
    if (!order) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    fetchOrder();
  };

  const handleSetTimer = async () => {
    if (!order) return;
    const mins = parseInt(timerMinutes);
    if (isNaN(mins) || mins <= 0) return;
    const closesAt = new Date(Date.now() + mins * 60000).toISOString();
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${order.id}/timer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ closes_at: closesAt })
    });
    fetchOrder();
  };

  const handleClearTimer = async () => {
    if (!order) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${order.id}/timer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ closes_at: null })
    });
    fetchOrder();
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        إدارة طلبية اليوم
      </h3>
      
      {!order ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">لم يتم إنشاء طلبية لليوم بعد.</p>
          <button 
            onClick={handleCreateOrder}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            إنشاء طلبية جديدة
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">التاريخ</div>
              <div className="font-bold">{order.order_date}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">المرحلة الحالية</div>
              <div className="font-bold capitalize">{order.status}</div>
            </div>
          </div>

          <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg space-y-3">
            <h4 className="text-sm font-bold text-gray-800">مؤقت إغلاق الطلب:</h4>
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="number" 
                value={timerMinutes}
                onChange={e => setTimerMinutes(e.target.value)}
                min="1"
                className="w-24 px-3 py-1.5 border rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-sm text-gray-600">دقيقة</span>
              <button 
                onClick={handleSetTimer}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                تفعيل المؤقت
              </button>
              {order.closes_at && (
                <button 
                  onClick={handleClearTimer}
                  className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm hover:bg-red-200 transition-colors"
                >
                  إلغاء المؤقت
                </button>
              )}
            </div>
            {order.closes_at && (
              <p className="text-sm text-blue-700 mt-2 font-medium">
                ينتهي بعد: {new Date(order.closes_at).toLocaleTimeString('ar-EG')}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-700 mb-3">تغيير المرحلة:</h4>
            <div className="flex flex-wrap gap-2">
              {['open', 'ordered', 'delivered', 'closed'].map(s => (
                <button
                  key={s}
                  onClick={() => handleChangeStatus(s)}
                  disabled={order.status === s}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                    order.status === s 
                      ? "bg-blue-100 text-blue-700 cursor-default"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, password, full_name: fullName, is_admin: isAdmin })
    });
    setUsername(''); setPassword(''); setFullName(''); setIsAdmin(false);
    fetchUsers();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4">إضافة مستخدم جديد</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <input required placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <input required type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded" />
            صلاحيات مسؤول (Admin)
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">إضافة المستخدم</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">الاسم الكامل</th>
              <th className="px-4 py-3">اسم المستخدم</th>
              <th className="px-4 py-3">الدور</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{u.username}</td>
                <td className="px-4 py-3">
                  {u.is_admin ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Admin</span> : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">User</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [mealName, setMealName] = useState('');
  const [mealPrice, setMealPrice] = useState('');

  const fetchRestaurants = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/restaurants', { headers: { Authorization: `Bearer ${token}` } });
    setRestaurants(await res.json());
  };

  const fetchMeals = async (restId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/restaurants/${restId}/meals`, { headers: { Authorization: `Bearer ${token}` } });
    setMeals(await res.json());
  };

  useEffect(() => { fetchRestaurants(); }, []);
  useEffect(() => {
    if (selectedRestaurant) fetchMeals(selectedRestaurant.id);
  }, [selectedRestaurant]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const token = localStorage.getItem('token');
    await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    setName('');
    fetchRestaurants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف المطعم؟ جميع الوجبات والطلبات المرتبطة به ستحذف!')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/restaurants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
    fetchRestaurants();
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName || !mealPrice || !selectedRestaurant) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/restaurants/${selectedRestaurant.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: mealName, price: parseFloat(mealPrice) })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء إضافة الوجبة');
        return;
      }
      
      setMealName(''); setMealPrice('');
      fetchMeals(selectedRestaurant.id);
    } catch (err) {
      alert('تعذر الاتصال بالخادم.');
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('حذف الوجبة؟')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/restaurants/meals/${mealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (selectedRestaurant) fetchMeals(selectedRestaurant.id);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4">إضافة مطعم</h3>
          <form onSubmit={handleCreate} className="flex gap-4">
            <input required placeholder="اسم المطعم" value={name} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" className="bg-blue-600 px-6 text-white rounded-lg text-sm font-medium">إضافة</button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">المطاعم الحالية</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {restaurants.map(r => (
              <li key={r.id} className={cn("p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors", selectedRestaurant?.id === r.id ? "bg-blue-50/50" : "")} onClick={() => setSelectedRestaurant(r)}>
                <span className="font-medium text-gray-900">{r.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-red-500 hover:text-red-700 text-sm">حذف</button>
              </li>
            ))}
            {restaurants.length === 0 && <li className="p-6 text-center text-gray-500">لا يوجد مطاعم مضافة.</li>}
          </ul>
        </div>
      </div>

      {/* Meals Management */}
      {selectedRestaurant && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 ring-1 ring-blue-50">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              <span>إضافة وجبة لـ {selectedRestaurant.name}</span>
            </h3>
            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <input required placeholder="اسم الوجبة" value={mealName} onChange={e => setMealName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <input required type="number" step="0.01" placeholder="السعر" value={mealPrice} onChange={e => setMealPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button type="submit" className="w-full bg-blue-600 px-6 py-2 text-white rounded-lg text-sm font-medium">إضافة وجبة</button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800">قائمة وجبات {selectedRestaurant.name}</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {meals.map(m => (
                <li key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900 block">{m.name}</span>
                    <span className="text-gray-500 text-sm">{m.price.toFixed(2)} د.أ</span>
                  </div>
                  <button onClick={() => handleDeleteMeal(m.id)} className="text-red-500 hover:text-red-700 text-sm">حذف</button>
                </li>
              ))}
              {meals.length === 0 && <li className="p-6 text-center text-gray-500">لا يوجد وجبات لهذا المطعم.</li>}
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Admin() {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop() || 'orders';

  const tabs = [
    { id: 'orders', name: 'الطلب اليومي', icon: Calendar, path: '/admin' },
    { id: 'users', name: 'المستخدمين', icon: Users, path: '/admin/users' },
    { id: 'restaurants', name: 'المطاعم والوجبات', icon: Store, path: '/admin/restaurants' },
  ];

  return (
    <div className="space-y-6 pb-20 relative">
      <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم الإدارة</h1>
      
      <div className="flex overflow-x-auto sticky top-[60px] z-20 bg-gray-50/95 backdrop-blur shadow-sm -mx-4 px-4 md:mx-0 md:px-0 rounded-b-xl border-x border-b border-gray-200">
        {tabs.map(tab => {
          const isActive = tab.path === location.pathname || (tab.id === 'orders' && location.pathname === '/admin');
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors flex-1 text-center justify-center",
                isActive ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/60"
              )}
            >
              <tab.icon size={18} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AdminOrders />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/restaurants" element={<AdminRestaurants />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}
