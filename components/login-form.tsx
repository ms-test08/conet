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
  const [isLoadingProvider, setIsLoadingProvider] = useState<
    "github" | "google" | null
  >(null);

  const handleSocialLogin = async (provider: "github" | "google") => {
    const supabase = createClient();
    setIsLoadingProvider(provider);
    setError(null);

    try {
      const redirectTo = new URL("/auth/oauth", window.location.origin);
      redirectTo.searchParams.set("next", "/my-events");

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
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
              onClick={() => handleSocialLogin("google")}
              disabled={isLoadingProvider !== null}
              variant="outline"
            >
              {isLoadingProvider === "google" ?
                "Connecting..."
              : "Continue with Google"}
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={() => handleSocialLogin("github")}
              disabled={isLoadingProvider !== null}
            >
              {isLoadingProvider === "github" ?
                "Logging in..."
              : "Continue with GitHub"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
