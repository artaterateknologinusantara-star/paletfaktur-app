"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

/** Backend mengembalikan path relatif (mis. "/uploads/logo-xxx.png") untuk file yang di-upload;
 * gabungkan dengan origin backend supaya bisa dipakai langsung di <img src>. URL absolut (http/https) dilewatkan apa adanya. */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("paletfaktur_token");
}

export function setToken(token: string) {
  window.localStorage.setItem("paletfaktur_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("paletfaktur_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/login`;
    throw new Error("Sesi berakhir, silakan login kembali.");
  }

  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return handleResponse<T>(res);
}

/** Upload file sebagai multipart/form-data (mis. logo perusahaan). Content-Type sengaja tidak
 * di-set manual supaya browser mengisi boundary multipart secara otomatis. */
export async function uploadFile<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  return handleResponse<T>(res);
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
