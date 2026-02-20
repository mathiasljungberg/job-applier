const BASE_URL = "/api";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const body = JSON.parse(text);
      message = body.detail || JSON.stringify(body);
    } catch {
      message = text || `API error ${res.status}`;
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  upload: async <T>(path: string, file: File, extra?: Record<string, string>) => {
    const form = new FormData();
    form.append("file", file);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        form.append(k, v);
      }
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`API error ${res.status}: ${error}`);
    }
    return res.json() as Promise<T>;
  },

  healthCheck: () =>
    request<{
      status: string;
      version: string;
      llm_provider: string;
      llm_configured: boolean;
    }>("/health"),

  testLlm: () =>
    request<{
      status: string;
      provider: string;
      model?: string;
      response?: string;
      message?: string;
    }>("/llm/test"),

  getUsageSummary: () =>
    request<{
      total_calls: number;
      total_input_tokens: number;
      total_output_tokens: number;
      total_cost: number;
      by_model: Record<string, {
        calls: number;
        input_tokens: number;
        output_tokens: number;
        cost: number;
      }>;
    }>("/usage/summary"),
};
