import { Info, ShieldUser, Smartphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackendRequestError, getRegistrationTicket } from "@/lib/backend";
import { getCurrentUserSession } from "@/lib/session";

type TicketParams = {
  eventId?: string;
  ticketId?: string;
};

function buildQrPayload(ticket: {
  event_id: string;
  user_id: string;
  registration_id: string;
}) {
  return JSON.stringify({
    event_id: ticket.event_id,
    user_id: ticket.user_id,
    registration_id: ticket.registration_id,
  });
}

export default async function ViewTicketPage({
  searchParams,
}: {
  searchParams: Promise<TicketParams>;
}) {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const eventId = params?.eventId?.trim();

  if (!eventId) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid ticket request</CardTitle>
            <CardDescription>No event id was provided.</CardDescription>
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

  try {
    const response = await getRegistrationTicket(eventId);
    const ticket = response.registration;

    if (!ticket) {
      throw new BackendRequestError("Ticket not found", 404);
    }

    const qrData = buildQrPayload(ticket);

    return (
      <div className="min-h-svh bg-[#f3f4f6] px-4 py-7">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Event ticket
              </p>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                QR Ticket
              </h1>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/my-events">Back</Link>
            </Button>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Scan at the entrance</CardTitle>
              <CardDescription>
                Show this ticket to event staff only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="mx-auto w-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-inner">
                <QRCode
                  value={qrData}
                  size={280}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 280 280"
                />
              </div>

              <div className="space-y-2 rounded-3xl bg-slate-50 px-4 py-3 text-lg text-slate-700">
                <p className="flex items-center gap-2">
                  <ShieldUser className="h-4 w-4 text-slate-500" />
                  Sensitive identifiers are hidden for your privacy.
                </p>
                <p className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  Show this screen only to event staff at entry.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm">
            <p className="flex items-center gap-2 text-xl font-semibold">
              <Info className="h-5 w-5" />
              Keep your QR private. Anyone with access to this code may attempt
              check-in on your behalf.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load your ticket";

    return (
      <div className="flex min-h-svh items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-black/10 bg-white/85 shadow-[0_20px_80px_rgba(15,23,42,0.10)]">
          <CardHeader>
            <CardTitle className="text-2xl">Ticket unavailable</CardTitle>
            <CardDescription>{message}</CardDescription>
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
}
