import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="min-h-svh bg-linear-to-b from-[#ececec] via-[#e6e6e6] to-[#dcdcdc] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-svh w-full flex-col bg-[#efefef] shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:min-h-[90svh] sm:max-w-107.5 sm:rounded-[2.2rem] sm:border sm:border-black/10 sm:shadow-[0_34px_90px_rgba(15,23,42,0.25)]">
        <ChatThread
          conversation={pageState.conversation}
          conversationId={conversationId}
          currentUserId={session.id}
          initialMessages={messages}
          initialNextBefore={pageState.nextBefore}
          initialHasMore={pageState.hasMore}
          backHref="/my-events"
          eventTitle={pageState.eventTitle}
        />
      </div>
      <div className="mx-auto mt-4 hidden w-full max-w-107.5 sm:block">
        <Button asChild variant="outline" className="w-full rounded-full">
          <Link href="/my-events">Back to My Events</Link>
        </Button>
      </div>
    </div>
  );
}
