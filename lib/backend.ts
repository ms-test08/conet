import { createClient } from "@/lib/server";

const DEFAULT_BACKEND_URL = "https://conet-dev.onrender.com/api";

const backendUrl = (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(
  /\/$/,
  "",
);

export type BackendListResponse<T> = {
  success?: boolean;
  events?: T[];
  registration?: T;
  nextCursor?: string | null;
  hasMore?: boolean;
  pageSize?: number;
  message?: string;
};

export type BackendEventSummary = {
  id: string;
  event_image_url: string | null;
  title: string;
  category: string;
  ticket_price_type: string;
  price: number | null;
  event_start_date: string;
  venue: string | null;
  location: string | null;
  max_participant: number | null;
  registration_count: number;
  is_bookmarked: boolean;
};

export type BackendRegistrationTicket = {
  event_id: string;
  user_id: string;
  registration_id: string;
};

class BackendRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getAccessToken() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("User session is unavailable");
  }

  return accessToken;
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function fetchBackendJson<T>(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data ?
        String((data as { message?: unknown }).message ?? response.statusText)
      : response.statusText || "Request failed";

    throw new BackendRequestError(message, response.status);
  }

  return data as T;
}

export async function getMyEvents(type: string) {
  return fetchBackendJson<BackendListResponse<BackendEventSummary>>(
    `/events/my?type=${encodeURIComponent(type)}&page_size=20`,
  );
}

export async function getRegistrationTicket(eventId: string) {
  return fetchBackendJson<BackendListResponse<BackendRegistrationTicket>>(
    `/events/${encodeURIComponent(eventId)}/registration-info`,
  );
}

export { BackendRequestError };
