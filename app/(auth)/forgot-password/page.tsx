import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
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
              Account recovery
            </Badge>
            <CardTitle className="pt-3 text-2xl">Forgot your password?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter your email and we will send a reset link if an account exists.
            </p>
            <ForgotPasswordForm />
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link href="/signin" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
