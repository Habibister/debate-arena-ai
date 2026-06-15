import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile/edit");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      displayName: true,
      name: true,
      avatarUrl: true,
      image: true,
      bio: true,
      schoolOrClub: true,
      preferredOrganization: true,
      organization: true,
      level: true
    }
  });

  if (!user) {
    redirect("/signin?callbackUrl=/profile/edit");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to profile
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
