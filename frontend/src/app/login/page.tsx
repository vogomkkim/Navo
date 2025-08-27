'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<{
    text: string;
    type: 'error' | 'success' | '';
  }>({ text: '', type: '' });

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Add login-page class to body
  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Generate random funny name
  const generateFunnyName = () => {
    const adjectives = [
      'Cosmic',
      'Quantum',
      'Ninja',
      'Cyber',
      'Mystic',
      'Epic',
      'Legendary',
      'Galactic',
      'Stealth',
      'Phantom',
      'Shadow',
      'Thunder',
      'Lightning',
      'Frost',
      'Flame',
      'Storm',
      'Void',
      'Echo',
      'Pulse',
      'Blitz',
      'Zen',
      'Chaos',
      'Order',
      'Nova',
      'Star',
      'Moon',
      'Sun',
      'Earth',
    ];

    const nouns = [
      'Penguin',
      'Dragon',
      'Phoenix',
      'Wolf',
      'Eagle',
      'Lion',
      'Tiger',
      'Shark',
      'Whale',
      'Dolphin',
      'Owl',
      'Hawk',
      'Falcon',
      'Raven',
      'Warrior',
      'Mage',
      'Archer',
      'Knight',
      'Wizard',
      'Sage',
      'Monk',
      'Ninja',
      'Samurai',
      'Viking',
      'Pirate',
      'Explorer',
      'Adventurer',
    ];

    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
  };

  // Set initial placeholder with funny name
  useEffect(() => {
    setRegisterName(generateFunnyName());
  }, []);

  const handleGenerateName = () => {
    const newFunnyName = generateFunnyName();
    setRegisterName(newFunnyName);
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setMessage({ text: '', type: '' });
    // Clear forms when switching tabs
    if (tab === 'login') {
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setRegisterName(generateFunnyName());
      setRegisterEmail('');
      setRegisterPassword('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setMessage({ text: '', type: '' });

    try {
      const data = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (data.ok && data.token) {
        setMessage({
          text: 'Login successful! Redirecting...',
          type: 'success',
        });

        console.log('🔐 로그인 성공:', { token: data.token, user: data.user });
        console.log('🚀 리다이렉트 시작...');

        // Use the login function from AuthContext
        login(data.token, data.user);

        console.log('✅ login 함수 호출 완료');

        // Redirect will be handled by useEffect
      } else {
        setMessage({ text: data.error || 'Login failed', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setMessage({ text: '', type: '' });

    let name = registerName.trim();
    // If name is empty, generate a random funny name
    if (!name) {
      name = generateFunnyName();
    }

    try {
      const data = await fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: registerEmail,
          password: registerPassword,
        }),
      });

      if (data.ok) {
        setMessage({
          text: 'Account created successfully! You can now login.',
          type: 'success',
        });

        // Switch to login tab
        handleTabChange('login');
      } else {
        setMessage({
          text: data.error || 'Registration failed',
          type: 'error',
        });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-container">
      <div className="logo">
        <h1>Navo</h1>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => handleTabChange('login')}
        >
          Login
        </button>
        <button
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => handleTabChange('register')}
        >
          Register
        </button>
      </div>

      {/* Login Form */}
      <form
        className={`form ${activeTab === 'login' ? 'active' : ''}`}
        onSubmit={handleLogin}
      >
        <div className="form-group">
          <label htmlFor="loginEmail">Email</label>
          <input
            type="email"
            id="loginEmail"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="loginPassword">Password</label>
          <input
            type="password"
            id="loginPassword"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Register Form */}
      <form
        className={`form ${activeTab === 'register' ? 'active' : ''}`}
        onSubmit={handleRegister}
      >
        <div className="form-group">
          <label htmlFor="registerName">Name (Optional)</label>
          <div className="name-input-group">
            <input
              type="text"
              id="registerName"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder=""
            />
            <button
              type="button"
              className="generate-name-btn"
              onClick={handleGenerateName}
            >
              Generate
            </button>
          </div>
          <small className="form-hint">
            Leave empty to use a random funny name
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="registerEmail">Email</label>
          <input
            type="email"
            id="registerEmail"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="registerPassword">Password</label>
          <input
            type="password"
            id="registerPassword"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" disabled={isRegistering}>
          {isRegistering ? 'Creating account...' : 'Register'}
        </button>
      </form>

      {/* Message Display */}
      {message.text && <div className={message.type}>{message.text}</div>}
    </div>
  );
}
