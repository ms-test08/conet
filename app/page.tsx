import { redirect } from "next/navigation";

import { getCurrentUserSession } from "@/lib/session";

export default async function Home() {
  const session = await getCurrentUserSession();

  redirect(session ? "/my-events" : "/auth/login");
}
