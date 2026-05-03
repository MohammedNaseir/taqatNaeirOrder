import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../App.tsx';
import { CheckCircle2, Clock, Package, XCircle, Plus, Trash2, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_MAP: Record<string, { label: string, icon: any, color: string }> = {
  open: { label: 'مفتوح للطلب', icon: Clock, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ordered: { label: 'تم الطلب من المطعم', icon: Package, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  delivered: { label: 'وصل الطلب', icon: CheckCircle2, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  closed: { label: 'مغلق', icon: XCircle, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' }
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
  
  // Filtering and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

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

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(item => 
      item.restaurant_name.toLowerCase().includes(lower) ||
      item.item_name.toLowerCase().includes(lower) ||
      item.user_name.toLowerCase().includes(lower) ||
      (item.notes && item.notes.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  const sortedItems = useMemo(() => {
    let sortable = [...filteredItems];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [filteredItems, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-50 inline ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-emerald-400" /> : <ChevronDown size={14} className="inline ml-1 text-emerald-400" />;
  };

  const summary = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredItems.forEach(item => {
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

    let result = Object.values(groups);
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => b.count - a.count);
    }
    return result;
  }, [filteredItems, sortConfig]);

  if (loading) return <div className="py-12 text-center text-gray-400">جاري التحميل...</div>;

  if (!order) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-white/5 border border-white/10 text-gray-400 rounded-full flex items-center justify-center backdrop-blur-xl">
          <Clock size={40} className="opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-gray-100">لا توجد طلبية</h2>
        <p className="text-gray-400">لم يقم المسؤول بفتح طلبية بعد.</p>
      </motion.div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.closed;
  const StatusIcon = statusInfo.icon;
  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Status Header */}
      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg shadow-black/20">
        <div className="w-full md:w-auto flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-bold text-gray-100">الطلبية:</h2>
            <select 
              className="bg-black/20 border border-white/10 text-gray-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 block p-2 outline-none cursor-pointer hover:bg-black/40 transition-colors"
              value={selectedOrderId || ''}
              onChange={handleOrderChange}
            >
              {allOrders.map(o => (
                <option key={o.id} value={o.id} className="bg-[#18181b]">{o.order_date}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border", statusInfo.color)}>
              <StatusIcon size={16} />
              {statusInfo.label}
            </div>
            
            {timeLeft && (
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all", 
                isTimeUp ? "text-red-400 bg-red-500/10 border-red-500/20 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "text-amber-400 bg-amber-500/10 border-amber-500/20"
              )}>
                <Clock size={16} />
                {isTimeUp ? "انتهى الوقت" : `يغلق بعد: ${timeLeft.m.toString().padStart(2, '0')}:${timeLeft.s.toString().padStart(2, '0')}`}
              </div>
            )}
          </div>
        </div>
        <div className="text-center w-full md:w-48 bg-black/20 px-6 py-4 rounded-xl border border-white/5 hidden sm:block">
          <div className="text-sm text-gray-400 mb-1">الإجمالي الكلي</div>
          <div className="text-3xl font-black text-emerald-400">{totalAmount.toFixed(2)} <span className="text-lg text-emerald-600">د.أ</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <AnimatePresence>
        {order.status === 'open' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="lg:col-span-1 bg-[#18181b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5 h-fit">
            <h3 className="text-lg font-bold text-gray-100 mb-5 flex items-center gap-2">
              <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
                <Plus size={20} />
              </div>
              إضافة طلب
            </h3>
            
            {formError && <div className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{formError}</div>}
            
            <form onSubmit={handleAddItem} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">المطعم *</label>
                <select 
                  required
                  value={restaurantId}
                  onChange={e => setRestaurantId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm transition-all"
                >
                  <option value="" className="bg-[#18181b]">-- اختر المطعم --</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id} className="bg-[#18181b]">{r.name}</option>
                  ))}
                </select>
              </div>
              
              {restaurantId && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">الوجبة *</label>
                  <select 
                    required
                    value={selectedMealId}
                    onChange={handleMealChange}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm transition-all mb-4"
                  >
                    <option value="" className="bg-[#18181b]">-- اختر الوجبة --</option>
                    {meals.map(m => (
                      <option key={m.id} value={m.id} className="bg-[#18181b]">{m.name} - {m.price.toFixed(2)} د.أ</option>
                    ))}
                    <option value="custom" className="bg-[#18181b]">وجبة أخرى (إدخال يدوي)</option>
                  </select>

                  {selectedMealId === 'custom' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">اسم الوجبة الحرة *</label>
                        <input 
                          type="text" 
                          required
                          value={itemName}
                          onChange={e => setItemName(e.target.value)}
                          placeholder="مثال: شاورما دبل"
                          className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-gray-100 placeholder-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">السعر *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-gray-100 placeholder-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm transition-all text-left"
                          dir="ltr"
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">ملاحظات (اختياري)</label>
                <input 
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="بدون مخلل..."
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/10 text-gray-100 placeholder-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] mt-2"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'أضف لطلباتي'}
              </button>
            </form>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Orders List */}
        <div className={cn("bg-[#18181b]/80 backdrop-blur-xl p-0 rounded-2xl shadow-lg border border-white/5 overflow-hidden transition-all duration-300 h-fit", order.status === 'open' ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="p-5 border-b border-white/5 bg-black/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h3 className="font-bold text-gray-100 flex items-center gap-2 whitespace-nowrap">
              قائمة الطلبات 
              <span className="bg-white/10 text-gray-300 px-2 py-0.5 rounded-md text-xs">{filteredItems.length}</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-56">
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="ابحث عن موظف، مطعم، وجبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 text-gray-200 text-sm rounded-xl py-2 pl-3 pr-10 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
                />
              </div>
              <div className="flex bg-black/40 rounded-xl border border-white/5 p-1 w-full sm:w-auto shrink-0">
                <button 
                  onClick={() => { setViewMode('summary'); setSortConfig(null); }}
                  className={cn("flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors", viewMode === 'summary' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-white/5")}
                >
                  تجميع
                </button>
                <button 
                  onClick={() => { setViewMode('list'); setSortConfig(null); }}
                  className={cn("flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors", viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-white/5")}
                >
                  تفاصيل
                </button>
              </div>
            </div>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <Search size={48} className="text-gray-600 mb-4 opacity-50" />
              <p className="text-gray-400 text-lg">لم يتم العثور على نتائج.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {viewMode === 'list' ? (
                <table className="w-full text-sm text-right">
                  <thead className="bg-black/40 text-gray-400 font-medium border-b border-white/5">
                    <tr>
                      <th className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('user_name')}>
                        الموظف <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('user_name')}</span>
                      </th>
                      <th className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('restaurant_name')}>
                        المطعم <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('restaurant_name')}</span>
                      </th>
                      <th className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('item_name')}>
                        الوجبة <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('item_name')}</span>
                      </th>
                      <th className="px-5 py-4">ملاحظات</th>
                      <th className="px-5 py-4 text-left cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('price')}>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('price')}</span> السعر
                      </th>
                      {order.status === 'open' && <th className="px-5 py-4 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence>
                    {sortedItems.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        key={item.id} 
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4 font-medium text-gray-200">{item.user_name}
                          {item.user_id === user.id && <span className="mr-2 text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md inline-block">أنت</span>}
                        </td>
                        <td className="px-5 py-4 text-gray-400">{item.restaurant_name}</td>
                        <td className="px-5 py-4 text-gray-200">{item.item_name}</td>
                        <td className="px-5 py-4 text-gray-500 text-xs max-w-[150px] truncate" title={item.notes}>{item.notes || '-'}</td>
                        <td className="px-5 py-4 font-medium text-emerald-400 text-left">{item.price.toFixed(2)}</td>
                        {order.status === 'open' && (
                          <td className="px-5 py-4 text-left">
                            {(item.user_id === user.id || user.is_admin) && (
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
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
                  <thead className="bg-black/40 text-gray-400 font-medium border-b border-white/5">
                    <tr>
                      <th className="px-5 py-4 w-16 text-center cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('count')}>
                        الكمية <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('count')}</span>
                      </th>
                      <th className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('restaurant_name')}>
                        المطعم <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('restaurant_name')}</span>
                      </th>
                      <th className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('item_name')}>
                        الوجبة <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('item_name')}</span>
                      </th>
                      <th className="px-5 py-4 text-left cursor-pointer hover:bg-white/5 transition-colors group select-none" onClick={() => requestSort('total')}>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon('total')}</span> الإجمالي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence>
                    {summary.map((group: any, idx: number) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        key={group.id} 
                        className="hover:bg-white/[0.02] transition-colors align-top"
                      >
                        <td className="px-5 py-5 text-center">
                          <span className="inline-flex items-center justify-center bg-white/10 text-white font-bold w-8 h-8 rounded-lg border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            {group.count}
                          </span>
                        </td>
                        <td className="px-5 py-5 text-gray-400">{group.restaurant_name}</td>
                        <td className="px-5 py-5">
                          <div className="font-bold text-gray-100 mb-2 text-base">{group.item_name}</div>
                          <div className="space-y-2">
                            {group.notes.length > 0 && (
                              <div className="bg-amber-500/10 text-amber-300 p-2.5 rounded-lg border border-amber-500/20 text-xs">
                                <span className="font-bold block mb-1">الملاحظات:</span>
                                <ul className="list-disc list-inside opacity-90 space-y-0.5">
                                  {group.notes.map((note: string, i: number) => (
                                    <li key={i}>{note}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="text-gray-500 text-xs" title={group.users.join('، ')}>
                              طالبيها: <span className="truncate inline-block max-w-[250px] align-bottom text-gray-400">{group.users.join('، ')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-5 font-bold text-left text-emerald-400 text-lg">{group.total.toFixed(2)}</td>
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
