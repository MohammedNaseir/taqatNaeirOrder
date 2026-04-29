import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Store, Calendar, Plus } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

function AdminOrders() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [timerMinutes, setTimerMinutes] = useState('30');

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const allRes = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      const allOrdersData = await allRes.json();
      setAllOrders(allOrdersData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleCreateOrder = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: newOrderDate })
    });
    if (res.ok) {
      setShowCreateForm(false);
      fetchOrders();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'حدث خطأ أثناء إنشاء الطلبية');
    }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  const handleSetTimer = async (id: string) => {
    const mins = parseInt(timerMinutes);
    if (isNaN(mins) || mins <= 0) return;
    const closesAt = new Date(Date.now() + mins * 60000).toISOString();
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${id}/timer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ closes_at: closesAt })
    });
    setEditingTimerId(null);
    fetchOrders();
  };

  const handleClearTimer = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/orders/${id}/timer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ closes_at: null })
    });
    fetchOrders();
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            إدارة الطلبيات
          </h3>
          
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus size={16} /> 
            إنشاء طلبية جديدة
          </button>
        </div>

        {showCreateForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 border border-blue-200 bg-blue-50/50 rounded-xl overflow-hidden">
            <h4 className="font-bold text-gray-800 mb-3 text-sm">تاريخ الطلبية الجديدة</h4>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <input 
                  type="date" 
                  value={newOrderDate}
                  onChange={e => setNewOrderDate(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                />
              </div>
              <button 
                onClick={handleCreateOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              >
                تأكيد الإنشاء
              </button>
            </div>
          </motion.div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 min-w-[120px]">التاريخ</th>
                <th className="px-4 py-3 min-w-[140px]">المرحلة الحالية</th>
                <th className="px-4 py-3 min-w-[200px]">المؤقت</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    لا توجد طلبيات مسجلة
                  </td>
                </tr>
              ) : (
                allOrders.map(o => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50 align-top">
                    <td className="px-4 py-4 font-bold text-gray-900">{o.order_date}</td>
                    <td className="px-4 py-4">
                      <select 
                        value={o.status}
                        onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                        className={cn(
                          "border rounded-lg px-2 py-1.5 text-sm outline-none transition-colors font-medium cursor-pointer",
                          o.status === 'open' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          o.status === 'ordered' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          o.status === 'delivered' ? 'bg-green-50 border-green-200 text-green-700' :
                          'bg-gray-50 border-gray-200 text-gray-700'
                        )}
                      >
                        <option value="open">مفتوح (استقبال طلبات)</option>
                        <option value="ordered">تم الطلب من المطعم</option>
                        <option value="delivered">تم التوصيل للشركة</option>
                        <option value="closed">مغلق</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {editingTimerId === o.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input 
                            type="number"
                            value={timerMinutes}
                            onChange={e => setTimerMinutes(e.target.value)}
                            className="w-16 px-2 py-1 text-sm border rounded outline-none focus:border-blue-500"
                            min="1"
                          />
                          <span className="text-xs text-gray-500">دقيقة</span>
                          <button onClick={() => handleSetTimer(o.id)} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-3 py-1 rounded text-xs font-medium">حفظ</button>
                          <button onClick={() => setEditingTimerId(null)} className="bg-gray-200 hover:bg-gray-300 transition-colors text-gray-700 px-3 py-1 rounded text-xs font-medium">إلغاء</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {o.closes_at ? (
                            <>
                              <span className="text-blue-700 font-mono text-sm font-medium bg-blue-50 w-fit px-2 py-0.5 rounded border border-blue-100">
                                {new Date(o.closes_at).toLocaleTimeString('ar-EG')}
                              </span>
                              <div className="flex gap-3 mt-1">
                                <button onClick={() => setEditingTimerId(o.id)} className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium">تعديل</button>
                                <button onClick={() => handleClearTimer(o.id)} className="text-xs text-red-600 hover:text-red-800 transition-colors font-medium">إلغاء المؤقت</button>
                              </div>
                            </>
                          ) : (
                            <button onClick={() => setEditingTimerId(o.id)} className="text-xs text-gray-500 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded hover:text-blue-600 hover:border-blue-200 transition-colors shrink-0 w-fit font-medium">
                              + إضافة مؤقت إغلاق
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
