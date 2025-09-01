# Tailwind CSS v3.4.17 가이드

## ✅ **안정적인 v3.4.17 버전 사용**

이 프로젝트는 **Tailwind CSS v3.4.17**을 사용합니다. 안정적이고 검증된 버전으로 Vercel 등 모든 플랫폼에서 문제없이 작동합니다.

## 📚 **공식 자료**

- [Tailwind CSS v3 문서](https://tailwindcss.com/docs)
- [Tailwind CSS v3 설치 가이드](https://tailwindcss.com/docs/installation)

## 🔧 **설치 및 설정**

### **1. 패키지 설치**

```bash
npm install -D tailwindcss@3.4.17 postcss autoprefixer
```

**중요**: 안정적인 v3.4.17 버전을 사용합니다.

### **2. PostCSS 설정**

**파일**: `postcss.config.mjs`

```javascript
const config = {
  plugins: ["tailwindcss", "autoprefixer"],
};

export default config;
```

**중요**:

- `.mjs` 확장자 사용 (ES 모듈)
- `plugins`는 배열 형태 (`["tailwindcss", "autoprefixer"]`)
- `tailwindcss`와 `autoprefixer` 모두 필요

### **3. Tailwind 설정 파일 생성**

**파일**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 커스텀 색상 정의
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

### **4. CSS에서 Tailwind 가져오기**

**파일**: `src/app/globals.css`

```css
/* Tailwind CSS v3 지시자 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 커스텀 스타일 */
@layer components {
  .my-component {
    @apply bg-blue-500 text-white p-4 rounded-lg;
  }
}
```

**중요**:

- `@tailwind base; @tailwind components; @tailwind utilities;` 사용
- v4의 `@import "tailwindcss"` 사용 안 함

## ✅ **v3에서 사용하는 것들**

### **설정 파일**

- ✅ `tailwind.config.js` - 필수 (content 배열 설정)
- ✅ `tailwind.config.ts` - TypeScript 지원

### **명령어**

- ✅ `npx tailwindcss init` - 설정 파일 생성
- ✅ `npx tailwindcss init -p` - PostCSS 설정 포함 생성

### **CSS 지시어**

- ✅ `@tailwind base;` - 기본 스타일
- ✅ `@tailwind components;` - 컴포넌트 스타일
- ✅ `@tailwind utilities;` - 유틸리티 클래스

## ❌ **v3에서 사용하지 않는 것들**

### **v4 전용 기능**

- ❌ `@import "tailwindcss"` - v4 문법
- ❌ `@tailwindcss/postcss` - v4 전용 패키지
- ❌ Zero configuration - v4 전용 기능

## 🎨 **커스텀 스타일 작성**

### **컴포넌트 레이어**

```css
@layer components {
  .btn-primary {
    @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}
```

### **유틸리티 레이어**

```css
@layer utilities {
  .text-shadow {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### **베이스 레이어**

```css
@layer base {
  html {
    font-family: "Inter", system-ui, sans-serif;
  }

  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

## 🔧 **개발 도구 설정**

### **VS Code 확장**

- **Tailwind CSS IntelliSense** - 자동완성 및 미리보기
- **PostCSS Language Support** - PostCSS 파일 지원

### **설정 예시**

```json
{
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 🚨 **문제 해결**

### **일반적인 문제들**

#### **1. 스타일이 적용되지 않음**

```bash
# content 배열 확인
tailwind.config.js에서 content 경로가 올바른지 확인

# 캐시 정리
rm -rf .next
npm run dev
```

#### **2. PostCSS 오류**

```bash
# 의존성 재설치
npm install -D tailwindcss@3.4.17 postcss autoprefixer

# PostCSS 설정 확인
postcss.config.mjs 파일이 올바른지 확인
```

#### **3. 빌드 오류**

```bash
# Node.js 버전 확인
node --version  # 18.x 이상 권장

# 의존성 정리
rm -rf node_modules package-lock.json
npm install
```

### **Vercel 배포 문제**

- **빌드 성공**: v3.4.17은 Vercel에서 안정적으로 작동
- **네이티브 바이너리 없음**: lightningcss 관련 문제 없음
- **호환성**: 모든 플랫폼에서 문제없이 작동

## 📊 **성능 최적화**

### **Purge CSS 설정**

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  // 개발 환경에서만 JIT 모드 사용
  mode: process.env.NODE_ENV === "development" ? "jit" : "aot",
};
```

### **번들 크기 최적화**

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
};
```

## 🔄 **v4에서 v3로 마이그레이션**

### **주요 변경사항**

1. **패키지 변경**

   ```bash
   # v4 제거
   npm uninstall @tailwindcss/postcss tailwindcss@next

   # v3 설치
   npm install -D tailwindcss@3.4.17 postcss autoprefixer
   ```

2. **PostCSS 설정 변경**

   ```javascript
   // v4
   plugins: ["@tailwindcss/postcss"];

   // v3
   plugins: ["tailwindcss", "autoprefixer"];
   ```

3. **CSS 지시어 변경**

   ```css
   /* v4 */
   @import "tailwindcss";

   /* v3 */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. **설정 파일 추가**
   ```javascript
   // tailwind.config.js 생성
   module.exports = {
     content: ["./src/**/*.{js,ts,jsx,tsx}"],
     theme: { extend: {} },
     plugins: [],
   };
   ```

## 🎯 **v3의 장점**

- **안정성**: 검증된 버전으로 안정적인 빌드
- **호환성**: Vercel 등 모든 플랫폼에서 문제없이 작동
- **풍부한 생태계**: 다양한 플러그인과 도구 지원
- **문서화**: 완전한 문서와 커뮤니티 지원
- **성능**: 충분히 빠른 빌드 속도
- **유연성**: 설정 파일을 통한 세밀한 제어

## 📚 **추가 자료**

- [Tailwind CSS v3 설치 가이드](https://tailwindcss.com/docs/installation)
- [Tailwind CSS v3 설정 가이드](https://tailwindcss.com/docs/configuration)
- [Tailwind CSS v3 플러그인](https://tailwindcss.com/docs/plugins)
- [Vercel 배포 가이드](https://vercel.com/docs)

---

**기억하세요: Tailwind CSS v3.4.17은 안정적이고 검증된 버전입니다!** ✅
