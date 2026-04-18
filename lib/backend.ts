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
  conversation_id: string | null;
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

export type BackendEventDetail = {
  id: string;
  title: string;
  category: string;
  event_image_url: string | null;
  conversation_id: string | null;
  organizer_id: string;
  event_status: string;
};

export type BackendConversationUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_pic_url: string | null;
  role?: string;
};

export type BackendConversationSummary = {
  id: string;
  type: "direct" | "group";
  other_user?: BackendConversationUser | null;
  name?: string | null;
  group_image_url?: string | null;
  created_by?: string | null;
  current_user_role?: string;
  members?: BackendConversationUser[];
  last_message?: string | null;
  last_message_media_urls?: string[];
  updated_at?: string | null;
  unread_count?: number;
};

export type BackendConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  is_read: boolean;
  media_urls: string[];
};

export type BackendConversationMessagesResponse = {
  messages?: BackendConversationMessage[];
  next_before?: string | null;
  has_more?: boolean;
};

export type BackendSendMessageResponse = {
  success?: boolean;
  message?: BackendConversationMessage;
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

export async function getConversations(
  type: "all" | "direct" | "group" = "all",
) {
  return fetchBackendJson<BackendConversationSummary[]>(
    `/conversations?type=${encodeURIComponent(type)}`,
  );
}

export async function getEventById(eventId: string) {
  return fetchBackendJson<{ success?: boolean; event: BackendEventDetail }>(
    `/events/${encodeURIComponent(eventId)}`,
  );
}

export async function getConversationMessages(
  conversationId: string,
  options?: { before?: string | null; limit?: number },
) {
  const searchParams = new URLSearchParams();
  const limit = options?.limit ?? 20;
  searchParams.set("limit", String(limit));

  if (options?.before) {
    searchParams.set("before", options.before);
  }

  return fetchBackendJson<BackendConversationMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${searchParams.toString()}`,
  );
}

export async function sendConversationMessage(
  conversationId: string,
  content: string,
) {
  return fetchBackendJson<BackendSendMessageResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );
}

export async function getRegistrationTicket(eventId: string) {
  return fetchBackendJson<BackendListResponse<BackendRegistrationTicket>>(
    `/events/${encodeURIComponent(eventId)}/registration-info`,
  );
}

export { BackendRequestError };
