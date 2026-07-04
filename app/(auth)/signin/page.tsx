import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  const showDemoLogin = process.env.NODE_ENV === "development";

  return (
    <main className="arena-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          CompeteReady
        </Link>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              {showDemoLogin ? "Local dev demo enabled" : "Secure sign in"}
            </Badge>
            <CardTitle className="pt-3 text-2xl">Sign in to training</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in form...</p>}>
              <SignInForm showDemoLogin={showDemoLogin} />
            </Suspense>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              New to CompeteReady?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
