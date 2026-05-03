import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App.tsx';
import { useNavigate, Navigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }
      
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-[#18181b]/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/5">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-100 mb-2">تسجيل الدخول</h1>
        <p className="text-gray-400 text-sm">مرحباً بك في نظام طلبات الطعام</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm text-center font-bold">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">اسم المستخدم</label>
          <input 
            type="text" 
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">كلمة المرور</label>
          <input 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-black/20 border border-white/10 text-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-xl transition-all mt-4 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
