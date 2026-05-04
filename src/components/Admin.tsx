import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Store, Calendar, Plus, MessageCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

function AdminOrders() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRestaurantId, setNewRestaurantId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // whatsapp recipient: 'none' | 'custom' | 'users' | 'all'
  const [whatsTarget, setWhatsTarget] = useState<'none' | 'custom' | 'users' | 'all'>('none');
  const [whatsPhone, setWhatsPhone] = useState('');
  const [whatsSelectedUsers, setWhatsSelectedUsers] = useState<string[]>([]);
  const [whatsMessage, setWhatsMessage] = useState('');
  const [whatsStatus, setWhatsStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [whatsResult, setWhatsResult] = useState('');

  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [timerMinutes, setTimerMinutes] = useState('30');

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const allRes = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setAllOrders(await allRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const token = localStorage.getItem('token');
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setUsers);
    fetch('/api/restaurants', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setRestaurants);
  }, []);

  const defaultMessage = (date: string) => {
    const restaurantName = restaurants.find(r => r.id === newRestaurantId)?.name || '';
    const appUrl = window.location.origin;
    return `🍕 تم فتح طلبية جديدة!\n\n📅 التاريخ: ${date}\n🍽️ المطعم: ${restaurantName || 'سيتم التحديد'}\n⏰ حالة الطلبية: مفتوحة لاستقبال الطلبات\n\n📝 لتسجيل طلبك، ادخل على الرابط التالي:\n🌐 ${appUrl}/\n\n⚠️ يرجى تسجيل طلبك قبل إغلاق الطلبية.`;
  };

  const handleShowCreate = () => {
    setShowCreateForm(v => !v);
    setNewRestaurantId('');
    setWhatsTarget('none');
    setWhatsPhone('');
    setWhatsSelectedUsers([]);
    setWhatsMessage(defaultMessage(newOrderDate));
    setWhatsStatus('idle');
    setWhatsResult('');
  };

  const toggleUserSelect = (userId: string) => {
    setWhatsSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateOrder = async () => {
    if (!newRestaurantId) { alert('يجب اختيار مطعم للطلبية'); return; }
    const token = localStorage.getItem('token');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: newOrderDate, restaurant_id: newRestaurantId })
    });
    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || 'حدث خطأ أثناء إنشاء الطلبية');
      return;
    }
    setShowCreateForm(false);
    fetchOrders();

    if (whatsTarget === 'none' || !whatsMessage.trim()) return;

    setWhatsStatus('sending');
    try {
      if (whatsTarget === 'all') {
        const waRes = await fetch('/api/whatsapp/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: whatsMessage.trim() })
        });
        const data = await waRes.json();
        setWhatsResult(`تم الإرسال لـ ${data.sent} من أصل ${data.total} مستخدم`);
        setWhatsStatus('sent');
      } else if (whatsTarget === 'users') {
        const phones = whatsSelectedUsers
          .map(id => users.find(u => u.id === id)?.phone)
          .filter(Boolean) as string[];
        if (!phones.length) { setWhatsStatus('idle'); return; }
        const waRes = await fetch('/api/whatsapp/send-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phones, message: whatsMessage.trim() })
        });
        const data = await waRes.json();
        setWhatsResult(`تم الإرسال لـ ${data.sent} من أصل ${data.total}`);
        setWhatsStatus('sent');
      } else {
        if (!whatsPhone.trim()) { setWhatsStatus('idle'); return; }
        const waRes = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phone: whatsPhone.trim(), message: whatsMessage.trim() })
        });
        setWhatsStatus(waRes.ok ? 'sent' : 'error');
        setWhatsResult(waRes.ok ? 'تم إرسال الرسالة بنجاح' : 'تعذر الإرسال');
      }
    } catch {
      setWhatsStatus('error');
      setWhatsResult('تعذر الاتصال بالخادم');
    }
    setTimeout(() => { setWhatsStatus('idle'); setWhatsResult(''); }, 5000);
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

  if (loading) return <div className="text-gray-400 py-12 text-center">جاري التحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-100">
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
              <Calendar size={20} />
            </div>
            إدارة الطلبيات
          </h3>
          
          <button
            onClick={handleShowCreate}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] text-sm"
          >
            <Plus size={18} />
            إنشاء طلبية جديدة
          </button>
        </div>

        {whatsStatus !== 'idle' && whatsResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold border ${whatsStatus === 'sent' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {whatsStatus === 'sent' ? '✓ ' : '✗ '}{whatsResult}
          </div>
        )}

        {showCreateForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl overflow-hidden mt-4 space-y-4">
            {/* Date + Restaurant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-gray-200 mb-2 text-sm">تاريخ الطلبية *</h4>
                <input
                  type="date"
                  value={newOrderDate}
                  onChange={e => { setNewOrderDate(e.target.value); setWhatsMessage(defaultMessage(e.target.value)); }}
                  className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 block p-2.5 outline-none"
                />
              </div>
              <div>
                <h4 className="font-bold text-gray-200 mb-2 text-sm">المطعم *</h4>
                <select
                  required
                  value={newRestaurantId}
                  onChange={e => setNewRestaurantId(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-3 py-2.5 outline-none"
                >
                  <option value="" className="bg-[#18181b]">-- اختر مطعم --</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id} className="bg-[#18181b]">{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* WhatsApp notification */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-emerald-400" />
                <h4 className="font-bold text-gray-200 text-sm">إشعار واتساب (اختياري)</h4>
              </div>

              {/* Target selector */}
              <div className="grid grid-cols-3 gap-2">
                {([['none', 'بدون إرسال'], ['users', 'مستخدمين محددين'], ['all', 'كل المستخدمين']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setWhatsTarget(val); setWhatsPhone(''); setWhatsSelectedUsers([]); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${whatsTarget === val ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-black/20 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {whatsTarget === 'users' && (
                <div className="space-y-1 max-h-48 overflow-y-auto border border-white/10 rounded-xl p-2 bg-black/20">
                  {users.length === 0 && <p className="text-xs text-gray-500 text-center py-3">لا يوجد مستخدمين</p>}
                  {users.map(u => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${!u.phone ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'} ${whatsSelectedUsers.includes(u.id) ? 'bg-emerald-500/10' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!u.phone}
                        checked={whatsSelectedUsers.includes(u.id)}
                        onChange={() => u.phone && toggleUserSelect(u.id)}
                        className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="flex-1 text-sm text-gray-200 font-medium">{u.full_name}</span>
                      <span className="font-mono text-xs text-gray-500 dir-ltr">{u.phone || 'بدون رقم'}</span>
                    </label>
                  ))}
                </div>
              )}

              {whatsTarget === 'all' && (
                <p className="text-xs text-gray-400 bg-black/20 border border-white/5 px-3 py-2 rounded-lg">
                  سيتم الإرسال لجميع المستخدمين الذين لديهم رقم واتساب مسجّل.
                </p>
              )}

              {whatsTarget !== 'none' && (
                <textarea
                  rows={3}
                  placeholder="نص الرسالة..."
                  value={whatsMessage}
                  onChange={e => setWhatsMessage(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 px-4 py-2.5 outline-none placeholder-gray-500 resize-none"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={handleCreateOrder} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-xl transition-all text-sm">
                تأكيد الإنشاء
              </button>
              <button onClick={() => setShowCreateForm(false)} className="bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm">
                إلغاء
              </button>
            </div>
          </motion.div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/5 mt-6">
          <table className="w-full text-sm text-right">
            <thead className="bg-black/40 border-b border-white/5">
              <tr>
                <th className="px-5 py-4 min-w-[120px] text-gray-400">التاريخ</th>
                <th className="px-5 py-4 min-w-[120px] text-gray-400">المطعم</th>
                <th className="px-5 py-4 min-w-[140px] text-gray-400">المرحلة الحالية</th>
                <th className="px-5 py-4 min-w-[200px] text-gray-400">المؤقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-gray-500">
                    لا توجد طلبيات مسجلة
                  </td>
                </tr>
              ) : (
                allOrders.map(o => (
                  <tr key={o.id} className="hover:bg-white/[0.02] items-center transition-colors align-middle">
                    <td className="px-5 py-5 font-bold text-gray-200">{o.order_date}</td>
                    <td className="px-5 py-5 text-gray-400 text-sm">{o.restaurant_name || <span className="text-gray-600">—</span>}</td>
                    <td className="px-5 py-5">
                      <select 
                        value={o.status}
                        onChange={(e) => handleChangeStatus(o.id, e.target.value)}
                        className={cn(
                          "border rounded-xl px-3 py-2 text-sm outline-none transition-colors font-bold cursor-pointer",
                          o.status === 'open' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          o.status === 'ordered' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          o.status === 'delivered' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                          'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        )}
                      >
                        <option value="open" className="bg-[#18181b]">مفتوح (استقبال طلبات)</option>
                        <option value="ordered" className="bg-[#18181b]">تم الطلب من المطعم</option>
                        <option value="delivered" className="bg-[#18181b]">تم التوصيل للشركة</option>
                        <option value="closed" className="bg-[#18181b]">مغلق</option>
                      </select>
                    </td>
                    <td className="px-5 py-5">
                      {editingTimerId === o.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input 
                            type="number"
                            value={timerMinutes}
                            onChange={e => setTimerMinutes(e.target.value)}
                            className="w-16 px-3 py-1.5 text-sm border border-white/10 bg-black/20 text-white rounded-lg outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                            min="1"
                          />
                          <span className="text-xs text-gray-400">دقيقة</span>
                          <button onClick={() => handleSetTimer(o.id)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">حفظ</button>
                          <button onClick={() => setEditingTimerId(null)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">إلغاء</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {o.closes_at ? (
                            <>
                              <span className="text-amber-400 font-mono text-sm font-bold bg-amber-500/10 w-fit px-3 py-1 rounded-lg border border-amber-500/20">
                                {new Date(o.closes_at).toLocaleTimeString('ar-EG')}
                              </span>
                              <div className="flex gap-3 mt-1">
                                <button onClick={() => setEditingTimerId(o.id)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">تعديل</button>
                                <button onClick={() => handleClearTimer(o.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium">إلغاء المؤقت</button>
                              </div>
                            </>
                          ) : (
                            <button onClick={() => setEditingTimerId(o.id)} className="text-xs text-gray-400 bg-white/5 border border-white/10 px-4 py-2 rounded-lg hover:text-emerald-400 hover:border-emerald-500/30 transition-colors shrink-0 w-fit font-bold">
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
  const [phone, setPhone] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');

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
      body: JSON.stringify({ username, password, full_name: fullName, is_admin: isAdmin, phone: phone || null })
    });
    setUsername(''); setPassword(''); setFullName(''); setIsAdmin(false); setPhone('');
    fetchUsers();
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditUsername(u.username);
    setEditPhone(u.phone || '');
    setEditIsAdmin(u.is_admin);
    setEditPassword('');
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ full_name: editFullName, username: editUsername, is_admin: editIsAdmin, newPassword: editPassword || undefined, phone: editPhone || null })
    });
    if (res.ok) {
      setEditingUser(null);
      fetchUsers();
    } else {
      const data = await res.json();
      setEditError(data.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف المستخدم نهائياً؟')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    fetchUsers();
  };

  const inputCls = "w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all placeholder-gray-500";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#18181b] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h4 className="text-lg font-bold text-gray-100 mb-5">تعديل المستخدم</h4>
              <form onSubmit={handleEdit} className="space-y-3">
                <input required placeholder="الاسم الكامل" value={editFullName} onChange={e => setEditFullName(e.target.value)} className={inputCls} />
                <input required placeholder="اسم المستخدم" value={editUsername} onChange={e => setEditUsername(e.target.value)} className={inputCls} />
                <input type="tel" placeholder="رقم الواتساب (مثال: 970599123456)" value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputCls + " font-mono"} dir="ltr" />
                <input type="password" placeholder="كلمة مرور جديدة (اتركها فارغة للإبقاء)" value={editPassword} onChange={e => setEditPassword(e.target.value)} className={inputCls} />
                <label className="flex items-center gap-3 text-sm text-gray-300 bg-black/20 px-4 py-3 border border-white/10 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={editIsAdmin} onChange={e => setEditIsAdmin(e.target.checked)} className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500" />
                  صلاحيات مسؤول (Admin)
                </label>
                {editError && <p className="text-red-400 text-sm font-bold">{editError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl text-sm font-bold transition-all">حفظ التعديلات</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-sm font-bold transition-all">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5">
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-100 mb-6">
          <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
            <Users size={20} />
          </div>
          إضافة مستخدم جديد
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
          <input required placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} />
          <input required type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
          <input type="tel" placeholder="رقم الواتساب (مثال: 970599123456)" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls + " font-mono"} dir="ltr" />
          <label className="flex items-center gap-3 text-sm text-gray-300 bg-black/20 px-4 py-3 border border-white/10 rounded-xl cursor-pointer md:col-span-2">
            <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500" />
            صلاحيات مسؤول (Admin)
          </label>
          <div className="md:col-span-2 mt-2">
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">إضافة المستخدم</button>
          </div>
        </form>
      </div>

      <div className="bg-[#18181b]/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-black/40 border-b border-white/5">
            <tr>
              <th className="px-5 py-4 text-gray-400">الاسم الكامل</th>
              <th className="px-5 py-4 text-gray-400">اسم المستخدم</th>
              <th className="px-5 py-4 text-gray-400">واتساب</th>
              <th className="px-5 py-4 text-gray-400">الدور</th>
              <th className="px-5 py-4 text-gray-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 font-bold text-gray-200">{u.full_name}</td>
                <td className="px-5 py-4 font-mono text-gray-400 text-xs">{u.username}</td>
                <td className="px-5 py-4 font-mono text-gray-400 text-xs">{u.phone || <span className="text-gray-600">—</span>}</td>
                <td className="px-5 py-4">
                  {u.is_admin ? <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-bold">Admin</span> : <span className="bg-white/5 border border-white/10 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold">User</span>}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(u)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg transition-colors font-bold">تعديل</button>
                    <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors font-bold">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500">لا يوجد مستخدمين.</td></tr>
            )}
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
        <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-100 mb-6">
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
              <Store size={20} />
            </div>
            إضافة مطعم
          </h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input required placeholder="اسم المطعم" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all placeholder-gray-500" />
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">إضافة</button>
          </form>
        </div>

        <div className="bg-[#18181b]/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-black/40 flex items-center justify-between">
            <h3 className="font-bold text-gray-200">المطاعم الحالية</h3>
          </div>
          <ul className="divide-y divide-white/5">
            {restaurants.map(r => (
              <li key={r.id} className={cn("p-5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors border-l-2", selectedRestaurant?.id === r.id ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-transparent")} onClick={() => setSelectedRestaurant(r)}>
                <span className="font-bold text-gray-200">{r.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors text-sm font-bold">حذف</button>
              </li>
            ))}
            {restaurants.length === 0 && <li className="p-8 text-center text-gray-500">لا يوجد مطاعم مضافة.</li>}
          </ul>
        </div>
      </div>

      {/* Meals Management */}
      {selectedRestaurant && (
        <div className="space-y-6">
          <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <h3 className="text-xl font-bold text-gray-100 mb-6 flex justify-between items-center">
              <span>إضافة وجبة لـ <span className="text-emerald-400">{selectedRestaurant.name}</span></span>
            </h3>
            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <input required placeholder="اسم الوجبة" value={mealName} onChange={e => setMealName(e.target.value)} className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all placeholder-gray-500" />
              </div>
              <div>
                <input required type="number" step="0.01" placeholder="السعر" value={mealPrice} onChange={e => setMealPrice(e.target.value)} className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all placeholder-gray-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-sm font-bold transition-all mt-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">إضافة وجبة</button>
            </form>
          </div>

          <div className="bg-[#18181b]/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-black/40">
              <h3 className="font-bold text-gray-200">قائمة وجبات <span className="text-emerald-400">{selectedRestaurant.name}</span></h3>
            </div>
            <ul className="divide-y divide-white/5">
              {meals.map(m => (
                <li key={m.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div>
                    <span className="font-bold text-gray-200 block mb-1">{m.name}</span>
                    <span className="text-gray-400 font-mono text-sm bg-white/5 px-2 py-0.5 rounded border border-white/10">{m.price.toFixed(2)} ₪</span>
                  </div>
                  <button onClick={() => handleDeleteMeal(m.id)} className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors text-sm font-bold">حذف</button>
                </li>
              ))}
              {meals.length === 0 && <li className="p-8 text-center text-gray-500">لا يوجد وجبات لهذا المطعم.</li>}
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AdminWhatsApp() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [credSelectedIds, setCredSelectedIds] = useState<string[]>([]);
  const [credStatus, setCredStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [credResult, setCredResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setUsers);
  }, []);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user?.phone) setPhone(user.phone);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, message }),
      });
      if (res.ok) {
        setStatus('success');
        setMessage('');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'حدث خطأ أثناء الإرسال');
        setStatus('error');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم');
      setStatus('error');
    }
  };

  const toggleCredUser = (id: string) => {
    setCredSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllCredUsers = () => {
    const usersWithPhone = users.filter(u => u.phone);
    setCredSelectedIds(usersWithPhone.map(u => u.id));
  };

  const handleSendCredentials = async () => {
    if (credSelectedIds.length === 0) return;
    if (!confirm(`سيتم إرسال بيانات الدخول (اسم المستخدم + كلمة مرور مؤقتة) لـ ${credSelectedIds.length} مستخدم عبر الواتساب. سيتم تغيير كلمة المرور لكل مستخدم. متابعة؟`)) return;
    setCredStatus('loading');
    setCredResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whatsapp/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: credSelectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setCredResult({ sent: data.sent, failed: data.failed, total: data.total });
        setCredStatus('success');
        setCredSelectedIds([]);
      } else {
        setErrorMsg(data.error || 'حدث خطأ');
        setCredStatus('error');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم');
      setCredStatus('error');
    }
    setTimeout(() => { setCredStatus('idle'); setCredResult(null); }, 8000);
  };

  const sendCredToUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (!confirm(`سيتم إرسال بيانات الدخول (اسم المستخدم + كلمة مرور مؤقتة) للمستخدم ${user.full_name} عبر الواتساب. سيتم تغيير كلمة المرور. متابعة؟`)) return;

    setCredStatus('loading');
    setCredResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whatsapp/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: [userId] }),
      });
      const data = await res.json();
      if (res.ok) {
        setCredResult({ sent: data.sent, failed: data.failed, total: data.total });
        setCredStatus('success');
      } else {
        setErrorMsg(data.error || 'حدث خطأ');
        setCredStatus('error');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم');
      setCredStatus('error');
    }
    setTimeout(() => { setCredStatus('idle'); setCredResult(null); }, 8000);
  };

  const inputCls = "w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all placeholder-gray-500";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5">
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-100 mb-6">
          <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
            <MessageCircle size={20} />
          </div>
          إرسال رسالة واتساب
        </h3>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">اختر مستخدم (اختياري)</label>
            <select
              value={selectedUserId}
              onChange={e => handleUserSelect(e.target.value)}
              className="w-full bg-black/20 border border-white/10 text-gray-100 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 px-4 py-3 outline-none transition-all"
            >
              <option value="" className="bg-[#18181b]">-- اختر مستخدم لتعبئة رقمه --</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-[#18181b]">
                  {u.full_name} {u.phone ? `(${u.phone})` : '(بدون رقم)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">رقم الهاتف *</label>
            <input
              required
              type="tel"
              placeholder="مثال: 970599123456"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={inputCls + " font-mono"}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">نص الرسالة *</label>
            <textarea
              required
              rows={4}
              placeholder="اكتب رسالتك هنا..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className={inputCls + " resize-none"}
            />
          </div>

          {status === 'success' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-bold">
              تم إرسال الرسالة بنجاح ✓
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-bold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] text-sm"
          >
            <Send size={16} />
            {status === 'loading' ? 'جاري الإرسال...' : 'إرسال الرسالة'}
          </button>
        </form>
      </div>

      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-amber-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-100 mb-2">
          <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg">
            🔑
          </div>
          إرسال بيانات الدخول عبر واتساب
        </h3>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          سيتم إنشاء كلمة مرور مؤقتة جديدة لكل مستخدم وإرسال اسم المستخدم وكلمة المرور عبر الواتساب.
          <span className="text-amber-400 font-bold"> سيتم تغيير كلمة المرور الحالية!</span>
        </p>

        <div className="mb-4 flex gap-2">
          <button onClick={selectAllCredUsers} className="text-xs bg-white/10 hover:bg-white/15 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-bold">تحديد الكل</button>
          <button onClick={() => setCredSelectedIds([])} className="text-xs bg-white/10 hover:bg-white/15 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-bold">إلغاء التحديد</button>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto border border-white/10 rounded-xl p-2 bg-black/20 mb-4">
          {users.length === 0 && <p className="text-xs text-gray-500 text-center py-3">لا يوجد مستخدمين</p>}
          {users.map(u => (
            <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${!u.phone ? 'opacity-40' : 'hover:bg-white/5'}`}>
              <input
                type="checkbox"
                disabled={!u.phone}
                checked={credSelectedIds.includes(u.id)}
                onChange={() => toggleCredUser(u.id)}
                className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="flex-1 text-sm text-gray-200 font-medium">{u.full_name}</span>
              <span className="text-xs text-gray-500 font-mono dir-ltr">{u.phone || 'بدون رقم'}</span>
              {u.phone && (
                <button
                  onClick={() => sendCredToUser(u.id)}
                  disabled={credStatus === 'loading'}
                  className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                >
                  إرسال له فقط
                </button>
              )}
            </div>
          ))}
        </div>

        {credResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold border ${credResult.failed === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            تم الإرسال لـ {credResult.sent} من أصل {credResult.total}{credResult.failed > 0 ? ` (فشل ${credResult.failed})` : ''}
          </div>
        )}
        {credStatus === 'error' && !credResult && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold bg-red-500/10 border border-red-500/20 text-red-400">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSendCredentials}
          disabled={credSelectedIds.length === 0 || credStatus === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-sm"
        >
          <Send size={16} />
          {credStatus === 'loading' ? 'جاري الإرسال...' : `إرسال بيانات الدخول (${credSelectedIds.length} مستخدم)`}
        </button>
      </div>
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
    { id: 'whatsapp', name: 'واتساب', icon: MessageCircle, path: '/admin/whatsapp' },
  ];

  return (
    <div className="space-y-6 pb-20 relative">
      <h1 className="text-3xl font-black text-gray-100 mb-8">لوحة الإدارة</h1>
      
      <div className="flex overflow-x-auto sticky top-[72px] z-20 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/5 shadow-lg rounded-2xl mx-0 p-1 mb-8 gap-1 scrollbar-hide">
        {tabs.map(tab => {
          const isActive = tab.path === location.pathname || (tab.id === 'orders' && location.pathname === '/admin');
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "flex items-center gap-2 px-5 py-3 font-bold text-sm whitespace-nowrap rounded-xl transition-all flex-1 text-center justify-center",
                isActive ? "bg-white/10 text-white shadow-sm" : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <tab.icon size={18} className={cn("", isActive ? "text-emerald-400" : "")} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {/* @ts-ignore */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AdminOrders />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/restaurants" element={<AdminRestaurants />} />
            <Route path="/whatsapp" element={<AdminWhatsApp />} />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
}
