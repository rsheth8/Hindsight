/** Build Request objects for route handler tests. */
export function jsonRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Request {
  const headers = new Headers(init?.headers ?? {});
  let body: string | undefined;
  if (init?.body !== undefined) {
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }
  return new Request(url, { method: init?.method ?? "GET", headers, body });
}

export async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
