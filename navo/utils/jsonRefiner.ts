import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * JSON 형태인지 판단하는 함수
 */
function isJsonLike(text: string): boolean {
  const trimmed = text.trim();

  // JSON 객체 형태 확인
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return true;
  }

  // JSON 배열 형태 확인
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return true;
  }

  // 마크다운 코드 블록 내 JSON 확인
  if (trimmed.includes("```json") || trimmed.includes("```")) {
    return true;
  }

  // JSON 키-값 패턴 확인
  const jsonPattern =
    /"[^"]*"\s*:\s*("[^"]*"|true|false|null|\d+|{[^}]*}|\[[^\]]*\])/;
  return jsonPattern.test(trimmed);
}

/**
 * JSON 문자열을 정제하여 유효한 JSON으로 만드는 함수
 */
async function refineToValidJson(rawText: string): Promise<string> {
  try {
    // 1. 마크다운 코드 블록 제거
    let cleaned = rawText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .replace(/```/g, "")
      .trim();

    // 2. 앞뒤 불필요한 텍스트 제거
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    // 3. 직접 파싱 시도
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      // 파싱 실패 시 LLM을 사용한 정제
      return await refineWithLLM(cleaned);
    }
  } catch (error) {
    console.error("JSON 정제 중 오류:", error);
    throw new Error("JSON 정제 실패");
  }
}

/**
 * LLM을 사용하여 JSON을 정제하는 함수
 */
async function refineWithLLM(rawJson: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `다음 텍스트를 유효한 JSON으로 정제해주세요.
    설명이나 추가 텍스트는 제거하고 JSON만 반환해주세요.

    입력 텍스트:
    ${rawJson}

    정제된 JSON:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // 응답에서 JSON 부분만 추출
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const extractedJson = text.substring(jsonStart, jsonEnd + 1);

      // 유효성 검증
      JSON.parse(extractedJson);
      return extractedJson;
    }

    throw new Error("LLM 응답에서 유효한 JSON을 추출할 수 없음");
  } catch (error) {
    console.error("LLM을 사용한 JSON 정제 실패:", error);
    throw new Error("LLM JSON 정제 실패");
  }
}

/**
 * 자연어를 JSON으로 변환하는 함수
 */
async function convertNaturalLanguageToJson(
  naturalText: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `다음 자연어 설명을 적절한 JSON 형태로 변환해주세요.

    자연어 설명:
    ${naturalText}

    요구사항:
    1. 유효한 JSON 형식으로 반환
    2. 설명이나 추가 텍스트 없이 JSON만 반환
    3. 적절한 키-값 구조로 구성

    JSON:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // 응답에서 JSON 부분만 추출
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const extractedJson = text.substring(jsonStart, jsonEnd + 1);

      // 유효성 검증
      JSON.parse(extractedJson);
      return extractedJson;
    }

    throw new Error("LLM 응답에서 유효한 JSON을 추출할 수 없음");
  } catch (error) {
    console.error("자연어를 JSON으로 변환 실패:", error);
    throw new Error("자연어 JSON 변환 실패");
  }
}

/**
 * 메인 JSON 정제 함수
 * @param rawText 원본 텍스트
 * @returns 정제된 JSON 문자열
 */
export async function refineJsonResponse(rawText: string): Promise<string> {
  try {
    console.log("🔄 JSON 정제 시작:", { rawTextLength: rawText.length });

    // 1단계: JSON 형태인지 판단
    if (isJsonLike(rawText)) {
      console.log("📋 JSON 형태로 판단됨, 정제 시도...");

      try {
        // 2단계: 직접 파싱 시도
        JSON.parse(rawText);
        console.log("✅ 직접 파싱 성공");
        return rawText;
      } catch (parseError) {
        console.log("⚠️ 직접 파싱 실패, 정제 시도...");
        // 3단계: JSON 정제 시도
        const refined = await refineToValidJson(rawText);
        console.log("✅ JSON 정제 성공");
        return refined;
      }
    } else {
      console.log("📝 자연어로 판단됨, JSON 변환 시도...");
      // 4단계: 자연어를 JSON으로 변환
      const converted = await convertNaturalLanguageToJson(rawText);
      console.log("✅ 자연어 JSON 변환 성공");
      return converted;
    }
  } catch (error) {
    console.error("❌ JSON 정제 실패:", error);

    // 최종 폴백: 기본 JSON 구조 반환
    console.log("🔄 기본 JSON 구조로 폴백");
    return JSON.stringify({
      error: "JSON 정제 실패",
      originalText: rawText.substring(0, 100) + "...",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * JSON 응답을 안전하게 파싱하는 함수
 * @param rawText 원본 텍스트
 * @returns 파싱된 JSON 객체
 */
export async function safeJsonParse(rawText: string): Promise<any> {
  const refinedJson = await refineJsonResponse(rawText);
  return JSON.parse(refinedJson);
}

/**
 * JSON 응답이 유효한지 확인하는 함수
 * @param text 검사할 텍스트
 * @returns 유효성 여부
 */
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
