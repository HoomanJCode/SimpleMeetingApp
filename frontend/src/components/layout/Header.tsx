import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useState } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import { LoginModal } from '../auth/LoginModal';

export function Header() {
  const { user, login, logout, authMethod, loginWithEmail } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-700 dark:text-primary-400">
            <span className="text-2xl">📅</span>
            IrMeeting
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/my-meetings" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  My Meetings
                </Link>
                <Link to="/calendar" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Calendar
                </Link>
                <Link to="/timeline" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Timeline
                </Link>
                <Link
                  to="/meetings/new"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  + Create Meeting
                </Link>
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">{user.name}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors ml-2"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : authMethod === 'userpass' ? (
              <>
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
                <LoginModal
                  isOpen={loginModalOpen}
                  onClose={() => setLoginModalOpen(false)}
                  onLogin={loginWithEmail}
                />
              </>
            ) : (
              <>
                <button
                  onClick={login}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Sign in with Google
                </button>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <div className="flex items-center md:hidden gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 dark:border-gray-800">
            {user ? (
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center gap-2 pb-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                </div>
                <Link to="/my-meetings" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400" onClick={() => setMenuOpen(false)}>My Meetings</Link>
                <Link to="/calendar" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400" onClick={() => setMenuOpen(false)}>Calendar</Link>
                <Link to="/timeline" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400" onClick={() => setMenuOpen(false)}>Timeline</Link>
                <Link to="/meetings/new" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400" onClick={() => setMenuOpen(false)}>Create Meeting</Link>
                <button onClick={logout} className="text-left text-red-500 hover:text-red-600 pt-2 border-t border-gray-100 dark:border-gray-800">Sign Out</button>
              </div>
            ) : authMethod === 'userpass' ? (
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => { setMenuOpen(false); setLoginModalOpen(true); }}
                  className="w-full text-center py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Sign In
                </button>
                <LoginModal
                  isOpen={loginModalOpen}
                  onClose={() => setLoginModalOpen(false)}
                  onLogin={loginWithEmail}
                />
              </div>
            ) : (
              <button onClick={login} className="w-full text-center py-2 mt-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors">
                Sign in with Google
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
