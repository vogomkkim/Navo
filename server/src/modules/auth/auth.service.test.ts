import { AppError } from '@/lib/errorHandler';
import * as passwordModule from '@/lib/password';

import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

// password.ts의 verifyPassword 함수를 모의
jest.mock('@/lib/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashedpassword'),
  verifyPassword: jest.fn().mockResolvedValue({ ok: true }),
}));

// config 모듈도 모의
jest.mock('@/config', () => ({
  appConfig: {
    jwtSecret: process.env.JWT_SECRET || 'test_jwt_secret',
  },
}));

// AuthRepository 모의(Mock) 객체 생성
const mockAuthRepository = {
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    // 각 테스트 전에 AuthService 인스턴스를 새로 생성하고 모의 객체를 주입
    authService = new AuthService(
      mockAuthRepository as unknown as AuthRepository
    );
    // 모든 모의 함수 초기화
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('이미 존재하는 이메일로 회원가입 시 에러를 발생시켜야 한다', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce({
        id: 'user123',
        email: 'mk.kim@vogoplay.com',
        password: 'hashedpassword',
        name: 'Test User',
        createdAt: new Date(),
      });

      const registerData = {
        email: 'mk.kim@vogoplay.com',
        password: 'password123',
      };

      const p = authService.register(registerData);
      await expect(p).rejects.toThrow(AppError);
      await expect(p).rejects.toHaveProperty('errorCode', 'USER_EXISTS');
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(
        'mk.kim@vogoplay.com'
      );
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it('새로운 사용자는 성공적으로 회원가입되어야 한다', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(undefined);
      mockAuthRepository.createUser.mockResolvedValueOnce({
        id: 'new-user-id',
        email: 'new@example.com',
        name: null,
        createdAt: new Date(),
        password: 'hashedpassword', // 실제 응답에서는 제외될 필드
      });

      const registerData = {
        email: 'new@example.com',
        password: 'newpassword',
      };
      const result = await authService.register(registerData);

      expect(result).toHaveProperty('id', 'new-user-id');
      expect(result).not.toHaveProperty('password'); // 비밀번호는 응답에서 제외되어야 함
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(
        'new@example.com'
      );
      expect(mockAuthRepository.createUser).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('존재하지 않는 사용자로 로그인 시 에러를 발생시켜야 한다', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(undefined);

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      await expect(authService.login(loginData)).rejects.toHaveProperty(
        'errorCode',
        'INVALID_CREDENTIALS'
      );
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com'
      );
    });

    it('잘못된 비밀번호로 로그인 시 에러를 발생시켜야 한다', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        createdAt: new Date(),
      });

      // password.ts의 verifyPassword 함수를 모의
      const verifyPasswordMock = jest.spyOn(passwordModule, 'verifyPassword');
      verifyPasswordMock.mockResolvedValueOnce({
        ok: false,
      } as passwordModule.VerifyResult);

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      await expect(authService.login(loginData)).rejects.toHaveProperty(
        'errorCode',
        'INVALID_CREDENTIALS'
      );
    });

    // JWT secret이 없어서 테스트 실패 가능성 있음. 환경변수 설정 필요.
    it('올바른 자격 증명으로 로그인 시 토큰과 사용자 정보를 반환해야 한다', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce({
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        createdAt: new Date(),
      });

      // 상단 기본 모의(verifyPassword: ok true)와 config 모의(appConfig.jwtSecret) 사용
      const loginData = {
        email: 'test@example.com',
        password: 'correctpassword',
      };
      const result = await authService.login(loginData);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });
  });
});
