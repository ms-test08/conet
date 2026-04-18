import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type BackendConversationSummary,
  BackendRequestError,
  getConversationMessages,
  getConversations,
  getEventById,
} from "@/lib/backend";
import { getCurrentUserSession } from "@/lib/session";

import { ChatThread } from "./chat-thread";

type ChatDetailsParams = {
  eventId?: string;
  conversationId?: string;
};

function formatConversationTitle(conversation: BackendConversationSummary) {
  if (conversation.type === "group") {
    return conversation.name?.trim() || "Event conversation";
  }

  const otherUser = conversation.other_user;
  if (!otherUser) {
    return "Direct conversation";
  }

  const fullName =
    `${otherUser.first_name ?? ""} ${otherUser.last_name ?? ""}`.trim();
  if (fullName) {
    return fullName;
  }

  return otherUser.username?.trim() || "Direct conversation";
}

function formatConversationSubtitle(conversation: BackendConversationSummary) {
  if (conversation.type === "group") {
    const memberCount = conversation.members?.length ?? 0;
    return memberCount > 0 ?
        `${memberCount} participants`
      : "Group conversation";
  }

  return "Direct conversation";
}

function buildConversationFallback(
  eventTitle: string,
  conversationId: string,
): BackendConversationSummary {
  return {
    id: conversationId,
    type: "group",
    name: eventTitle,
    group_image_url: null,
    members: [],
    last_message: null,
    last_message_media_urls: [],
    updated_at: null,
    unread_count: 0,
  };
}

function ChatDetailsErrorCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-black/10 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.1)]">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/my-events">Back to My Events</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ChatDetailsPage({
  searchParams,
}: {
  searchParams: Promise<ChatDetailsParams>;
}) {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const eventId = params?.eventId?.trim();
  const conversationId = params?.conversationId?.trim();

  if (!eventId || !conversationId) {
    return (
      <ChatDetailsErrorCard
        title="Invalid chat request"
        description="An event id and conversation id are required to open chat details."
      />
    );
  }

  let errorState: { title: string; description: string } | null = null;
  let pageState: {
    eventTitle: string;
    conversation: BackendConversationSummary;
    messages: NonNullable<
      Awaited<ReturnType<typeof getConversationMessages>>["messages"]
    >;
    nextBefore: string | null;
    hasMore: boolean;
  } | null = null;

  try {
    const [eventResponse, conversationsResponse, messagesResponse] =
      await Promise.all([
        getEventById(eventId),
        getConversations(),
        getConversationMessages(conversationId, { limit: 20 }),
      ]);

    const event = eventResponse.event;
    if (event.conversation_id && event.conversation_id !== conversationId) {
      errorState = {
        title: "Conversation mismatch",
        description:
          "The selected event is linked to a different conversation.",
      };
    } else {
      const conversation =
        conversationsResponse.find((item) => item.id === conversationId) ??
        buildConversationFallback(event.title, conversationId);

      pageState = {
        eventTitle: event.title,
        conversation,
        messages: messagesResponse.messages ?? [],
        nextBefore: messagesResponse.next_before ?? null,
        hasMore: messagesResponse.has_more ?? false,
      };
    }
  } catch (error) {
    errorState = {
      title: "Chat unavailable",
      description:
        error instanceof BackendRequestError ? error.message
        : error instanceof Error ? error.message
        : "Unable to load chat details",
    };
  }

  if (errorState) {
    return (
      <ChatDetailsErrorCard
        title={errorState.title}
        description={errorState.description}
      />
    );
  }

  if (!pageState) {
    return (
      <ChatDetailsErrorCard
        title="Chat unavailable"
        description="Unable to load chat details"
      />
    );
  }

  const messages = pageState.messages.slice().reverse();

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.14),transparent_30%),linear-gradient(180deg,#f6f0e8_0%,#edf2f7_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-black/45">
              Event chat
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              {formatConversationTitle(pageState.conversation)}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {pageState.eventTitle} ·{" "}
              {formatConversationSubtitle(pageState.conversation)}
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="rounded-full border-slate-300"
          >
            <Link href="/my-events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Events
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MessageSquareText className="h-4 w-4" />
          <span>Conversation id {conversationId}</span>
        </div>

        <ChatThread
          conversation={pageState.conversation}
          conversationId={conversationId}
          currentUserId={session.id}
          initialMessages={messages}
          initialNextBefore={pageState.nextBefore}
          initialHasMore={pageState.hasMore}
        />
      </div>
    </div>
  );
}
