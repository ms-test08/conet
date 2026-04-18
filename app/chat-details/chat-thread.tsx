"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  type BackendConversationMessage,
  type BackendConversationSummary,
} from "@/lib/backend";
import {
  getConversationMessagesClient,
  sendConversationMessageClient,
} from "@/lib/backend-client";

function formatMessageTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDisplayName(member: {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}) {
  const fullName =
    `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
  if (fullName) return fullName;
  if (member.username?.trim()) return member.username.trim();
  return "Participant";
}

function resolveConversationTitle(conversation: BackendConversationSummary) {
  if (conversation.type === "group") {
    return conversation.name?.trim() || "Event group";
  }

  const otherUser = conversation.other_user;
  if (!otherUser) {
    return "Direct chat";
  }

  const displayName = formatDisplayName(otherUser);
  return displayName || "Direct chat";
}

function resolveConversationSubtitle(conversation: BackendConversationSummary) {
  if (conversation.type === "group") {
    const memberCount = conversation.members?.length ?? 0;
    return memberCount > 0 ? `${memberCount} members` : "Group chat";
  }

  return "Direct chat";
}

export function ChatThread({
  conversation,
  conversationId,
  currentUserId,
  initialMessages,
  initialNextBefore,
  initialHasMore,
}: {
  conversation: BackendConversationSummary;
  conversationId: string;
  currentUserId: string;
  initialMessages: BackendConversationMessage[];
  initialNextBefore: string | null;
  initialHasMore: boolean;
}) {
  const [messages, setMessages] =
    useState<BackendConversationMessage[]>(initialMessages);
  const [nextBefore, setNextBefore] = useState<string | null>(
    initialNextBefore,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOlder, startLoadingOlder] = useTransition();
  const [isSending, startSending] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastActionRef = useRef<"loadOlder" | "send" | null>(null);

  const memberById = useMemo(() => {
    return new Map(
      (conversation.members ?? []).map((member) => [member.id, member]),
    );
  }, [conversation.members]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, []);

  useEffect(() => {
    if (lastActionRef.current !== "send") {
      return;
    }

    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    lastActionRef.current = null;
  }, [messages.length]);

  const title = resolveConversationTitle(conversation);
  const subtitle = resolveConversationSubtitle(conversation);

  const handleLoadOlder = () => {
    if (!hasMore || !nextBefore || isLoadingOlder) {
      return;
    }

    startLoadingOlder(async () => {
      try {
        setError(null);
        lastActionRef.current = "loadOlder";
        const response = await getConversationMessagesClient(conversationId, {
          before: nextBefore,
          limit: 20,
        });

        const olderMessages = (response.messages ?? []).slice().reverse();
        setMessages((current) => [...olderMessages, ...current]);
        setNextBefore(response.next_before ?? null);
        setHasMore(response.has_more ?? false);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ?
            caughtError.message
          : "Unable to load older messages",
        );
      }
    });
  };

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = draft.trim();
    if (!content || isSending) {
      return;
    }

    startSending(async () => {
      try {
        setError(null);
        const response = await sendConversationMessageClient(
          conversationId,
          content,
        );
        if (response.message) {
          lastActionRef.current = "send";
          setMessages((current) => [
            ...current,
            response.message as BackendConversationMessage,
          ]);
        }
        setDraft("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ?
            caughtError.message
          : "Unable to send your message",
        );
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/80 px-4 py-3 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Conversation
          </p>
          <p className="text-lg font-extrabold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          {hasMore ?
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 text-slate-700"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? "Loading..." : "Load older"}
            </Button>
          : <span className="text-xs font-medium text-slate-400">
              Start of conversation
            </span>
          }
          <span className="text-xs text-slate-400">ID: {conversationId}</span>
        </div>
      </div>

      <div className="flex min-h-112 flex-1 flex-col gap-3 overflow-y-auto rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        {messages.length === 0 ?
          <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900">
                No messages yet
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Send the first message to start the event conversation.
              </p>
            </div>
          </div>
        : messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            const sender = memberById.get(message.sender_id);
            const senderLabel =
              isOwnMessage ? "You"
              : sender ? formatDisplayName(sender)
              : "Participant";

            return (
              <div
                key={message.id}
                className={[
                  "flex flex-col gap-1",
                  isOwnMessage ? "items-end" : "items-start",
                ].join(" ")}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {senderLabel}
                </div>
                <div
                  className={[
                    "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
                    isOwnMessage ?
                      "rounded-br-md bg-slate-900 text-white"
                    : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-900",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {message.content}
                  </p>
                  <p
                    className={[
                      "mt-2 text-[11px]",
                      isOwnMessage ? "text-white/60" : "text-slate-400",
                    ].join(" ")}
                  >
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        }
        <div ref={endRef} />
      </div>

      {error ?
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      : null}

      <form
        onSubmit={handleSendMessage}
        className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <label
          htmlFor="chat-message"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Send a message
        </label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message..."
          rows={4}
          className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className="text-xs text-slate-400">
            Press enter with the send button to post to the conversation.
          </span>
          <Button
            type="submit"
            className="rounded-full bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
            disabled={isSending || draft.trim().length === 0}
          >
            {isSending ? "Sending..." : "Send message"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { resolveConversationSubtitle, resolveConversationTitle };
