/**
 * Generic fetch utility for API requests.
 * Automatically attaches the JWT to the Authorization header.
 */

const API_BASE_URL = '/api';

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers: customHeaders, ...customConfig } = options;

  const token = localStorage.getItem('ishpo_jwt');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    body: data ? JSON.stringify(data) : undefined,
    headers,
    ...customConfig,
  };

  const url = \`\${API_BASE_URL}\${endpoint.startsWith('/') ? endpoint : \`/\${endpoint}\`}\`;

  try {
    const response = await fetch(url, config);
    const responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, you can handle global logout here
        // localStorage.removeItem('ishpo_jwt');
        // window.location.href = '/login';
      }
      throw new Error(responseData.error || 'API request failed');
    }

    return responseData as T;
  } catch (error: any) {
    console.error(\`API Error [\${config.method} \${url}]:\`, error.message);
    throw error;
  }
}
