'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api'; // Use the base fetchApi for login/register mutations

// Define types for login and register responses
interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: { id: string; email: string; name: string };
  error?: string;
}

// Utility to generate funny names
function generateFunnyName(): string {
  const adjectives = [
    'Cosmic', 'Quantum', 'Ninja', 'Cyber', 'Mystic', 'Epic', 'Legendary', 'Galactic', 'Stealth', 'Phantom', 'Shadow', 'Thunder', 'Lightning', 'Frost', 'Flame', 'Storm', 'Void', 'Echo', 'Pulse', 'Blitz', 'Zen', 'Chaos', 'Order', 'Nova', 'Star', 'Moon', 'Sun', 'Earth',
  ];
  const nouns = [
    'Penguin', 'Dragon', 'Phoenix', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Shark', 'Whale', 'Dolphin', 'Owl', 'Hawk', 'Falcon', 'Raven', 'Warrior', 'Mage', 'Archer', 'Knight', 'Wizard', 'Sage', 'Monk', 'Ninja', 'Samurai', 'Viking', 'Pirate', 'Explorer', 'Adventurer',
  ];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
}

export default function LoginPage() {
  const { isAuthenticated, login: authLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | '' }>({ text: '', type: '' });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [namePlaceholder, setNamePlaceholder] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // useRouter().push('/') is handled by AuthContext
    }
  }, [isAuthenticated]);

  // Set initial funny name placeholder
  useEffect(() => {
    setNamePlaceholder(generateFunnyName());
  }, []);

  // Login mutation
  const { mutate: performLogin, isPending: isLoginPending } = useMutation<AuthResponse, Error, any>({
    mutationFn: async (credentials) => {
      return fetchApi<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      if (data.ok && data.token && data.user) {
        setMessage({ text: 'Login successful! Redirecting...', type: 'success' });
        authLogin(data.token, data.user);
      } else {
        setMessage({ text: data.error || 'Login failed', type: 'error' });
      }
    },
    onError: (err) => {
      setMessage({ text: err.message || 'Network error. Please try again.', type: 'error' });
    },
  });

  // Register mutation
  const { mutate: performRegister, isPending: isRegisterPending } = useMutation<AuthResponse, Error, any>({
    mutationFn: async (userData) => {
      return fetchApi<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        setMessage({ text: 'Account created successfully! You can now login.', type: 'success' });
        setActiveTab('login'); // Switch to login tab
        // Clear register form
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPassword('');
        setNamePlaceholder(generateFunnyName()); // Reset placeholder
      } else {
        setMessage({ text: data.error || 'Registration failed', type: 'error' });
      }
    },
    onError: (err) => {
      setMessage({ text: err.message || 'Network error. Please try again.', type: 'error' });
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin({ email: loginEmail, password: loginPassword });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let nameToRegister = registerName.trim();
    if (!nameToRegister) {
      nameToRegister = namePlaceholder; // Use generated name if input is empty
    }
    performRegister({ name: nameToRegister, email: registerEmail, password: registerPassword });
  };

  const handleGenerateName = () => {
    const newFunnyName = generateFunnyName();
    setRegisterName(newFunnyName);
    setNamePlaceholder(generateFunnyName()); // Update placeholder too
  };

  return (
    <div className="login-container">
      <div className="logo">
        <h1>Navo</h1>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => { setActiveTab('login'); setMessage({ text: '', type: '' }); }}>Login</button>
        <button className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => { setActiveTab('register'); setMessage({ text: '', type: '' }); }}>Register</button>
      </div>

      {/* Login Form */}
      <form id="loginForm" className={`form ${activeTab === 'login' ? 'active' : ''}`} onSubmit={handleLoginSubmit}>
        <div className="form-group">
          <label htmlFor="loginEmail">Email</label>
          <input
            type="email"
            id="loginEmail"
            name="email"
            required
            placeholder="Enter your email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="loginPassword">Password</label>
          <input
            type="password"
            id="loginPassword"
            name="password"
            required
            placeholder="Enter your password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
        </div>
        <button type="submit" id="loginBtn" disabled={isLoginPending}>
          {isLoginPending ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Register Form */}
      <form id="registerForm" className={`form ${activeTab === 'register' ? 'active' : ''}`} onSubmit={handleRegisterSubmit}>
        <div className="form-group">
          <label htmlFor="registerName">Name (Optional)</label>
          <div className="name-input-group">
            <input
              type="text"
              id="registerName"
              name="name"
              placeholder={namePlaceholder}
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
            />
            <button
              type="button"
              id="generateNameBtn"
              className="generate-name-btn"
              onClick={handleGenerateName}
            >
              Generate
            </button>
          </div>
          <small className="form-hint">Leave empty to use a random funny name</small>
        </div>
        <div className="form-group">
          <label htmlFor="registerEmail">Email</label>
          <input
            type="email"
            id="registerEmail"
            name="email"
            required
            placeholder="Enter your email"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="registerPassword">Password</label>
          <input
            type="password"
            id="registerPassword"
            name="password"
            required
            placeholder="Enter your password"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
          />
        </div>
        <button type="submit" id="registerBtn" disabled={isRegisterPending}>
          {isRegisterPending ? 'Creating account...' : 'Register'}
        </button>
      </form>

      {message.text && (
        <div id="message" className={message.type}>
          {message.text}
        </div>
      )}
    </div>
  );
}