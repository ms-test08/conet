import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/server";

type AddDetailsSearchParams = Promise<{ error?: string }>;

function sanitizeUsernamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s.-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildUsernameSuggestion(args: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const first = sanitizeUsernamePart(args.firstName ?? "");
  const last = sanitizeUsernamePart(args.lastName ?? "");
  const emailSeed = sanitizeUsernamePart(args.email?.split("@")[0] ?? "");

  const base = [first, last].filter(Boolean).join("_") || emailSeed || "user";
  return base.slice(0, 20);
}

function readNameFromMetadata(userMetadata: Record<string, unknown>) {
  const given =
    typeof userMetadata.given_name === "string" ? userMetadata.given_name : "";
  const family =
    typeof userMetadata.family_name === "string" ?
      userMetadata.family_name
    : "";

  if (given || family) {
    return { firstName: given, lastName: family };
  }

  const fullName =
    typeof userMetadata.full_name === "string" ? userMetadata.full_name
    : typeof userMetadata.name === "string" ? userMetadata.name
    : "";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

async function saveGoogleDetails(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const provider = user.app_metadata?.provider;
  if (provider !== "google") {
    redirect("/my-events");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const rawLastName = String(formData.get("lastName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!firstName) {
    redirect("/auth/add-details?error=First%20name%20is%20required");
  }

  if (username.length < 3 || username.length > 20) {
    redirect(
      "/auth/add-details?error=Username%20must%20be%20between%203%20and%2020%20characters",
    );
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    redirect(
      "/auth/add-details?error=Username%20can%20only%20contain%20letters,%20numbers,%20and%20underscores",
    );
  }

  const { error } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: rawLastName || null,
      username,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      redirect("/auth/add-details?error=Username%20is%20already%20taken");
    }

    redirect(
      `/auth/add-details?error=${encodeURIComponent(error.message || "Unable to save details")}`,
    );
  }

  redirect("/my-events");
}

export default async function AddDetailsPage({
  searchParams,
}: {
  searchParams: AddDetailsSearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const provider = user.app_metadata?.provider;
  if (provider !== "google") {
    redirect("/my-events");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("first_name, last_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = userRow?.first_name ?? null;
  const lastName = userRow?.last_name ?? null;
  const username = userRow?.username ?? null;

  if (firstName && username) {
    redirect("/my-events");
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = readNameFromMetadata(metadata);

  const suggestedFirstName = firstName ?? metadataName.firstName;
  const suggestedLastName = lastName ?? metadataName.lastName;
  const suggestedUsername =
    username ??
    buildUsernameSuggestion({
      firstName: suggestedFirstName,
      lastName: suggestedLastName,
      email: user.email,
    });

  const params = await searchParams;
  const error = params.error?.trim() ?? "";

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#ececee] px-4 py-8">
      <Card className="w-full max-w-lg overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <Link
            href="/auth/login"
            className="text-lg font-semibold text-slate-700 hover:text-slate-900"
          >
            Back
          </Link>
        </div>

        <CardContent className="space-y-6 px-6 py-8">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900">
              Almost there!
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              Confirm your details to get started
            </p>
          </div>

          {error ?
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          : null}

          <form action={saveGoogleDetails} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-base font-semibold text-slate-800">
                First Name
              </span>
              <input
                name="firstName"
                defaultValue={suggestedFirstName}
                required
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base outline-none transition focus:border-slate-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-slate-800">
                Last Name <span className="font-normal">(optional)</span>
              </span>
              <input
                name="lastName"
                defaultValue={suggestedLastName}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base outline-none transition focus:border-slate-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-slate-800">
                Username
              </span>
              <input
                name="username"
                defaultValue={suggestedUsername}
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                required
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base outline-none transition focus:border-slate-500"
              />
            </label>

            <Button
              type="submit"
              className="h-13 w-full rounded-2xl bg-yellow-400 text-xl font-extrabold text-slate-900 hover:bg-yellow-300"
            >
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
