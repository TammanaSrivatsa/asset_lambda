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
export async function getAssetUploadUrl(fileName: string) {
  return apiFetch("/assets/upload-url", {
    method: "POST",
    body: JSON.stringify({
      fileName,
    }),
  });
}

export async function uploadFileToS3(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to S3");
  }
}

export async function importAssets(objectKey: string) {
  return apiFetch("/assets/import", {
    method: "POST",
    body: JSON.stringify({
      objectKey,
    }),
  });
}