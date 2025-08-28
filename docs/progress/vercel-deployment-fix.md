# Vercel 배포 문제 해결

## 문제 상황

프로젝트를 GitHub에 push하면 Vercel에서 빌드 에러가 발생했습니다:

```
Error: No Output Directory named "public" found after the Build completed
```

## 문제 분석

1. **빌드 명령어 불일치**: `package.json`의 `build` 스크립트가 백엔드만 빌드하고 프론트엔드는 빌드하지 않음
2. **출력 디렉토리 설정 오류**: `vercel.json`에서 `dist/web`을 찾고 있지만 실제로는 생성되지 않음
3. **프론트엔드 빌드 후처리 누락**: Next.js 빌드 결과를 올바른 위치로 복사하는 과정이 없음

## 해결 방법

### 1. 빌드 스크립트 수정

`package.json`의 빌드 스크립트를 수정하여 전체 프로젝트를 빌드하도록 변경:

```json
{
  "scripts": {
    "build": "npm run build:full",
    "build:full": "npm run build:server && npm run build:react && npm run copy:frontend",
    "copy:frontend": "copyfiles -u 1 \"frontend/out/**/*\" dist/web"
  }
}
```

### 2. Next.js 설정 최적화

`frontend/next.config.ts`에서 Vercel 배포를 위한 설정 추가:

```typescript
const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: "export" }),
  distDir: isDev ? ".next" : "out",
};
```

### 3. Vercel 설정 파일 생성

루트 디렉토리에 `vercel.json` 파일 생성:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/web",
  "installCommand": "npm install",
  "framework": null,
  "functions": {
    "dist/navo/**/*.js": {
      "runtime": "nodejs22.x"
    }
  }
}
```

## 빌드 프로세스

1. **데이터베이스 스키마 생성**: `npm run db:generate`
2. **백엔드 빌드**: TypeScript 컴파일 (`tsc -p config/tsconfig.json`)
3. **프론트엔드 빌드**: Next.js 정적 내보내기 (`next build`)
4. **파일 복사**: 프론트엔드 빌드 결과를 `dist/web`으로 복사

## 결과

- 빌드가 성공적으로 완료됨
- `dist/web` 디렉토리에 정적 파일들이 올바르게 배치됨
- Vercel 배포 시 올바른 출력 디렉토리를 찾을 수 있음
- **✅ 배포 성공: Vercel(프론트엔드) + Render(백엔드) 모두 정상 작동**

## 추가 해결된 문제

### Render 서버 포트 바인딩 문제

- **문제**: `No open ports detected on 0.0.0.0` 에러
- **원인**: 서버가 `localhost`에만 바인딩되어 클라우드 환경에서 포트 감지 실패
- **해결**: `host: "0.0.0.0"` 설정으로 모든 네트워크 인터페이스에 바인딩
- **결과**: Render에서 정상적으로 서버 배포 및 포트 감지 성공

## 주의사항

- Next.js의 `output: "export"` 모드 사용으로 인해 동적 라우팅 기능이 제한됨
- `redirects`와 `headers` 설정이 정적 내보내기에서는 작동하지 않음
- API 라우트는 백엔드 서버에서 처리해야 함

## 다음 단계

1. Vercel에 재배포하여 빌드 성공 확인
2. 동적 기능이 필요한 경우 서버리스 함수 또는 API 라우트 구현 검토
3. 정적 사이트와 백엔드 API 간의 연동 테스트
