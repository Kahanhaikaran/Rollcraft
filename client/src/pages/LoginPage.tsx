import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, DEMO_TOKEN } from '../lib/api';
import { saveAccessToken } from '../lib/auth';

export function LoginPage() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function enterDemo() {
    saveAccessToken(DEMO_TOKEN);
    nav('/', { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(identifier.trim(), password);
      saveAccessToken(res.accessToken);
      nav('/', { replace: true });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : err && typeof err === 'object' && 'error' in err
          ? String((err as { error: unknown }).error)
          : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-hero">
        <img
          src="https://images.unsplash.com/photo-1556910103-1c0275a541b5?w=800&q=80"
          alt="Kitchen"
          className="login-hero-img"
        />
        <div className="login-hero-overlay" />
        <div className="login-hero-content">
          <span className="login-hero-logo">🍞</span>
          <h1 className="login-hero-title">RollCraft</h1>
          <p className="login-hero-subtitle">
            Kitchen ops, inventory & payroll in one place.
          </p>
        </div>
      </div>
      <div className="login-form-wrap">
        <div className="login-card card">
          <h2 className="login-card-title">Welcome back</h2>
          <p className="login-card-subtitle">Sign in to your account</p>
          <form onSubmit={onSubmit} className="login-form">
            <label className="login-label">
              <span className="login-label-text">Email or phone</span>
              <input
                className="login-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin@kitchen.com"
                type="text"
                autoComplete="username"
              />
            </label>
            <label className="login-label">
              <span className="login-label-text">Password</span>
              <input
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="error-text login-error">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary login-btn"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="login-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              onClick={enterDemo}
              className="btn-secondary login-btn login-demo-btn"
            >
              Try demo (no backend needed)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
