import { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { AppContext } from './AppContext';
import { GlobalProgress } from './components/GlobalProgress';
import Home from './pages/Home';
import TeamsManager from './pages/TeamsManager';
import { Login } from './components/Login';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';

// Using index.css imported in main.tsx

function NavigationDrawer() {
  const { isDrawerOpen, setIsDrawerOpen } = useContext(AppContext);
  const location = useLocation();

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname, setIsDrawerOpen]);

  return (
    <>
      {isDrawerOpen && <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} />}

      <aside className={`sidebar ${isDrawerOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'none' /* hidden by default, shown via CSS */ }}>
          <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: 'var(--text-primary)', padding: 0 }}>←</button>
        </div>
        <nav className="side-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Match History</NavLink>
          <NavLink to="/teams" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Teams</NavLink>
        </nav>
      </aside>
    </>
  );
}

function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <h2>...</h2>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ isDrawerOpen, setIsDrawerOpen }}>
      <Router>
        {!user ? (
          <Routes>
            <Route path="/login" element={<Login onSuccess={() => {}} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <div className="app-container">
            <NavigationDrawer />

            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/teams" element={<TeamsManager />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <GlobalProgress />
          </div>
        )}
      </Router>
    </AppContext.Provider>
  );
}

export default App;
