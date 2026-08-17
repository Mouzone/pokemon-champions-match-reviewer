import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './AppContext';
import { GlobalProgress } from './components/GlobalProgress';
import Home from './pages/Home';
import TeamsManager from './pages/TeamsManager';
import { Login } from './components/Login';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Modal } from './components/ui/Modal';
import UploadMatch from './pages/UploadMatch';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-base)' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      isUploadModalOpen, setIsUploadModalOpen,
      isCreateTeamModalOpen, setIsCreateTeamModalOpen
    }}>
      <Router>
        {!user ? (
          <Routes>
            <Route path="/login" element={<Login onSuccess={() => {}} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <div className="app-container">
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/teams" element={<TeamsManager />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <FloatingActionMenu />
            <GlobalProgress />
            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
              <UploadMatch onSuccess={() => setIsUploadModalOpen(false)} />
            </Modal>
          </div>
        )}
      </Router>
    </AppContext.Provider>
  );
}

export default App;
