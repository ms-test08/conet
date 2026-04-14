const removeTrailingSlash = (value: string) => value.replace(/\/$/, "");

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
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  const { origin } = new URL(request.url);
  return origin;
}

export function getClientBaseUrl() {
  if (typeof window !== "undefined") {
    return removeTrailingSlash(window.location.origin);
  }

  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  return "http://localhost:3000";
}
