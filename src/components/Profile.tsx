import React, { useState, useContext } from 'react';
import { AuthContext } from '../App.tsx';
import { motion } from 'motion/react';
import { User, Lock } from 'lucide-react';

export default function Profile() {
  const { user, login } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newFullName, setNewFullName] = useState(user?.full_name || '');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('يجب إدخال كلمة المرور الحالية لتأكيد التعديلات');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword || undefined,
          newUsername,
          newFullName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('تم تحديث البيانات بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      
      // Update global context
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-md mx-auto space-y-6"
    >
      <div className="bg-[#18181b]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-lg border border-white/5">
        <h2 className="text-2xl font-black text-gray-100 mb-6 flex items-center gap-3">
          <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl">
            <User size={24} />
          </div>
          إعدادات الحساب
        </h2>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">الاسم الكامل</label>
            <input 
              type="text" 
              required
              value={newFullName}
              onChange={e => setNewFullName(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">اسم المستخدم</label>
            <input 
              type="text" 
              required
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm font-mono placeholder-gray-500"
            />
          </div>

          <div className="pt-5 border-t border-white/10 pb-2">
            <h3 className="text-sm font-black text-gray-200 flex items-center gap-2 mb-4">
              <Lock size={16} className="text-emerald-400" /> تغيير كلمة المرور
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">كلمة المرور الجديدة (اختياري)</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-white/10">
            <label className="block text-sm font-black text-emerald-400 mb-1">تأكيد الهوية *</label>
            <p className="text-xs text-gray-400 mb-3">يرجى إدخال كلمة المرور الحالية لتطبيق التعديلات.</p>
            <input 
              type="password" 
              required
              placeholder="كلمة المرور الحالية"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-red-500/5 border border-red-500/20 text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm placeholder-gray-600"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
