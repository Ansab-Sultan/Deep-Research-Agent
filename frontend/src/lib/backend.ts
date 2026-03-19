function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getBackendApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    return normalizeUrl(configured);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }

  throw new Error("NEXT_PUBLIC_API_BASE_URL must be set to an absolute backend /api URL in production.");
}
