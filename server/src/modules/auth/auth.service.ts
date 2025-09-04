import jwt from 'jsonwebtoken';

import { appConfig } from '@/config';
import { AppError } from '@/lib/errorHandler';
import { hashPassword, verifyPassword } from '@/lib/password';

import { AuthRepository } from './auth.repository';
import type { LoginData, RegisterData } from './auth.types';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(data: RegisterData) {
    console.log('data.email', data.email);
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new AppError(400, 'USER_EXISTS', '이미 존재하는 사용자입니다.');
    }

    const hashedPassword = await hashPassword(data.password);

    const newUser = await this.authRepository.createUser({
      email: data.email,
      password: hashedPassword,
      name: data.name ?? null,
    });

    if (!newUser || typeof (newUser as any).id !== 'string') {
      throw new AppError(
        500,
        'USER_CREATE_FAILED',
        '사용자 생성에 실패했습니다.'
      );
    }

    // newUser는 password 필드를 포함하지 않으므로, 직접 필요한 필드만 반환
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    };
  }

  async login(data: LoginData) {
    const user = await this.authRepository.findUserByEmail(data.email);
    if (
      !user ||
      typeof user.password !== 'string' ||
      user.password.length === 0
    ) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다.'
      );
    }

    const isPasswordValid = await verifyPassword(data.password, user.password);
    if (!isPasswordValid || isPasswordValid.ok !== true) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다.'
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      appConfig.jwtSecret,
      { expiresIn: '24h' }
    );

    // userWithoutPassword를 직접 구성
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    return { token, user: userWithoutPassword };
  }
}
