import { getCurrentUserSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/auth/login");
  }

  redirect("/my-events");
}
