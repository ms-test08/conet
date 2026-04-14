import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUserSession } from "@/lib/session";

export default async function Page() {
  const session = await getCurrentUserSession();

  if (session) {
    redirect("/my-events");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[linear-gradient(135deg,#f7f1e7_0%,#fffaf3_45%,#e8edf7_100%)] p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
