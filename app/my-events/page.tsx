import { CalendarDays, MapPin, MessagesSquare, Ticket } from "lucide-react";
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
import { getMyEvents, type BackendEventSummary } from "@/lib/backend";
import { createClient } from "@/lib/server";
import { getCurrentUserSession } from "@/lib/session";

const allowedTypes = ["upcoming", "past", "saved"] as const;

type EventType = (typeof allowedTypes)[number];

function resolveType(value?: string): EventType {
  if (value && allowedTypes.includes(value as EventType)) {
    return value as EventType;
  }

  return "upcoming";
}

function formatEventDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(event: BackendEventSummary) {
  if (event.ticket_price_type !== "PAID") {
    return "FREE";
  }

  return `₹${Number(event.price ?? 0).toFixed(0)}`;
}

export default async function MyEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user?.app_metadata?.provider === "google" &&
    (!session.firstName?.trim() || !session.username?.trim())
  ) {
    redirect("/auth/add-details");
  }

  const params = await searchParams;
  const type = resolveType(params?.type);
  const response = await getMyEvents(type);
  const events = response.events ?? [];

  return (
    <div className="min-h-svh bg-[#f3f4f6] px-4 py-7">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          My Events
        </h1>

        <div className="flex items-end gap-6 border-b border-slate-300/90">
          {allowedTypes.map((item) => {
            const selected = item === type;
            const label =
              item === "upcoming" ?
                `Upcoming (${events.length})`
              : item.charAt(0).toUpperCase() + item.slice(1);

            return (
              <Link
                key={item}
                href={`/my-events?type=${item}`}
                className={[
                  "border-b-4 pb-3 text-4 font-extrabold transition-colors",
                  selected ?
                    "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {events.length === 0 ?
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">No events found</CardTitle>
              <CardDescription>
                {type === "saved" ?
                  "You have no saved events yet."
                : "You are not registered for any events in this view yet."}
              </CardDescription>
            </CardHeader>
          </Card>
        : <div className="grid gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      style={
                        event.event_image_url ?
                          {
                            backgroundImage: `url(${event.event_image_url})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }
                        : undefined
                      }
                    >
                      {!event.event_image_url && (
                        <div className="flex h-full items-center justify-center text-4xl">
                          🎫
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                          {event.category}
                        </p>
                        <p className="text-4 font-bold text-slate-600">
                          {formatPrice(event)}
                        </p>
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-3 font-extrabold text-slate-900">
                        {event.title}
                      </h2>

                      <div className="mt-3 space-y-1.5 text-slate-500">
                        <div className="flex items-center gap-2 text-lg font-medium">
                          <CalendarDays className="h-4 w-4" />
                          <span>{formatEventDate(event.event_start_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-lg font-medium">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">
                            {event.venue ?? event.location ?? "Location TBA"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="h-12 flex-1 rounded-full bg-slate-900 text-base font-bold hover:bg-slate-800"
                    >
                      <Link href={`/view-ticket?eventId=${event.id}`}>
                        <Ticket className="mr-2 h-4 w-4" />
                        View Ticket
                      </Link>
                    </Button>

                    {event.conversation_id ?
                      <Button
                        asChild
                        className="h-12 flex-1 rounded-full border-slate-300 text-base font-bold text-slate-700"
                        variant="outline"
                      >
                        <Link
                          href={`/chat-details?eventId=${event.id}&conversationId=${event.conversation_id}`}
                        >
                          <MessagesSquare className="mr-2 h-4 w-4" />
                          Event Chat
                        </Link>
                      </Button>
                    : <Button
                        className="h-12 flex-1 rounded-full border-slate-300 text-base font-bold text-slate-700"
                        variant="outline"
                        disabled
                      >
                        <MessagesSquare className="mr-2 h-4 w-4" />
                        Event Chat
                      </Button>
                    }
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
