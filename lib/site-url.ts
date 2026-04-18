const removeTrailingSlash = (value: string) => value.replace(/\/$/, "");

const firstHeaderValue = (value: string | null) => {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
};

const parseAbsoluteUrl = (value: string | undefined) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return removeTrailingSlash(new URL(trimmed).toString());
  } catch {
    try {
      return removeTrailingSlash(new URL(`https://${trimmed}`).toString());
    } catch {
      return null;
    }
  }
};

export function getServerBaseUrl(request: Request) {
  const { origin } = new URL(request.url);
  const requestOrigin = removeTrailingSlash(origin);
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );

  if (forwardedHost) {
    const forwardedProto =
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const vercelUrl = parseAbsoluteUrl(process.env.VERCEL_URL);
  if (process.env.NODE_ENV === "production" && vercelUrl) {
    return vercelUrl;
  }

  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  return requestOrigin;
}

export function getClientBaseUrl() {
  if (typeof window !== "undefined") {
    return removeTrailingSlash(window.location.origin);
  }

  const vercelUrl = parseAbsoluteUrl(process.env.VERCEL_URL);
  if (process.env.NODE_ENV === "production" && vercelUrl) {
    return vercelUrl;
  }

  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  return "http://localhost:3000";
}
