// API client for making HTTP requests to the backend
// Handles authentication, error handling, and base URL configuration

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

// Make HTTP request with auth
async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data: T; status: number }> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      response: {
        status: response.status,
        data,
      },
    };
  }

  return { data, status: response.status };
}

const api = {
  get: async <T = any>(endpoint: string) => {
    const result = await request<T>(endpoint, { method: 'GET' });
    return result;
  },

  post: async <T = any>(endpoint: string, body?: any) => {
    const result = await request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return result;
  },

  put: async <T = any>(endpoint: string, body?: any) => {
    const result = await request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return result;
  },

  patch: async <T = any>(endpoint: string, body?: any) => {
    const result = await request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return result;
  },

  delete: async <T = any>(endpoint: string) => {
    const result = await request<T>(endpoint, { method: 'DELETE' });
    return result;
  },
};

export default api;
