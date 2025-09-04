/**
 * @file A utility to refine and correct potentially malformed JSON responses from an LLM.
 */

/**
 * Cleans up a JSON string received from an LLM.
 * It removes markdown fences, extraneous text, and trailing commas.
 * @param jsonString The potentially malformed JSON string.
 * @returns A cleaner JSON string.
 */
export async function refineJsonResponse<T>(
  jsonString: string,
): Promise<string | T> {
  try {
    // First, try a direct parse
    return JSON.parse(jsonString);
  } catch (e1) {
    try {
      // Attempt to clean the string
      let cleanedString = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      // Find the first '{' or '[' and discard anything before it
      const firstBracket = cleanedString.search(/[{[]/);
      if (firstBracket === -1) {
        throw new Error('No JSON object or array found in the string.');
      }
      cleanedString = cleanedString.substring(firstBracket);

      // Find the last '}' or ']' and discard anything after it
      const lastBracket = cleanedString.search(/}[^}]*$/);
      const lastSquareBracket = cleanedString.search(/][^\]]*$/);
      const lastIndex = Math.max(lastBracket, lastSquareBracket);
      if (lastIndex > -1) {
        cleanedString = cleanedString.substring(0, lastIndex + 1);
      }

      // Remove trailing commas from objects and arrays
      cleanedString = cleanedString.replace(/,\s*([}\]])/g, '$1');

      return JSON.parse(cleanedString);
    } catch (e2) {
      // If all else fails, return the original string for the caller to handle.
      // In the future, we could use another LLM call to fix the JSON.
      console.error('Failed to parse JSON even after cleaning:', e2);
      throw new Error('Failed to parse JSON from LLM response.');
    }
  }
}
