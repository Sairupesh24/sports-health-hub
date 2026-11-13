/**
 * Generic fetch utility for API requests.
 * Automatically attaches the JWT to the Authorization header.
 */

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!envUrl) return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

interface FetchOptions extends Omit<RequestInit, 'body'> {
  data?: unknown;
  body?: unknown;
  params?: Record<string, unknown>;
}

export async function apiFetch<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers: customHeaders, ...customConfig } = options;

  const payload = data || customConfig.body;
  const isFormData = payload instanceof FormData;
  const token = localStorage.getItem('ishpo_jwt');

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || (payload ? 'POST' : 'GET'),
    ...customConfig,
    headers,
  };

  if (payload) {
    config.body = isFormData ? payload : (typeof payload === 'string' ? payload : JSON.stringify(payload));
  }

  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  } else if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(3);
  }
  let url = `${API_BASE_URL}${cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    
    let responseData: Record<string, unknown> = {};
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Server returned a non-JSON error (${response.status}). Is the backend running?`);
        }
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, you can handle global logout here
        // localStorage.removeItem('ishpo_jwt');
        // window.location.href = '/login';
      }
      throw new Error((responseData?.error as string) || (responseData?.message as string) || `API request failed with status ${response.status}`);
    }

    return responseData as T;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`API Error [${config.method} ${url}]:`, errorMsg);
    throw error;
  }
}
