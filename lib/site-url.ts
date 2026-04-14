const removeTrailingSlash = (value: string) => value.replace(/\/$/, "");

const parseAbsoluteUrl = (value: string | undefined) => {
  if (!value) return null;

  try {
    return removeTrailingSlash(new URL(value).toString());
  } catch {
    return null;
  }
};

export function getServerBaseUrl(request: Request) {
  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const { origin } = new URL(request.url);
  return origin;
}

export function getClientBaseUrl() {
  const envUrl = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl) {
    return envUrl;
  }

  return removeTrailingSlash(window.location.origin);
}
