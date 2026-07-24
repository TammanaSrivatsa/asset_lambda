const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "https://l8w7k68xt5.execute-api.us-east-1.amazonaws.com";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("itsm.token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const body = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new Error(
      body?.message || body?.detail || `Request failed with status ${res.status}`,
    );
  }

  return body as T;
}

export async function apiUpload(
  path: string,
  formData: FormData,
): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const body = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    throw new Error(
      body?.message || body?.detail || `Upload failed with status ${res.status}`,
    );
  }

  return body;
}
export async function importAssets(file: File) {
  const token = getToken();

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Convert to Base64
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  const base64 = btoa(binary);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/assets/import`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      file: base64,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to import assets");
  }

  return response.json();
}
export async function getAssetTemplate() {
  const token = getToken();

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/assets/template`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("Failed to download template");
  }

  return response.blob();
}