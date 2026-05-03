import { useContext } from 'react';
import { AuthContext } from '../App.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Settings, User } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#111113]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8 w-full">
          <Link to="/" className="text-xl font-black text-emerald-400 flex items-center gap-2 hover:opacity-80 transition-opacity">
            🍕 غدانا
          </Link>
          
          <div className="flex items-center gap-1 mx-auto bg-white/5 p-1 rounded-xl border border-white/10">
            <Link to="/" className="px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white text-xs md:text-sm font-medium text-gray-400 flex items-center gap-2 transition-all">
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>
            {user.is_admin && (
              <Link to="/admin" className="px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white text-xs md:text-sm font-medium text-gray-400 flex items-center gap-2 transition-all">
                <Settings size={18} />
                <span className="hidden sm:inline">الإدارة</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link to="/profile" className="text-xs md:text-sm font-medium text-gray-300 hover:text-emerald-400 transition-colors hidden sm:flex items-center gap-2 focus:outline-none bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-md">
              <User size={16} /> 
            </div>
            {user.full_name}
          </Link>
          <Link to="/profile" className="sm:hidden text-gray-400 hover:text-emerald-400 focus:outline-none p-1">
            <User size={18} />
          </Link>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all focus:outline-none"
            title="تسجيل الخروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
