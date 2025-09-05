import { AuthContextType } from '@/app/context/AuthContext';

/**
 * API 호출에서 발생한 에러를 처리합니다.
 * 'Unauthorized' 에러가 발생하면 로그아웃 함수를 호출합니다.
 * @param {unknown} error - catch 블록에서 받은 에러 객체
 * @param {() => void} logout - AuthContext에서 제공하는 로그아웃 함수
 */
export function handleUnauthorizedError(error: unknown, logout: () => void): void {
  if (error instanceof Error && error.message === 'Unauthorized') {
    logout();
  }
}
