/**
 * Bootstrap 전용 진단 로거
 * 애플리케이션 로거와 완전히 분리된 서버 상태 진단 전용 로거
 */

export const bootstrapLogger = {
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[Bootstrap] ${timestamp} INFO: ${message}`);
  },
  warn: (message: string) => {
    const timestamp = new Date().toISOString();
    console.warn(`[Bootstrap] ${timestamp} WARN: ${message}`);
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[Bootstrap] ${timestamp} ERROR: ${message}`, error);
  }
};
