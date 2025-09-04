import { useAuth } from '@/app/context/AuthContext';

interface FetchApiOptions extends RequestInit {
  token?: string | null;
}

export async function fetchApi<T>(
  url: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const { token, ...restOptions } = options;
  const headers: HeadersInit = {
    ...restOptions.headers,
  };

  const hasBody = restOptions.body !== undefined && restOptions.body !== null;
  const isFormData =
    typeof FormData !== 'undefined' && restOptions.body instanceof FormData;
  if (hasBody && !isFormData) {
    (headers as Record<string, string>)['Content-Type'] =
      (headers as any)['Content-Type'] || 'application/json';
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = url;

  if (process.env.NODE_ENV !== 'production') {
    console.log('API 호출 시작:', {
      fullUrl,
      method: restOptions.method || 'GET',
    });
  }

  try {
    const response = await fetch(fullUrl, {
      ...restOptions,
      headers,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('API 응답 받음:', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    if (response.status === 401) {
      console.log('❌ 인증 실패 (401)');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Request failed with status ' + response.status,
      }));
      throw new Error(errorData.error || 'API request failed');
    }

    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('API 호출 중 에러 발생:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}
