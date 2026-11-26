export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export const BACKEND_ORIGIN = API_URL.startsWith('http')
  ? API_URL.replace(/\/api\/?$/, '')
  : '';

export async function apiFetch(endpoint, options = {}) {
  const { token, headers = {}, ...rest } = options;
  const activeToken = token ?? localStorage.getItem('token');

  const finalHeaders = { ...headers };
  if (rest.body && !(rest.body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (activeToken && !finalHeaders['Authorization']) {
    finalHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: finalHeaders
  });

  if (
    res.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register')
  ) {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Error HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export function resolveProtectedFileUrl(url, token) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('/uploads/')) {
    const filePart = url.split('/uploads/')[1]?.split('?')[0];
    if (!filePart) return '';
    const activeToken = token ?? localStorage.getItem('token');
    const base = `${BACKEND_ORIGIN}/uploads/${filePart}`;
    return activeToken ? `${base}?token=${encodeURIComponent(activeToken)}` : base;
  }
  return url;
}
