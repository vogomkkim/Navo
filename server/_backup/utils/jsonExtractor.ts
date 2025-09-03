/**
 * 마크다운 코드 블록에서 JSON 텍스트를 추출하는 유틸리티 함수
 * @param text 마크다운 코드 블록이 포함된 텍스트
 * @returns 정리된 JSON 텍스트
 */
export const extractJson = (text: string): string => {
  let t = text.trim();

  // 코드펜스 제거
  if (t.startsWith('```json')) t = t.slice(7);
  if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  t = t.trim();

  // 첫 '{' ~ 마지막 '}' 범위만 추출 (주변 노이즈 제거)
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    t = t.slice(start, end + 1);
  }

  return t;
};

/**
 * 마크다운 코드 블록에서 JSON을 파싱하는 유틸리티 함수
 * @param text 마크다운 코드 블록이 포함된 텍스트
 * @returns 파싱된 JSON 객체
 */
export const parseJsonFromMarkdown = <T = any>(text: string): T => {
  const jsonText = extractJson(text);
  return JSON.parse(jsonText);
};
