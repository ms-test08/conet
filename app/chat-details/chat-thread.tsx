"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ArrowLeft, Paperclip, SendHorizonal } from "lucide-react";

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

function resolveAvatarUrl(conversation: BackendConversationSummary) {
  if (conversation.type === "group") {
    return conversation.group_image_url?.trim() || null;
  }

  return conversation.other_user?.profile_pic_url?.trim() || null;
}

function resolveAvatarLabel(conversation: BackendConversationSummary) {
  const title = resolveConversationTitle(conversation);
  const words = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "EV";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
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
    return memberCount > 0 ? `${memberCount} members` : "Group";
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
  backHref = "/my-events",
  eventTitle,
}: {
  conversation: BackendConversationSummary;
  conversationId: string;
  currentUserId: string;
  initialMessages: BackendConversationMessage[];
  initialNextBefore: string | null;
  initialHasMore: boolean;
  backHref?: string;
  eventTitle?: string;
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

  const selfMember = useMemo(
    () => (conversation.members ?? []).find((member) => member.id === currentUserId),
    [conversation.members, currentUserId],
  );

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
  const avatarUrl = resolveAvatarUrl(conversation);
  const avatarLabel = resolveAvatarLabel(conversation);
  const currentRole =
    conversation.current_user_role?.trim().toLowerCase() ||
    selfMember?.role?.trim().toLowerCase() ||
    "member";
  const canSendMessages =
    conversation.type !== "group" || currentRole === "admin";

  const handleDraftInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

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

    if (!canSendMessages) {
      return;
    }

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden [font-family:var(--font-geist-sans)]">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-[#ececec]/95 px-3 pb-3 pt-[max(env(safe-area-inset-top),0.85rem)] backdrop-blur sm:px-4">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-slate-700 hover:bg-black/5"
          >
            <Link href={backHref} aria-label="Back to events">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br from-sky-200 to-indigo-300 text-xs font-bold text-slate-700 ring-2 ring-white/80">
              {avatarUrl ?
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                />
              : null}
              {!avatarUrl ? avatarLabel : null}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[1.08rem] font-bold leading-tight text-slate-800">
                {title}
              </p>
              <p className="truncate text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>

          {hasMore ?
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 bg-white text-xs text-slate-700"
              onClick={handleLoadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? "Loading" : "Older"}
            </Button>
          : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#ececec] px-3 pb-3 pt-2 sm:px-4">
        <div className="my-4 flex justify-center">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
            Today
          </span>
        </div>

        {messages.length === 0 ?
          <div className="mt-10 flex items-center justify-center px-6 py-12 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900">
                No messages yet
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {canSendMessages ?
                  "Send the first message to start the event conversation."
                : "Only admins can send messages in this group."}
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

            const senderBadge = senderLabel
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "P";

            return (
              <div
                key={message.id}
                className={[
                  "mt-2 flex gap-2",
                  isOwnMessage ? "items-end" : "items-start",
                ].join(" ")}
              >
                {!isOwnMessage ?
                  <div className="mt-5 grid size-7 shrink-0 place-items-center rounded-full bg-[#ddd39f] text-[10px] font-semibold text-slate-700">
                    {senderBadge}
                  </div>
                : null}

                <div className={isOwnMessage ? "max-w-[85%]" : "max-w-[78%]"}>
                  <div className="mb-1 text-xs font-semibold text-slate-500">
                    {senderLabel}
                  </div>
                  <div
                    className={[
                      "rounded-3xl px-4 py-2.5 text-sm leading-6 shadow-sm",
                      isOwnMessage ?
                        "rounded-br-md bg-slate-900 text-white"
                      : "rounded-bl-md bg-[#d9d9dd] text-slate-900",
                    ].join(" ")}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word">
                      {message.content}
                    </p>
                  </div>
                  <p className="mt-1 px-1 text-xs text-slate-400">
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
        <p className="mx-3 mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-4">
          {error}
        </p>
      : null}

      <form
        onSubmit={handleSendMessage}
        className="border-t border-black/10 bg-[#ececec] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 sm:px-4 sm:pb-4"
      >
        {!canSendMessages ?
          <p className="mb-2 text-center text-sm font-medium text-rose-500">
            Only admins can send messages in this group
          </p>
        : null}

        <div className="flex items-center gap-2 rounded-[1.4rem] bg-[#e7e7e7]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full text-slate-500 hover:bg-black/5"
            disabled
            aria-label="Attachment"
          >
            <Paperclip className="size-5" />
          </Button>

          <textarea
            id="chat-message"
            value={canSendMessages ? draft : ""}
            onChange={(event) => setDraft(event.target.value)}
            onInput={handleDraftInput}
            placeholder={
              canSendMessages ?
                "Type your message"
              : "You can only read messages in this group"
            }
            rows={1}
            readOnly={!canSendMessages}
            className="min-h-11 max-h-35 flex-1 resize-none rounded-2xl border border-transparent bg-white/85 px-4 py-2.5 text-[1.02rem] text-slate-700 outline-none placeholder:text-slate-500 focus:border-slate-300"
          />

          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0 rounded-full bg-slate-500 text-white hover:bg-slate-600"
            disabled={!canSendMessages || isSending || draft.trim().length === 0}
            aria-label="Send message"
          >
            <SendHorizonal className="size-5" />
          </Button>
        </div>

        <p className="mt-2 truncate text-center text-[11px] text-slate-400">
          Conversation ID: {conversationId} {eventTitle ? `· ${eventTitle}` : ""}
        </p>
      </form>
    </div>
  );
}

export { resolveConversationSubtitle, resolveConversationTitle };
