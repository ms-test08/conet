import { NextResponse } from "next/server";

// The client you created from the Server-Side Auth instructions
import { createClient } from "@/lib/server";
import { getServerBaseUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = getServerBaseUrl(request);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.app_metadata?.provider === "google") {
        const { data: profile } = await supabase
          .from("users")
          .select("first_name, username")
          .eq("id", user.id)
          .maybeSingle();

        const hasFirstName = Boolean(profile?.first_name?.trim());
        const hasUsername = Boolean(profile?.username?.trim());

        if (!hasFirstName || !hasUsername) {
          next = "/auth/add-details";
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${baseUrl}/auth/error`);
}
