import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useState } from 'react';

export function Header() {
  const { user, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-700">
            <span className="text-2xl">📅</span>
            IrMeeting
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/my-meetings" className="text-gray-600 hover:text-primary-600 transition-colors">
                  My Meetings
                </Link>
                <Link
                  to="/meetings/new"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  + Create Meeting
                </Link>
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors ml-2"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Sign in with Google
              </button>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            {user ? (
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center gap-2 pb-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <Link to="/my-meetings" className="text-gray-600 hover:text-primary-600" onClick={() => setMenuOpen(false)}>My Meetings</Link>
                <Link to="/meetings/new" className="text-gray-600 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Create Meeting</Link>
                <button onClick={logout} className="text-left text-red-500 hover:text-red-600 pt-2 border-t border-gray-100">Sign Out</button>
              </div>
            ) : (
              <button onClick={login} className="w-full text-center py-2 mt-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                Sign in with Google
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
