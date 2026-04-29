import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../App.tsx';
import { CheckCircle2, Clock, Package, XCircle, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_MAP: Record<string, { label: string, icon: any, color: string }> = {
  open: { label: 'مفتوح للطلب', icon: Clock, color: 'text-green-600 bg-green-50 border-green-200' },
  ordered: { label: 'تم الطلب من المطعم', icon: Package, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  delivered: { label: 'وصل الطلب', icon: CheckCircle2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  closed: { label: 'مغلق', icon: XCircle, color: 'text-gray-600 bg-gray-50 border-gray-200' }
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('summary');

  // Form State
  const [restaurantId, setRestaurantId] = useState('');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeLeft, setTimeLeft] = useState<{ m: number, s: number } | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [hasPlayedAlarm, setHasPlayedAlarm] = useState(false);

  // Play a simple beep sequence when timer hits zero
  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(0, audioCtx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.4);
      oscillator.frequency.setValueAtTime(0, audioCtx.currentTime + 0.6);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.8);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.log('Audio disabled or failed');
    }
  };

  useEffect(() => {
    if (!order || !order.closes_at || order.status !== 'open') {
      setTimeLeft(null);
      setIsTimeUp(false);
      setHasPlayedAlarm(false);
      return;
    }
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(order.closes_at).getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft({ m: 0, s: 0 });
        setIsTimeUp(true);
        setHasPlayedAlarm((prev) => {
          if (!prev) playAlarm(); // play once
          return true;
        });
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ m, s });
        setIsTimeUp(false);
        setHasPlayedAlarm(false);
      }
    }, 1000);
    
    // trigger immediately on mount
    const end = new Date(order.closes_at).getTime();
    if (end - new Date().getTime() <= 0) {
      setTimeLeft({ m: 0, s: 0 });
      setIsTimeUp(true);
      if (!hasPlayedAlarm) {
        playAlarm();
        setHasPlayedAlarm(true);
      }
    }
    
    return () => clearInterval(interval);
  }, [order, hasPlayedAlarm]);

  const fetchData = async (orderIdToFetch?: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const allOrdersRes = await fetch('/api/orders', { headers });
      const allOrdersData = await allOrdersRes.json();
      setAllOrders(allOrdersData);

      let orderData = null;
      if (orderIdToFetch) {
         const orderRes = await fetch(`/api/orders/${orderIdToFetch}`, { headers });
         orderData = await orderRes.json();
      } else if (allOrdersData.length > 0) {
         orderData = allOrdersData[0]; // the latest order
      }

      setOrder(orderData);
      if (orderData) {
        setSelectedOrderId(orderData.id);
        const itemsRes = await fetch(`/api/orders/${orderData.id}/items`, { headers });
        setItems(await itemsRes.json());
      } else {
        setSelectedOrderId(null);
        setItems([]);
      }

      const restsRes = await fetch('/api/restaurants', { headers });
      setRestaurants(await restsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    fetchData(e.target.value);
  };

  useEffect(() => {
    if (restaurantId) {
      const token = localStorage.getItem('token');
      fetch(`/api/restaurants/${restaurantId}/meals`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          setMeals(data);
          setSelectedMealId(''); // Reset meal
          setItemName('');
          setPrice('');
        });
    } else {
      setMeals([]);
      setSelectedMealId('');
    }
  }, [restaurantId]);

  const handleMealChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mealId = e.target.value;
    setSelectedMealId(mealId);
    if (mealId && mealId !== 'custom') {
      const meal = meals.find(m => m.id === mealId);
      if (meal) {
        setItemName(meal.name);
        setPrice(meal.price.toString());
      }
    } else {
      setItemName('');
      setPrice('');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || order.status !== 'open') return;
    if (!restaurantId || !itemName || !price) {
      setFormError('يرجى تعبئة الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          restaurant_id: restaurantId, 
          item_name: itemName, 
          price: parseFloat(price), 
          notes 
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setRestaurantId('');
      setSelectedMealId('');
      setItemName('');
      setPrice('');
      setNotes('');
      fetchData(order.id); // Refresh list
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('هل أنت متأكد من حذف الطلب؟')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/orders/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData(order.id);
    } catch (err) {
      console.error(err);
    }
  };

  const summary = useMemo(() => {
    const groups: Record<string, any> = {};
    items.forEach(item => {
      const key = `${item.restaurant_name}-${item.item_name}-${item.price}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          restaurant_name: item.restaurant_name,
          item_name: item.item_name,
          price: item.price,
          count: 0,
          total: 0,
          users: [],
          notes: []
        };
      }
      groups[key].count += 1;
      groups[key].total += item.price;
      if (!groups[key].users.includes(item.user_name)) {
        groups[key].users.push(item.user_name);
      }
      if (item.notes) {
        groups[key].notes.push(`${item.user_name}: ${item.notes}`);
      }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [items]);

  if (loading) return <div className="py-12 text-center text-gray-500">جاري التحميل...</div>;

  if (!order) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
          <Clock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">لا توجد طلبية اليوم</h2>
        <p className="text-gray-500">لم يقم المسؤول بفتح طلبية لهذا اليوم بعد.</p>
      </motion.div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.closed;
  const StatusIcon = statusInfo.icon;
  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Status Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-auto flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900">الطلبية:</h2>
            <select 
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
              value={selectedOrderId || ''}
              onChange={handleOrderChange}
            >
              {allOrders.map(o => (
                <option key={o.id} value={o.id}>{o.order_date}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border", statusInfo.color)}>
              <StatusIcon size={16} />
              {statusInfo.label}
            </div>
            
            {timeLeft && (
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border transition-colors", 
                isTimeUp ? "text-red-600 bg-red-50 border-red-200 animate-pulse" : "text-amber-600 bg-amber-50 border-amber-200"
              )}>
                <Clock size={16} />
                {isTimeUp ? "انتهى الوقت" : `يغلق بعد: ${timeLeft.m.toString().padStart(2, '0')}:${timeLeft.s.toString().padStart(2, '0')}`}
              </div>
            )}
          </div>
        </div>
        <div className="text-center md:text-left bg-gray-50 px-4 py-3 rounded-lg border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">الإجمالي الكلي</div>
          <div className="text-2xl font-bold text-gray-900">{totalAmount.toFixed(2)} د.أ</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <AnimatePresence>
        {order.status === 'open' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" />
              إضافة طلب
            </h3>
            
            {formError && <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{formError}</div>}
            
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المطعم *</label>
                <select 
                  required
                  value={restaurantId}
                  onChange={e => setRestaurantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                >
                  <option value="">-- اختر المطعم --</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              
              {restaurantId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوجبة *</label>
                  <select 
                    required
                    value={selectedMealId}
                    onChange={handleMealChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all mb-4"
                  >
                    <option value="">-- اختر الوجبة --</option>
                    {meals.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.price.toFixed(2)} د.أ</option>
                    ))}
                    <option value="custom">وجبة أخرى (إدخال يدوي)</option>
                  </select>

                  {selectedMealId === 'custom' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوجبة الحرة *</label>
                        <input 
                          type="text" 
                          required
                          value={itemName}
                          onChange={e => setItemName(e.target.value)}
                          placeholder="مثال: شاورما دبل"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">السعر *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">ملاحظات (اختياري)</label>
                <input 
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="بدون مخلل..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4 shadow-sm"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'أضف طبلي'}
              </button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Orders List */}
        <div className={cn("bg-white p-0 rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300", order.status === 'open' ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">قائمة الطلبات ({items.length})</h3>
            <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
              <button 
                onClick={() => setViewMode('summary')}
                className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", viewMode === 'summary' ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700")}
              >
                تجميع الطلبات
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", viewMode === 'list' ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700")}
              >
                تفاصيل مفرقة
              </button>
            </div>
          </div>
          
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا يوجد طلبات مسجلة بعد.</div>
          ) : (
            <div className="overflow-x-auto">
              {viewMode === 'list' ? (
                <table className="w-full text-sm text-right">
                  <thead className="bg-white border-b text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">الموظف</th>
                      <th className="px-4 py-3">المطعم</th>
                      <th className="px-4 py-3">الوجبة</th>
                      <th className="px-4 py-3">ملاحظات</th>
                      <th className="px-4 py-3 text-left">السعر</th>
                      {order.status === 'open' && <th className="px-4 py-3 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                    {items.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        key={item.id} 
                        className={cn("border-b border-gray-50 hover:bg-gray-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{item.user_name}
                          {item.user_id === user.id && <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block">أنت</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.restaurant_name}</td>
                        <td className="px-4 py-3 text-gray-900">{item.item_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={item.notes}>{item.notes || '-'}</td>
                        <td className="px-4 py-3 font-medium text-left">{item.price.toFixed(2)}</td>
                        {order.status === 'open' && (
                          <td className="px-4 py-3 text-left">
                            {(item.user_id === user.id || user.is_admin) && (
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                title="حذف الطلب"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm text-right">
                  <thead className="bg-white border-b text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">الكمية</th>
                      <th className="px-4 py-3">المطعم</th>
                      <th className="px-4 py-3">الوجبة</th>
                      <th className="px-4 py-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                    {summary.map((group: any, idx: number) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        key={group.id} 
                        className={cn("border-b border-gray-50 hover:bg-gray-50 transition-colors align-top", idx % 2 === 0 ? "bg-white" : "bg-gray-50/50")}
                      >
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-bold w-7 h-7 rounded-full">
                            {group.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 pt-4">{group.restaurant_name}</td>
                        <td className="px-4 py-3 pt-4">
                          <div className="font-medium text-gray-900 mb-1">{group.item_name}</div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {group.notes.length > 0 && (
                              <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-100">
                                <span className="font-bold block mb-1">الملاحظات:</span>
                                <ul className="list-disc list-inside">
                                  {group.notes.map((note: string, i: number) => (
                                    <li key={i}>{note}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="text-gray-400 mt-1" title={group.users.join('، ')}>
                              طالبيها: <span className="truncate inline-block max-w-[200px] align-bottom">{group.users.join('، ')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-left text-blue-700 pt-4">{group.total.toFixed(2)}</td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
