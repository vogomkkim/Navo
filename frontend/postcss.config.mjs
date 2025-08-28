/*
 * 🚨 TAILWIND CSS v4.0 PostCSS 설정 (중요!)
 *
 * 이 프로젝트는 Tailwind CSS v4.0을 사용합니다.
 * v3와는 완전히 다른 설정 방식입니다!
 *
 * ✅ 올바른 설정:
 * - plugins: ["@tailwindcss/postcss"] (배열 형태)
 * - .mjs 확장자 사용 (ES 모듈)
 *
 * ❌ 사용하지 않는 것들:
 * - plugins: {"@tailwindcss/postcss": {}} (객체 형태 아님)
 * - .js 확장자 (CommonJS)
 * - tailwindcss 플러그인 (v3용)
 *
 * 📚 자세한 가이드: docs/tech/tailwind-css-v4-guide.md
 */

const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
