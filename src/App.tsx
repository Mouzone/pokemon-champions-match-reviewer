import { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { AppContext } from './AppContext';
import { GlobalProgress } from './components/GlobalProgress';
import Home from './pages/Home';
import TeamsManager from './pages/TeamsManager';



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

  return (
    <AppContext.Provider value={{ isDrawerOpen, setIsDrawerOpen }}>
      <Router>
        <div className="app-container">
          <NavigationDrawer />

          <main className="content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/teams" element={<TeamsManager />} />
            </Routes>
          </main>
          <GlobalProgress />
        </div>
      </Router>
    </AppContext.Provider>
  );
}

export default App;
