import { useState, useEffect } from 'react';
import { TaskProvider, useTask } from './context/TaskContext';
import Dashboard from './components/Dashboard';
import LeagueView from './components/LeagueView';
import ProfileView from './components/ProfileView';
import Login from './components/Login';

function AppContent() {
  const { session } = useTask();
  // State for current view (Dashboard, League, Profile)
  const [currentView, setCurrentView] = useState('dashboard');
  
  // State for dark mode, initialized from localStorage or system preference
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') !== 'light';
    }
    return true;
  });

  // Effect to apply dark mode class to html element and save preference
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Helper function to render the active view component
  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'league': return <LeagueView />;
      case 'profile': return <ProfileView />;
      default: return <Dashboard />;
    }
  };

  // Helper component for Mobile Navigation Items
  const NavItem = ({ view, icon, label, hasNotification }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center w-full py-3 transition-colors relative ${
        currentView === view ? 'text-gold' : 'text-gray-500 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
      }`}
    >
      <div className="relative">
        <span className="text-2xl mb-1">{icon}</span>
        {hasNotification && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-800"></span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  // Check if Supabase is configured
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Missing Configuration ⚠️</h1>
          <p className="text-gray-600 mb-4">
            The app cannot connect to Supabase because the API keys are missing.
          </p>
          <div className="bg-gray-50 p-4 rounded text-left text-sm font-mono mb-4 overflow-x-auto">
            VITE_SUPABASE_URL=...<br/>
            VITE_SUPABASE_ANON_KEY=...
          </div>
          <p className="text-sm text-gray-500">
            Please check your <b>.env</b> file and restart the server.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Get notification states
  const { hasNewAchievement, hasLeagueUpdate } = useTask();

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-dark-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Main Content Area */}
      <main className="pb-20 md:pb-0 md:pl-64 min-h-screen">
        {renderView()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around z-50 pb-4 pt-2 ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}>
        <NavItem view="dashboard" icon="📝" label="Tasks" />
        <NavItem view="league" icon="🏆" label="League" hasNotification={hasLeagueUpdate} />
        <NavItem view="profile" icon="👤" label="Profile" hasNotification={hasNewAchievement} />
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className={`hidden md:flex fixed left-0 top-0 bottom-0 w-64 border-r flex-col p-6 ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center text-dark-900 font-bold text-2xl">
            🎯
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>TaskHero</h1>
        </div>

        <nav className="space-y-2">
          {['dashboard', 'league', 'profile'].map(view => {
            const showDot = (view === 'league' && hasLeagueUpdate) || (view === 'profile' && hasNewAchievement);
            
            return (
                <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all capitalize relative ${
                    currentView === view 
                    ? 'bg-gold text-dark-900 font-bold' 
                    : isDark ? 'text-gray-400 hover:bg-dark-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
                >
                <div className="relative">
                    <span>
                        {view === 'dashboard' && '📝'}
                        {view === 'league' && '🏆'}
                        {view === 'profile' && '👤'}
                    </span>
                    {showDot && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-800"></span>
                    )}
                </div>
                {view}
                </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-dark-700">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <span>{isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</span>
          </button>
          <div className="text-xs text-gray-500 text-center mt-4">
            v1.0.0 • TaskHero
          </div>
        </div>
      </aside>
      
      {/* Mobile Theme Toggle (Floating) */}
      <button
          onClick={() => setIsDark(!isDark)}
          className="md:hidden fixed top-4 right-4 w-10 h-10 rounded-full bg-gold text-dark-900 flex items-center justify-center shadow-lg z-50"
      >
          {isDark ? '☀️' : '🌙'}
      </button>
    </div>
  );
}

function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}

export default App;
