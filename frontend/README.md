# Navo Frontend - AI Project Orchestrator Agent

## 🚀 **AI Project Orchestrator Agent**

**AI Project Orchestrator Agent**는 사용자의 프로젝트 요청을 받아 5단계 워크플로우를 통해 완성된 프로젝트를 생성하는 AI 시스템입니다.

## 🎨 **Tailwind CSS v3.4.17 설정**

### **✅ 안정적인 v3 버전 사용**

이 프로젝트는 **Tailwind CSS v3.4.17**을 사용합니다. 안정적이고 검증된 버전입니다.

### **🔧 v3 설정 방법**

```bash
# 1. 설치 (v3 패키지)
npm install -D tailwindcss@3.4.17 postcss autoprefixer

# 2. PostCSS 설정 (postcss.config.mjs)
export default {
  plugins: ["tailwindcss", "autoprefixer"],
};

# 3. CSS에서 가져오기 (globals.css)
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### **✅ v3에서 사용하는 것들**

- `tailwind.config.js` - 설정 파일 사용
- `@tailwind base; @tailwind components; @tailwind utilities;` - v3 문법
- `@layer components` - 커스텀 컴포넌트 스타일
- `@layer utilities` - 커스텀 유틸리티
- CSS에서 직접 커스텀 애니메이션 정의

### **🚀 v3의 장점**

- **안정성** - 검증된 버전으로 안정적인 빌드
- **호환성** - Vercel 등 모든 플랫폼에서 문제없이 작동
- **풍부한 생태계** - 다양한 플러그인과 도구 지원
- **문서화** - 완전한 문서와 커뮤니티 지원

## 🛠️ **설치 및 설정**

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Gemini API 설정
GEMINI_API_KEY=your_gemini_api_key_here
# API 기본 URL (백엔드 서버)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 3. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/)에서 API 키 발급
2. `.env.local` 파일에 `GEMINI_API_KEY` 설정
3. 브라우저 새로고침 후 재시도

### 4. 환경 변수 확인

```bash
# 개발 서버 실행 후 브라우저 콘솔에서 확인
console.log(process.env.GEMINI_API_KEY);
```

## 🔄 **AI Agent 워크플로우**

### **5단계 프로세스**

#### **1단계: Strategic Planner (전략 기획자)**

- 프로젝트 요구사항 분석
- 비즈니스 목표 및 타겟 오디언스 정의
- 핵심 기능 및 우선순위 설정

#### **2단계: Project Manager (프로젝트 매니저)**

- 프로젝트 계획 및 일정 수립
- 기술 스택 및 아키텍처 결정
- 리소스 할당 및 위험 관리

#### **3단계: Full-Stack Developer (풀스택 개발자)**

- 시스템 아키텍처 설계
- 데이터베이스 스키마 및 API 설계
- 프론트엔드 컴포넌트 설계

#### **4단계: Quality Assurance Engineer (QA)**

- 코드 품질 및 보안 검증
- 성능 테스트 계획
- 개선 제안 및 최적화

#### **5단계: DevOps Engineer (엔지니어)**

- 배포 환경 구축
- CI/CD 파이프라인 설정
- 모니터링 및 성능 최적화

## 🚀 **사용법**

### 1. 개발 서버 실행

```bash
npm run dev
```

### 2. AI Agent 사용

1. 브라우저에서 `http://localhost:3000` 접속
2. 채팅창에 프로젝트 요청 입력 (예: "전자상거래 웹사이트 만들어줘")
3. AI Agent가 5단계 워크플로우를 통해 프로젝트 생성
4. 각 단계별 진행 상황을 실시간으로 확인

### 3. 프로젝트 생성 예시

