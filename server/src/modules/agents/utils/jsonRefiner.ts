export function refineJsonResponse<T = any>(response: unknown): T | unknown {
  if (typeof response === 'string') {
    try {
      return JSON.parse(response) as T;
    } catch {
      return response;
    }
  }
  return response as T | unknown;
}
