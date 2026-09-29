/**
 * Login.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated frontend login screen from Supabase authentication to Django REST API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';



const API_BASE_URL = 'http://localhost:8000/api';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth(); // Remember to add: import { useAuth } from '../context/AuthContext'; at the top if it's missing!

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save the authenticated user profile locally so the website knows you are logged in
        localStorage.setItem('user', JSON.stringify(data.user));
        // 1. Keep your clean Django session key
        // 2. Mock the Supabase layout state keys to fool the template router into letting us in
        localStorage.setItem('supabase.auth.token', JSON.stringify({ currentSession: { user: data.user, access_token: "django-mock-token" } }));
        localStorage.setItem('sb-auth-token', JSON.stringify({ user: data.user, token: "django-mock-token" }));
        localStorage.setItem('isAuthenticated', 'true');
        refreshUser(); // Tells your AuthContext to update immediately before navigating

        
        // Redirect the user straight to the live auction homepage dashboard
        navigate('/');
      } else {
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      console.error('[Login] Connection error:', err);
      setError('Could not connect to the backend server.');
    } finally {
      loading && setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Login to BidZo</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Login;
