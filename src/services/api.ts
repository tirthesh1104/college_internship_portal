import { dispatchAIErrorToast, sanitizeAIErrorForUser } from '../components/common/GlobalToastAndErrorBoundary';

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
    const isAIEndpoint =
      endpoint.includes('/ai/') ||
      endpoint.includes('/resumes/analyze') ||
      endpoint.includes('/admin/ai-config');
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...(options.headers || {}),
      },
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (netErr: any) {
      if (isAIEndpoint) {
        const sanitized = dispatchAIErrorToast(netErr?.message || 'Network error while contacting AI assistant', 503);
        throw new Error(sanitized.message);
      }
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    }

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
      let errorCode: string | undefined;
      try {
        const errJson = await response.json();
        if (typeof errJson === 'object' && errJson !== null) {
          errorCode = errJson.error_code;
          const keys = Object.keys(errJson);
          if (keys.length > 0) {
            errorMessage = Array.isArray(errJson[keys[0]]) 
              ? `${keys[0]}: ${errJson[keys[0]][0]}` 
              : errJson.error || errJson.message || 'Service request could not be completed.';
          }
        }
      } catch {
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }

      if (isAIEndpoint || response.status === 429 || response.status === 503) {
        // For student-facing AI calls, dispatch a friendly toast and sanitize the thrown error
        if (!endpoint.includes('/admin/ai-config')) {
          const sanitized = dispatchAIErrorToast(errorMessage, response.status, errorCode);
          throw new Error(sanitized.message);
        } else {
          // For admin AI config tests, still show toast on rate limit / 503 while preserving clear validation summary
          const sanitized = sanitizeAIErrorForUser(errorMessage, response.status, errorCode);
          if (response.status === 429 || response.status === 503) {
            dispatchAIErrorToast(errorMessage, response.status, errorCode);
          }
          throw new Error(errorMessage || sanitized.message);
        }
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      if (options.method && options.method !== 'GET') {
        broadcastLiveSync(endpoint);
      }
      return {} as T;
    }

    const jsonData = await response.json();
    if (options.method && options.method !== 'GET') {
      broadcastLiveSync(endpoint);
    }
    return jsonData;
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

export function broadcastLiveSync(source = 'mutation') {
  try {
    const payload = { timestamp: Date.now(), source };
    localStorage.setItem('ipts_last_sync', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ipts:data-changed', { detail: payload }));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('ipts_live_sync');
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Ignore storage/broadcast errors in restricted contexts
  }
}

export function subscribeToLiveSync(onRefresh: () => void, intervalMs = 8000): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('ipts_live_sync');
      channel.onmessage = () => {
        onRefresh();
      };
    }
  } catch {
    channel = null;
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'ipts_last_sync' || e.key === 'user_data') {
      onRefresh();
    }
  };

  const handleCustomSync = () => {
    onRefresh();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      onRefresh();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('ipts:data-changed', handleCustomSync);
  window.addEventListener('focus', handleCustomSync);
  document.addEventListener('visibilitychange', handleVisibility);

  const timer = intervalMs > 0 ? window.setInterval(onRefresh, intervalMs) : null;

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore
      }
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('ipts:data-changed', handleCustomSync);
    window.removeEventListener('focus', handleCustomSync);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (timer !== null) {
      window.clearInterval(timer);
    }
  };
}

export const api = new ApiService();

