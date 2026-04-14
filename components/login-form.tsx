"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState<"google" | null>(
    null,
  );

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    setIsLoadingProvider("google");
    setError(null);

    try {
      const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      const oauthBaseUrl =
        configuredBaseUrl && configuredBaseUrl.length > 0 ?
          configuredBaseUrl
        : window.location.origin;

      const redirectTo = new URL("/auth/oauth", oauthBaseUrl);
      redirectTo.searchParams.set("next", "/my-events");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoadingProvider(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-destructive-500">{error}</p>}
            <Button
              type="button"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoadingProvider !== null}
              variant="outline"
            >
              {isLoadingProvider === "google" ?
                "Connecting..."
              : "Continue with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
