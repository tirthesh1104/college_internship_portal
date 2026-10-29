const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...(options.headers || {}),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Token expired or invalid
      const refresh = localStorage.getItem('refresh_token');
      if (refresh && !endpoint.includes('token/refresh')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access_token', data.access);
            // Retry original request
            config.headers = {
              ...this.getHeaders(isFormData),
              ...(options.headers || {}),
            };
            const retryRes = await fetch(url, config);
            if (!retryRes.ok) throw new Error('Request failed after refresh');
            return retryRes.json();
          }
        } catch (e) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_data');
        }
      }
    }

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errJson = await response.json();
        if (typeof errJson === 'object') {
          const keys = Object.keys(errJson);
          if (keys.length > 0) {
            errorMessage = Array.isArray(errJson[keys[0]]) 
              ? `${keys[0]}: ${errJson[keys[0]][0]}` 
              : errJson.error || errJson.message || JSON.stringify(errJson);
          }
        }
      } catch {
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const filteredParams = Object.entries(params).filter(([_, v]) => v !== undefined && v !== '');
      if (filteredParams.length > 0) {
        const searchParams = new URLSearchParams();
        filteredParams.forEach(([k, v]) => searchParams.append(k, String(v)));
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: any): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();
