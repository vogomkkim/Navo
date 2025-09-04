'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fetchApi } from '@/lib/apiClient';

import { useAuth } from '../context/AuthContext';

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

  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
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
    // Only redirect if authentication is not loading and user is authenticated
    if (!isAuthLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Generate random funny name
  const generateFunnyName = () => {
    const adjectives = [
      '우주',
      '양자',
      '닌자',
      '사이버',
      '신비',
      '전설',
      '전설적',
      '은하',
      '스텔스',
      '팬텀',
      '그림자',
      '천둥',
      '번개',
      '서리',
      '화염',
      '폭풍',
      '공허',
      '메아리',
      '맥박',
      '번개',
      '선',
      '혼돈',
      '질서',
      '신성',
      '별',
      '달',
      '태양',
      '지구',
    ];

    const nouns = [
      '펭귄',
      '드래곤',
      '피닉스',
      '늑대',
      '독수리',
      '사자',
      '호랑이',
      '상어',
      '고래',
      '돌고래',
      '부엉이',
      '매',
      '매',
      '까마귀',
      '전사',
      '마법사',
      '궁수',
      '기사',
      '마법사',
      '현자',
      '승려',
      '닌자',
      '사무라이',
      '바이킹',
      '해적',
      '탐험가',
      '모험가',
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
      const data = await fetchApi<{
        ok: boolean;
        token?: string;
        user?: any;
        error?: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (data.ok && data.token) {
        setMessage({
          text: '로그인 성공! 리다이렉트 중...',
          type: 'success',
        });

        console.log('🔐 로그인 성공:', { token: data.token, user: data.user });
        console.log('🚀 리다이렉트 시작...');

        // Use the login function from AuthContext
        login(data.token, data.user);

        console.log('✅ login 함수 호출 완료');

        // Redirect will be handled by useEffect
      } else {
        setMessage({ text: data.error || '로그인 실패', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '네트워크 오류. 다시 시도해주세요.', type: 'error' });
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
      const data = await fetchApi<{ ok: boolean; error?: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            email: registerEmail,
            password: registerPassword,
          }),
        },
      );

      if (data.ok) {
        setMessage({
          text: '계정이 성공적으로 생성되었습니다! 이제 로그인할 수 있습니다.',
          type: 'success',
        });

        // Switch to login tab
        handleTabChange('login');
      } else {
        setMessage({
          text: data.error || '회원가입 실패',
          type: 'error',
        });
      }
    } catch (error) {
      setMessage({ text: '네트워크 오류. 다시 시도해주세요.', type: 'error' });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Navo</h1>
          <p className="text-gray-600">AI 기반 웹사이트 빌더</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-xl shadow-lg">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('login')}
            >
              로그인
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange('register')}
            >
              회원가입
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div
          className={`bg-white rounded-b-xl shadow-lg p-6 ${activeTab === 'login' ? 'block' : 'hidden'}`}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="loginEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                이메일
              </label>
              <input
                type="email"
                id="loginEmail"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                placeholder="이메일을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="loginPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="loginPassword"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {isLoggingIn ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        {/* Register Form */}
        <div
          className={`bg-white rounded-b-xl shadow-lg p-6 ${activeTab === 'register' ? 'block' : 'hidden'}`}
        >
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="registerName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                이름 (선택사항)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="registerName"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder=""
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  autoComplete="name"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 text-sm font-medium whitespace-nowrap"
                  onClick={handleGenerateName}
                >
                  생성
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                비워두면 재미있는 랜덤 이름을 사용합니다
              </p>
            </div>
            <div>
              <label
                htmlFor="registerEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                이메일
              </label>
              <input
                type="email"
                id="registerEmail"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                placeholder="이메일을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="registerPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="registerPassword"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {isRegistering ? '계정 생성 중...' : '회원가입'}
            </button>
          </form>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mt-4 p-3 rounded-md text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : message.type === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
