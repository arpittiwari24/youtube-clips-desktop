// API client for backend communication

// Auth API (login, register, profile)
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';
// Caption API (transcription service)
const CAPTION_API_URL = import.meta.env.VITE_CAPTION_API_URL || 'https://api-x.subscut.com';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Get stored auth token
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Set auth token
export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Clear auth token
export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error. Please check your connection.' };
  }
}

// Auth API
export interface User {
  id: string;
  email: string;
  name: string | null;
  premium: boolean;
  planName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// User API
export async function getProfile(): Promise<ApiResponse<User>> {
  return apiRequest<User>('/api/user/profile');
}

// Caption API
export interface Caption {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface CaptionResponse {
  captions: Caption[];
}

export async function generateCaptions(
  videoBlob: Blob
): Promise<ApiResponse<CaptionResponse>> {
  const token = getToken();

  const formData = new FormData();
  formData.append('video', videoBlob, 'video.mp4');

  try {
    const response = await fetch(`${CAPTION_API_URL}/generate-captions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Caption generation failed' };
    }

    return { data };
  } catch (error) {
    return { error: 'Network error. Please check your connection.' };
  }
}

// Health check
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AUTH_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
