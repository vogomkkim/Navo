/**
 * i18n (Internationalization) Service
 * 다국어 지원을 위한 번역 서비스
 */

import { ko, TranslationKeys } from './locales/ko';
import { en } from './locales/en';

export type SupportedLocale = 'ko' | 'en';

const translations: Record<SupportedLocale, TranslationKeys> = {
  ko,
  en,
};

/**
 * 중첩된 객체에서 점 표기법으로 값을 가져오는 헬퍼 함수
 * 예: get(obj, 'workflow.planCreated') => obj.workflow.planCreated
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

/**
 * i18n 클래스
 */
export class I18n {
  private currentLocale: SupportedLocale;

  constructor(locale: SupportedLocale = 'ko') {
    this.currentLocale = locale;
  }

  /**
   * 현재 로케일 설정
   */
  setLocale(locale: SupportedLocale): void {
    if (!translations[locale]) {
      console.warn(`[i18n] Unsupported locale: ${locale}. Falling back to 'ko'.`);
      this.currentLocale = 'ko';
    } else {
      this.currentLocale = locale;
    }
  }

  /**
   * 현재 로케일 가져오기
   */
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * 번역 키로 메시지 가져오기
   * @param key - 점 표기법 키 (예: 'workflow.planCreated')
   * @param params - 템플릿 변수 (예: { name: 'John' })
   * @returns 번역된 메시지
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translation = getNestedValue(translations[this.currentLocale], key);

    if (!params) {
      return translation;
    }

    // 템플릿 변수 치환: {{name}} => John
    return translation.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() || `{{${paramKey}}}`;
    });
  }

  /**
   * 번역된 전체 객체 가져오기 (프론트엔드로 전송용)
   */
  getTranslations(): TranslationKeys {
    return translations[this.currentLocale];
  }
}

// 기본 인스턴스 생성 (싱글톤 패턴)
export const i18n = new I18n('ko'); // 기본 언어: 한국어

// 편의를 위한 단축 함수
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);

// 타입 유틸리티: 번역 키 자동완성을 위한 타입
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;
