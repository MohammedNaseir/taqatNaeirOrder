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
    <nav className="bg-white/90 backdrop-blur-md shadow border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6 w-full">
          <Link to="/" className="text-lg md:text-xl font-bold text-blue-600 flex items-center gap-2">
            🍕 غدانا
          </Link>
          
          <div className="flex items-center gap-1 md:gap-2 mx-auto">
            <Link to="/" className="px-2 md:px-3 py-2 rounded-md hover:bg-gray-100 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 md:gap-2">
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">الرئيسية</span>
            </Link>
            {user.is_admin && (
              <Link to="/admin" className="px-2 md:px-3 py-2 rounded-md hover:bg-gray-100 text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 md:gap-2">
                <Settings size={18} />
                <span className="hidden sm:inline">الإدارة</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link to="/profile" className="text-xs md:text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors hidden sm:flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-lg p-1">
            <User size={16} /> 
            مرحباً، {user.full_name}
          </Link>
          <Link to="/profile" className="sm:hidden text-gray-600 hover:text-blue-600 focus:outline-none p-1">
            <User size={18} />
          </Link>
          <button 
            onClick={handleLogout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none"
            title="تسجيل الخروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
