import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            borderRadius: '50%',
            background: 'rgba(14,165,233,0.05)',
            top: `${i * 15}%`,
            left: `${i * 18}%`,
          }} />
        ))}
      </div>

      <div style={{
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 36,
            boxShadow: '0 20px 40px rgba(14,165,233,0.3)',
          }}>
            🦷
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            DentalAgent
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            AI-Powered Appointment System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 40,
        }}>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
            Sign in to your account
          </h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@clinic.com"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontFamily: 'var(--font)',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'white',
                  fontSize: 14,
                  fontFamily: 'var(--font)',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(14,165,233,0.5)' : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                border: 'none', borderRadius: 10,
                color: 'white', fontSize: 15, fontWeight: 600,
                fontFamily: 'var(--font)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 8px 20px rgba(14,165,233,0.3)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '14px', background: 'rgba(14,165,233,0.1)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Demo credentials:</strong><br />
            Email: admin@brightsmiles.pk<br />
            Password: Admin123!
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
