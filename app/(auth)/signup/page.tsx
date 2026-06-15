import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="arena-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-bold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          DebateArena AI
        </Link>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Student account
            </Badge>
            <CardTitle className="pt-3 text-2xl">Create your training profile</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Start with a student account. Coaches and admins can still use the seeded demo accounts while team tools expand.
            </p>
          </CardHeader>
          <CardContent>
            <SignUpForm />
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/signin" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
