import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle.jsx';  
export default function Header({ isDark, toggleDark }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { accessToken, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="mb-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Personal Finance Tracker</h1>
            {accessToken && user?.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            )}
          </div>
        </Link>
        
        <nav className="hidden md:flex gap-2 items-center">
          {accessToken && (
            <>
              <Link to="/" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Dashboard
              </Link>
              <Link to="/categories" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Categories
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            </>
          )}
          <ThemeToggle isDark={isDark} toggle={toggleDark} />
          {accessToken ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
            >
              Logout
            </button>
          ) : (
            <>
              {window.location.pathname !== '/login' && (
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Login</Link>
              )}
              {window.location.pathname !== '/register' && (
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">Register</Link>
              )}
            </>
          )}
        </nav>
        
        {/* Hamburger for mobile */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle isDark={isDark} toggle={toggleDark} />
          <button onClick={() => setMenuOpen(m => !m)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        
        {menuOpen && (
          <div className="absolute top-full right-2 sm:right-4 mt-3 w-64 bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col py-3 z-40 animate-fade-in backdrop-blur-xl">
            {accessToken && (
              <>
                <Link to="/" className="mx-3 px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold hover:bg-green-50 dark:hover:bg-gray-800/50 hover:text-green-600 dark:hover:text-green-400 transition rounded-xl flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Dashboard
                </Link>
                <Link to="/categories" className="mx-3 px-4 py-3 text-gray-700 dark:text-gray-200 font-semibold hover:bg-green-50 dark:hover:bg-gray-800/50 hover:text-green-600 dark:hover:text-green-400 transition rounded-xl flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  Categories
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 mx-3"></div>
              </>
            )}
            {accessToken ? (
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="mx-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="mx-3 mb-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="mx-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl transition-all" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}