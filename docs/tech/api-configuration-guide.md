# API 환경 변수 사용 가이드라인

## 개요

Navo 프로젝트에서는 API 관련 환경 변수를 일관성 있게 사용하기 위한 명확한 가이드라인을 제공합니다.

## 환경 변수 표준

### 1. Frontend (Client-side)

**`NEXT_PUBLIC_API_BASE_URL`**
- **용도**: 클라이언트에서 접근 가능한 API 기본 URL
- **사용 위치**:
  - `frontend/src/lib/api.ts`
  - React 컴포넌트
  - Next.js 페이지
- **예시**: `http://localhost:8080`

### 2. Backend (Server-side)

**`API_BASE_URL`**
- **용도**: 서버에서만 접근하는 API 기본 URL
- **사용 위치**:
  - `navo/config.ts`
  - 서버 내부 설정
- **예시**: `http://localhost:8080`

### 3. Build Tools

**Next.js 설정**
- **용도**: 프론트엔드 빌드 시 API URL 주입
- **사용 위치**: `frontend/next.config.ts`
- **환경 변수**: `NEXT_PUBLIC_API_BASE_URL` 사용

## 포트 설정

### 개발 환경
- **Backend**: 3001
- **Frontend**: 3000
- **Next.js Dev Server**: 3000

### 프로덕션 환경
- **Backend**: 환경 변수 `PORT` 또는 8080
- **Frontend**: 환경 변수 `PORT` 또는 3000

## 환경 변수 파일 예시

```env
# Backend Configuration
NODE_ENV=development
PORT=8080
JWT_SECRET=your-secret-key-here

# API Configuration
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Feature Flags
ENABLE_NEW_FEATURE=false
```

## 사용 시 주의사항

### 1. Frontend에서 사용할 때
```typescript
// ✅ 올바른 사용법
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ❌ 잘못된 사용법 (클라이언트에서 접근 불가)
const API_BASE_URL = process.env.API_BASE_URL;
```

### 2. Backend에서 사용할 때
```typescript
// ✅ 올바른 사용법
baseUrl: process.env.API_BASE_URL || '',

// ❌ 잘못된 사용법 (보안상 위험)
baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
```

### 3. Next.js에서 사용할 때
```typescript
// ✅ 올바른 사용법
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// ❌ 잘못된 사용법
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
```

## 마이그레이션 체크리스트

- [x] Backend 포트를 8080으로 통일
- [x] Frontend에서 `NEXT_PUBLIC_API_BASE_URL` 사용
- [x] Backend에서 `API_BASE_URL` 사용
- [x] Next.js 설정에서 `NEXT_PUBLIC_API_BASE_URL` 사용
- [x] README 문서 업데이트
- [x] 환경 변수 가이드라인 문서화

## 문제 해결

### 1. 포트 충돌
```bash
# 포트 사용 중인지 확인
netstat -ano | findstr :8080
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <PID> /F
```

### 2. 환경 변수 로드 실패
```bash
# .env 파일 존재 확인
ls -la | grep .env

# 환경 변수 확인
echo $NEXT_PUBLIC_API_BASE_URL
echo $API_BASE_URL
```

### 3. API 연결 실패
```bash
# Backend 서버 상태 확인
curl http://localhost:3001/health

# Frontend에서 API 호출 확인
# 브라우저 개발자 도구 Network 탭 확인
```

## 참고 자료

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#processenv)
