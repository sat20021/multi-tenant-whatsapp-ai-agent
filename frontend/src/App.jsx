import { useState, useEffect } from 'react';
import { api } from './api/client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Check existing session on application mount
  const checkAuth = async () => {
    setInitializing(true);
    try {
      const data = await api.getMe();
      if (data?.user) {
        setCurrentUser(data.user);
        setCurrentTenant(data.tenant);
      } else {
        setCurrentUser(null);
        setCurrentTenant(null);
      }
    } catch {
      // 401 or unauthenticated
      setCurrentUser(null);
      setCurrentTenant(null);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = async () => {
    // Refresh auth and tenant context from /api/auth/me
    await checkAuth();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
  };

  if (initializing) {
    return (
      <div className="login-container">
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></span>
          <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Dashboard
      user={currentUser}
      tenant={currentTenant}
      onLogout={handleLogout}
    />
  );
}
