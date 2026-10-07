import { useState } from 'react';
import { api } from '../api/client';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.login(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="dob-login-page">
      {/* Background ambient lighting effects */}
      <div className="dob-bg-glow glow-top-left"></div>
      <div className="dob-bg-glow glow-bottom-right"></div>
      <div className="dob-grid-overlay"></div>

      <div className="dob-login-wrapper">
        {/* LEFT COLUMN: DigitalOneBox Enterprise Showcase */}
        <div className="dob-showcase-panel">
          <div className="dob-brand-header">
            <div className="dob-logo-container">
              {/* DigitalOneBox 3D Isometric Cube Logo */}
              <svg className="dob-logo-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cubeTop" x1="24" y1="4" x2="44" y2="16" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="cubeLeft" x1="4" y1="16" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                  <linearGradient id="cubeRight" x1="44" y1="16" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* 3D Isometric Cube Facets */}
                <path d="M24 4L44 15.5L24 27L4 15.5L24 4Z" fill="url(#cubeTop)" />
                <path d="M4 15.5L24 27V44L4 32.5V15.5Z" fill="url(#cubeLeft)" />
                <path d="M44 15.5L24 27V44L44 32.5V15.5Z" fill="url(#cubeRight)" />
                {/* Inner Core Highlight */}
                <circle cx="24" cy="25" r="4.5" fill="#ffffff" opacity="0.9" filter="url(#neonGlow)" />
              </svg>
            </div>
            <div className="dob-brand-titles">
              <div className="dob-company-name">
                Digital<span className="dob-accent">OneBox</span>
              </div>
              <div className="dob-company-sub">Global AI & Software Solutions</div>
            </div>
          </div>

          <div className="dob-showcase-content">
            <div className="dob-pill-badge">
              <span className="dob-pulse-dot"></span>
              Enterprise WhatsApp AI Sales Agent
            </div>

            <h1 className="dob-hero-heading">
              Autonomous Sales Agents <br />
              <span className="dob-gradient-text">Engineered for Multi-Tenancy</span>
            </h1>

            <p className="dob-hero-desc">
              Deliver sub-second intelligent customer interactions on WhatsApp. Built with LangGraph,
              BullMQ async pipelines, and strict tenant cryptographic isolation.
            </p>

            <div className="dob-features-list">
              <div className="dob-feature-item">
                <div className="dob-feature-icon">⚡</div>
                <div className="dob-feature-text">
                  <strong>Instant Webhook Ingestion</strong>
                  <span>Queue-backed processing responding to Meta in under 200ms.</span>
                </div>
              </div>

              <div className="dob-feature-item">
                <div className="dob-feature-icon">🛡️</div>
                <div className="dob-feature-text">
                  <strong>Zero-Leak Tenant Isolation</strong>
                  <span>Tenant boundaries strictly enforced at database, prompt, and API layers.</span>
                </div>
              </div>

              <div className="dob-feature-item">
                <div className="dob-feature-icon">🧠</div>
                <div className="dob-feature-text">
                  <strong>LangGraph Conversational Intelligence</strong>
                  <span>10-message lead memory with fluent English, Hindi, and Hinglish dialogue.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dob-showcase-footer">
            <div className="dob-powered-by">
              <span>Powered by</span>
              <a
                href="https://digitalonebox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="dob-company-link"
              >
                DigitalOneBox Pvt. Ltd. ↗
              </a>
            </div>
            <div className="dob-cert-badge">SOC2 · AES-256 · ISO Ready</div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Login Form */}
        <div className="dob-form-panel">
          <div className="dob-form-card">
            <div className="dob-form-header">
              <div className="dob-portal-badge">CRM PORTAL ACCESS</div>
              <h2 className="dob-form-title">Tenant Sign In</h2>
              <p className="dob-form-subtitle">
                Access your real-time WhatsApp leads and AI conversation console
              </p>
            </div>

            {error && (
              <div className="dob-error-box">
                <span className="dob-error-icon">⚠️</span>
                <span className="dob-error-msg">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="dob-form">
              <div className="dob-input-group">
                <label className="dob-label" htmlFor="email">
                  Business Account Email
                </label>
                <div className="dob-input-wrapper">
                  <span className="dob-field-icon">✉️</span>
                  <input
                    id="email"
                    type="email"
                    className="dob-input"
                    placeholder="e.g. owner@sunrise.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="dob-input-group">
                <div className="dob-label-row">
                  <label className="dob-label" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="dob-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="dob-input-wrapper">
                  <span className="dob-field-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="dob-input"
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="dob-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18 }}></span>
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Tenant Workspace</span>
                    <span className="dob-btn-arrow">➔</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins for Evaluation */}
            <div className="dob-demo-section">
              <div className="dob-demo-divider">
                <span>OR SELECT EVALUATION TENANT</span>
              </div>

              <div className="dob-demo-grid">
                <button
                  type="button"
                  className="dob-demo-card sunrise"
                  onClick={() => fillCredentials('owner@sunrise.test', 'Sunrise@123')}
                >
                  <div className="dob-demo-header">
                    <span className="dob-demo-icon">🏢</span>
                    <span className="dob-demo-tag">TENANT A</span>
                  </div>
                  <div className="dob-demo-name">Sunrise Realty</div>
                  <div className="dob-demo-email">owner@sunrise.test</div>
                  <div className="dob-demo-hint">Real Estate · 2BHK/3BHK · Sector 62</div>
                </button>

                <button
                  type="button"
                  className="dob-demo-card fitzone"
                  onClick={() => fillCredentials('owner@fitzone.test', 'FitZone@123')}
                >
                  <div className="dob-demo-header">
                    <span className="dob-demo-icon">💪</span>
                    <span className="dob-demo-tag">TENANT B</span>
                  </div>
                  <div className="dob-demo-name">FitZone Gym</div>
                  <div className="dob-demo-email">owner@fitzone.test</div>
                  <div className="dob-demo-hint">Fitness Club · Memberships · Steam</div>
                </button>
              </div>
            </div>

            <div className="dob-security-footnote">
              <span>🔒 256-bit encrypted httpOnly JWT session</span>
              <span>·</span>
              <a
                href="https://digitalonebox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="dob-footnote-link"
              >
                digitalonebox.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
