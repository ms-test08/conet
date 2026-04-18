import { createClient } from "@/lib/client";

import type {
  BackendConversationMessage,
  BackendConversationMessagesResponse,
  BackendSendMessageResponse,
} from "@/lib/backend";

const DEFAULT_BACKEND_URL = "https://conet-dev.onrender.com/api";

const backendUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL
).replace(/\/$/, "");

async function getAccessToken() {
  const supabase = createClient();
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

async function fetchBackendJsonClient<T>(path: string, init?: RequestInit) {
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

    throw new Error(message);
  }

  return data as T;
}

export async function getConversationMessagesClient(
  conversationId: string,
  options?: { before?: string | null; limit?: number },
) {
  const searchParams = new URLSearchParams();
  const limit = options?.limit ?? 20;
  searchParams.set("limit", String(limit));

  if (options?.before) {
    searchParams.set("before", options.before);
  }

  return fetchBackendJsonClient<BackendConversationMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${searchParams.toString()}`,
  );
}

export async function sendConversationMessageClient(
  conversationId: string,
  content: string,
) {
  return fetchBackendJsonClient<BackendSendMessageResponse>(
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

export type { BackendConversationMessage };
