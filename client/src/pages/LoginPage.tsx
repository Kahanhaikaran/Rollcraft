import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveAccessToken } from '../lib/auth';

export function LoginPage() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(identifier.trim(), password);
      saveAccessToken(res.accessToken);
      nav('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? err?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>RollCraft</h2>
      <p style={{ marginTop: 0, opacity: 0.75 }}>Sign in to continue</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Email or phone</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="e.g. admin@kitchen.com" />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        </label>
        {error ? <div style={{ color: '#b00020', fontSize: 13 }}>{error}</div> : null}
        <button disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

