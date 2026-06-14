import Link from "next/link";
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
          DebateArena AI
        </Link>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              {showDemoLogin ? "Local dev demo enabled" : "Secure sign in"}
            </Badge>
            <CardTitle className="pt-3 text-2xl">Sign in to training</CardTitle>
          </CardHeader>
          <CardContent>
            <SignInForm showDemoLogin={showDemoLogin} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