```
사용자: "블로그 플랫폼 만들어줘"

AI Agent 응답:
✅ Strategic Planner: 블로그 플랫폼 요구사항 분석 완료
✅ Project Manager: 프로젝트 계획 및 기술 스택 수립 완료
✅ Full-Stack Developer: 아키텍처 및 코드 설계 완료
✅ Quality Assurance Engineer: 품질 검증 및 개선 제안 완료
✅ DevOps Engineer: 배포 환경 구축 완료

🎉 프로젝트가 성공적으로 생성되었습니다!
```

## 🔧 **기술 스택**

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: **Tailwind CSS v3.4.17** (안정적)
- **AI Integration**: Google Gemini API
- **State Management**: React Hooks
- **Build Tool**: Next.js

## 📁 **프로젝트 구조**

```
frontend/
├── src/
│   ├── components/ui/
│   │   └── ChatSection.tsx          # AI Agent 메인 컴포넌트
│   ├── lib/
│   │   ├── gemini.ts                # Gemini API 클라이언트
│   │   └── api.ts                   # 백엔드 API 클라이언트
│   └── app/                         # Next.js App Router
├── postcss.config.mjs               # Tailwind CSS v3 PostCSS 설정
├── .env.local.example               # 환경 변수 예시
└── README.md                        # 이 파일
```

## 🎨 **UI/UX 특징**

- **워크플로우 진행 상황 시각화**: 각 단계별 진행 상황을 실시간으로 표시
- **역할별 메시지**: 각 AI Agent의 역할과 작업 내용을 명확히 구분
- **상태 표시**: 분석 중, 계획 수립 중, 개발 중 등 현재 상태를 직관적으로 표시
- **반응형 디자인**: 모바일과 데스크톱 모두에서 최적화된 사용자 경험

## 🚨 **문제 해결**

### Gemini API 오류

- **API 키가 설정되지 않음**: `.env.local` 파일이 프로젝트 루트에 있는지 확인
- **API 키가 유효하지 않음**: Google AI Studio에서 새로운 API 키 발급
- **할당량 초과**: API 사용량 한도 확인 및 조정
- **네트워크 오류**: 인터넷 연결 및 방화벽 설정 확인

### Tailwind CSS v3 오류

- **"Cannot apply unknown utility class"**: `tailwind.config.js`에서 `content` 배열 확인
- **"Module not found: tailwindcss/preflight"**: v3에서는 `@tailwind base; @tailwind components; @tailwind utilities;` 사용
- **빌드 오류**: `tailwindcss`, `autoprefixer` 패키지가 설치되어 있는지 확인

### 빌드 오류

- **의존성 문제**: `npm install`로 의존성 재설치
- **캐시 문제**: `.next` 폴더 삭제 후 재빌드
- **Node.js 버전**: Node.js 18 이상 사용
- **TypeScript 오류**: `npm run lint`로 코드 검사

### 런타임 오류

- **환경 변수 누락**: `.env.local` 파일 재생성
- **API 응답 오류**: 브라우저 개발자 도구에서 네트워크 탭 확인
- **메모리 부족**: 브라우저 새로고침 또는 재시작

## 🔧 **개발 환경 설정**

### 권장 개발 환경

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **브라우저**: Chrome 90+, Firefox 88+, Safari 14+
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 20.04+

### 개발 도구

- **VS Code**: 권장 확장 프로그램 설치
  - ESLint
  - Prettier
  - TypeScript Importer
  - **Tailwind CSS IntelliSense** (v3 지원)

## 🔮 **향후 계획**

- [ ] **실시간 코드 생성**: AI가 실제 코드를 생성하여 다운로드 가능
- [ ] **프로젝트 템플릿**: 자주 사용되는 프로젝트 패턴을 템플릿으로 제공
- [ ] **협업 기능**: 여러 사용자가 동시에 프로젝트에 참여
- [ ] **버전 관리**: 생성된 프로젝트의 버전 관리 및 업데이트

## 📚 **참고 자료**

- [Tailwind CSS v3 문서](https://tailwindcss.com/docs)
- [Next.js 15 문서](https://nextjs.org/docs)
- [React 19 문서](https://react.dev/)
