import { useState, useContext } from 'react';
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
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="text-blue-600" />
          إعدادات الحساب
        </h2>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
            <input 
              type="text" 
              required
              value={newFullName}
              onChange={e => setNewFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
            <input 
              type="text" 
              required
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-mono"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1 mb-4">
              <Lock size={16} /> تغيير كلمة المرور
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة (اختياري)</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-800 mb-1">تأكيد الهوية *</label>
            <p className="text-xs text-gray-500 mb-2">يرجى إدخال كلمة المرور الحالية لتطبيق التعديلات.</p>
            <input 
              type="password" 
              required
              placeholder="كلمة المرور الحالية"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 mt-6 shadow-sm"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
