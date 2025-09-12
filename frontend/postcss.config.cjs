/*
 * ✅ TAILWIND CSS v3.4.17 PostCSS 설정
 *
 * 이 프로젝트는 안정적인 Tailwind CSS v3.4.17을 사용합니다.
 * v4에서 v3로 다운그레이드하여 Vercel 빌드 호환성을 확보했습니다.
 *
 * ✅ 올바른 설정:
 * - plugins: ["tailwindcss", "autoprefixer"] (배열 형태)
 * - .mjs 확장자 사용 (ES 모듈)
 *
 * 📚 참고: https://tailwindcss.com/docs/installation
 */

module.exports = {
  plugins: ['tailwindcss', 'autoprefixer'],
};
