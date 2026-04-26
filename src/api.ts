const API_URL = import.meta.env.VITE_API_URL || "";

export interface User { id: number; email: string; }
export interface ImageItem { id: number; url: string; createdAt: string; }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>("/auth/me"),
  presign: (contentType: string) =>
    request<{ uploadUrl: string; key: string }>("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({ contentType }),
    }),
  confirm: (key: string, contentType: string) =>
    request<{ image: { id: number } }>("/uploads/confirm", {
      method: "POST",
      body: JSON.stringify({ key, contentType }),
    }),
  list: () => request<{ images: ImageItem[] }>("/uploads"),
};

export async function uploadFile(file: File) {
  const { uploadUrl, key } = await api.presign(file.type);
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status}`);
  await api.confirm(key, file.type);
}
