export function parseJsonFromMarkdown(text: string) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      return null;
    }
  }

  // JSON 블록이 없는 경우 전체 텍스트에서 JSON 추출 시도
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
