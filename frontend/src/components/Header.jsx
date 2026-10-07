import { useState } from 'react';
import { api } from '../api/client';

export default function Header({ user, tenant, onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      if (onLogout) onLogout();
    }
  };

  const businessName = tenant?.businessName || 'WhatsApp AI CRM';
  const userEmail = user?.email || '';

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <a
          href="https://digitalonebox.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="header-company-brand"
          title="Visit DigitalOneBox (digitalonebox.com)"
        >
          <svg className="header-logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L44 15.5L24 27L4 15.5L24 4Z" fill="#38bdf8" />
            <path d="M4 15.5L24 27V44L4 32.5V15.5Z" fill="#0284c7" />
            <path d="M44 15.5L24 27V44L44 32.5V15.5Z" fill="#10b981" />
          </svg>
          <span className="header-brand-text">
            Digital<span style={{ color: '#10b981' }}>OneBox</span>
          </span>
        </a>

        <span className="header-brand-divider">/</span>

        <div className="tenant-badge">
          <span className="tenant-indicator"></span>
          <span className="tenant-name">{businessName}</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="user-pill">
          <span>👤</span>
          <span>{userEmail}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn-logout"
          disabled={loggingOut}
          title="Sign out of current tenant"
        >
          {loggingOut ? (
            <>
              <span className="spinner" style={{ width: 12, height: 12 }}></span>
              <span>Exiting...</span>
            </>
          ) : (
            'Logout'
          )}
        </button>
      </div>
    </header>
  );
}
