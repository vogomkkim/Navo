# Tailwind CSS v4.0 가이드

## 🚨 **중요: 이 프로젝트는 Tailwind CSS v4.0을 사용합니다!**

**v3와는 완전히 다른 설정 방식**이므로 이 가이드를 반드시 참고하세요.

## 📚 **공식 자료**

- [Tailwind CSS v4 공식 발표](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 문서](https://tailwindcss.com/docs)

## 🔧 **설치 및 설정**

### **1. 패키지 설치**

```bash
npm install -D tailwindcss@next @tailwindcss/postcss
```

**중요**: `tailwindcss@next`를 사용해야 v4를 설치할 수 있습니다.

### **2. PostCSS 설정**

**파일**: `postcss.config.mjs`

```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

**중요**:

- `.mjs` 확장자 사용 (ES 모듈)
- `plugins`는 배열 형태 (`["@tailwindcss/postcss"]`)
- 객체 형태가 아님 (`{"@tailwindcss/postcss": {}}` 아님)

### **3. CSS에서 Tailwind 가져오기**

**파일**: `src/app/globals.css`

```css
@import "tailwindcss";

/* 커스텀 스타일 */
@layer components {
  .my-component {
    @apply bg-blue-500 text-white p-4 rounded-lg;
  }
}
```

**중요**:

- `@import "tailwindcss"` 단일 라인으로 모든 기능 포함
- v3의 `@tailwind base; @tailwind components; @tailwind utilities;` 사용 안 함

## ❌ **v4에서 사용하지 않는 것들**

### **설정 파일**

- ❌ `tailwind.config.js` - 불필요 (zero configuration)
- ❌ `tailwind.config.ts` - 불필요

### **명령어**

- ❌ `npx tailwindcss init` - 작동 안 함 (bin 파일 없음)
- ❌ `npx tailwindcss init -p` - 작동 안 함

### **CSS 지시어**

- ❌ `@tailwind base;` - v3 문법
- ❌ `@tailwind components;` - v3 문법
- ❌ `@tailwind utilities;` - v3 문법

## ✅ **v4에서 사용하는 것들**

### **CSS 가져오기**

```css
@import "tailwindcss";
```

### **레이어 시스템**

```css
@layer components {
  /* 커스텀 컴포넌트 스타일 */
}

@layer utilities {
  /* 커스텀 유틸리티 */
}
```

### **커스텀 애니메이션**

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.my-element {
  animation: fadeIn 0.3s ease-in;
}
```

## 🚀 **v4의 주요 장점**

### **1. Zero Configuration**

- 설정 파일 불필요
- 자동 컨텐츠 감지
- 즉시 사용 가능

### **2. 성능 향상**

- **전체 빌드**: v3 대비 3.78배 빠름
- **증분 빌드**: v3 대비 8.8배 빠름
- **변경 없는 빌드**: v3 대비 182배 빠름 (마이크로초 단위)

### **3. CSS-First 방식**

- 설정을 CSS에서 직접 관리
- JavaScript 설정 파일 불필요
- 더 직관적인 워크플로우

### **4. 자동 컨텐츠 감지**

- `.gitignore` 자동 인식
- 바이너리 파일 자동 제외
- `@source` 지시어로 명시적 추가 가능

## 🔍 **문제 해결**

### **"Cannot apply unknown utility class" 오류**

**원인**: 커스텀 클래스가 정의되지 않음

**해결**: CSS에서 직접 정의

```css
@layer components {
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### **"Module not found: tailwindcss/preflight" 오류**

**원인**: v3 문법 사용

**해결**: v4 문법 사용

```css
/* ❌ v3 (잘못된 방식) */
@import "tailwindcss/preflight";
@tailwind utilities;

/* ✅ v4 (올바른 방식) */
@import "tailwindcss";
```

### **빌드 오류**

**원인**: 잘못된 PostCSS 설정

**해결**: 올바른 설정 확인

```javascript
// ❌ 잘못된 설정
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

// ✅ 올바른 설정
export default {
  plugins: ["@tailwindcss/postcss"],
};
```

## 📁 **프로젝트 구조**

```
frontend/
├── postcss.config.mjs          # PostCSS 설정 (v4 전용)
├── src/
│   └── app/
│       └── globals.css         # Tailwind CSS 가져오기
└── package.json                # v4 패키지 의존성
```

## 🔄 **v3에서 v4 마이그레이션**

### **1단계: 패키지 업데이트**

```bash
npm uninstall tailwindcss postcss autoprefixer
npm install -D tailwindcss@next @tailwindcss/postcss
```

### **2단계: 설정 파일 삭제**

```bash
rm tailwind.config.js
rm postcss.config.js
```

### **3단계: 새로운 설정 파일 생성**

- `postcss.config.mjs` 생성
- `globals.css`에서 `@import "tailwindcss"` 사용

### **4단계: 커스텀 스타일 수정**

- `@tailwind` 지시어를 `@import`로 변경
- 커스텀 애니메이션을 CSS로 직접 정의

## 🧪 **테스트 방법**

### **빌드 테스트**

```bash
npm run build
```

**성공 시**: "✓ Compiled successfully" 메시지

**실패 시**: 오류 메시지 확인 후 위의 문제 해결 방법 참고

### **개발 서버 테스트**

```bash
npm run dev
```

**성공 시**: Tailwind 클래스가 제대로 적용된 UI 표시

**실패 시**: 브라우저 콘솔에서 오류 메시지 확인

## 📝 **체크리스트**

- [ ] `tailwindcss@next` 패키지 설치됨
- [ ] `@tailwindcss/postcss` 패키지 설치됨
- [ ] `postcss.config.mjs` 파일 생성됨
- [ ] `globals.css`에서 `@import "tailwindcss"` 사용
- [ ] `tailwind.config.js` 파일 삭제됨
- [ ] 빌드 성공 (`npm run build`)
- [ ] 개발 서버 실행 성공 (`npm run dev`)

## 🆘 **도움이 필요할 때**

1. **이 문서 다시 읽기**
2. **공식 v4 문서 확인**: [https://tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4)
3. **프로젝트 README.md 확인**
4. **빌드 오류 메시지 분석**

---

**기억하세요: Tailwind CSS v4는 v3와 완전히 다릅니다!** 🚨

**이 가이드를 항상 참고하여 올바른 설정을 유지하세요!** 📚✨
