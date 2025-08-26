# Configuration Files

이 폴더에는 프로젝트의 모든 설정 파일들이 포함되어 있습니다.

## 파일 목록

### ✅ **현재 사용 중인 파일들**

#### 빌드 및 개발 도구

- **`webpack.config.js`** - Webpack 번들러 설정
- **`tsconfig.json`** - TypeScript 컴파일러 설정
- **`eslint.config.js`** - ESLint 린터 설정
- **`.prettierrc`** - Prettier 코드 포맷터 설정

#### 데이터베이스

- **`drizzle.config.ts`** - Drizzle ORM 설정

### ⚠️ **사용되지 않는 파일들 (선택적)**

#### 배포 설정

- **`vercel.json`** - Vercel 배포 설정 (Vercel 배포 시에만 필요)

#### 기타 설정

- **`settings.json`** - MCP 서버 설정 (AI 모델과 PostgreSQL 연결용, 현재 사용 안함)

## 사용법

프로젝트 루트에서 다음 명령어들을 사용할 수 있습니다:

```bash
# TypeScript 컴파일
npm run build:server

# Webpack 빌드
npm run build:web

# 개발 서버 실행
npm run dev

# 린팅
npm run lint

# 코드 포맷팅
npm run format

# 데이터베이스 스키마 생성
npm run db:generate
```

## 경로 참고사항

모든 설정 파일들은 `config/` 폴더에 있으므로, 상대 경로는 프로젝트 루트를 기준으로 `../`를 사용합니다.

## 파일 정리 상태

- ✅ **중복 파일 제거**: `.prettierrc.json` 삭제됨 (`.prettierrc`와 충돌)
- ⚠️ **사용되지 않는 파일**: `vercel.json`, `settings.json`은 필요에 따라 삭제 가능
- 🎯 **핵심 설정**: 빌드, 개발, 린팅 관련 설정 파일들은 모두 정상 작동
