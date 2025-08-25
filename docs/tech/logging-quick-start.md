# 로그 시스템 빠른 설정 가이드

## 🚀 즉시 로그 정리하기

### 1. 기본 설정 (권장)

```bash
# .env 파일에 추가
LOG_LEVEL=info
LOG_STATIC_ASSETS=false
```

### 2. 개발용 설정

```bash
# .env 파일에 추가
LOG_LEVEL=info
LOG_STATIC_ASSETS=false
LOG_API_ROUTES=info
LOG_HEALTH_CHECKS=debug
```

### 3. 프로덕션용 설정

```bash
# .env 파일에 추가
LOG_LEVEL=warn
LOG_STATIC_ASSETS=false
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
```

## 📊 로그 레벨별 출력 내용

| 레벨    | 설명               | 예시                                   |
| ------- | ------------------ | -------------------------------------- |
| `error` | 에러만             | 데이터베이스 연결 실패, 서버 시작 실패 |
| `warn`  | 경고 + 에러        | 느린 요청, 4xx/5xx 에러                |
| `info`  | 정보 + 경고 + 에러 | API 요청, 인증 시도, 서버 시작         |
| `debug` | 모든 로그          | PostgreSQL 파라미터, 상세 디버그 정보  |

## 🎯 주요 환경 변수

```bash
# 로그 레벨 전체 제어
LOG_LEVEL=info

# 정적 자산 로깅 (CSS, JS, 이미지)
LOG_STATIC_ASSETS=false

# 요청/응답 로깅 전체 제어
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true

# 느린 요청 임계값 (밀리초)
SLOW_REQUEST_THRESHOLD=1000
```

## 🔧 현재 로그 상태 확인

```bash
# 현재 로그 레벨 확인
echo $LOG_LEVEL

# 로그 설정 확인
npm run dev
```

## 💡 팁

1. **개발 시**: `LOG_LEVEL=info`로 설정하여 필요한 정보만 보기
2. **문제 해결 시**: `LOG_LEVEL=debug`로 설정하여 모든 정보 확인
3. **프로덕션**: `LOG_LEVEL=warn`으로 설정하여 중요한 경고만 보기
4. **정적 자산**: 항상 `LOG_STATIC_ASSETS=false`로 설정하여 노이즈 제거
