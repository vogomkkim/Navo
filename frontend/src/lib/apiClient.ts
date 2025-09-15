import { useAuth } from '@/app/context/AuthContext';

interface FetchApiOptions extends RequestInit {
  token?: string | null;
}

// VFS Tree 타입 정의 - 서버의 projects.types.ts와 일치해야 함
export interface VfsTree {
  projectId: string;
  version: string;
  nodes: VfsNodeDto[];
}

export interface VfsNodeDto {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  hash?: string;
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

    if (response.status === 304) {
      // 304 Not Modified의 경우, 에러를 발생시켜 react-query가 캐시된 데이터를 사용하도록 유도
      throw new Error('Not Modified');
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

    // ETag를 포함한 전체 응답을 반환하도록 변경이 필요할 수 있으나,
    // 우선 react-query에서 캐시 키로 version을 사용하므로 데이터만 반환.
    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && (error as Error).message !== 'Not Modified') {
      console.error('API 호출 중 에러 발생:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

export async function fetchVfsTree(
  projectId: string,
  token: string,
  options: { includeContent?: boolean; etag?: string },
): Promise<VfsTree> {
  const { includeContent = true, etag } = options;
  const query = new URLSearchParams({
    includeContent: String(includeContent),
  });

  const headers: HeadersInit = {};
  if (etag) {
    headers['If-None-Match'] = etag;
  }

  return fetchApi<VfsTree>(`/api/projects/${projectId}/vfs?${query}`, {
    token,
    headers,
  });
}
