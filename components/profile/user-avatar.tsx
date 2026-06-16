import { cn } from "@/lib/utils";

type UserAvatarProps = {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl"
};

function initialsFor(displayName?: string | null, username?: string | null) {
  const source = displayName?.trim() || username?.trim() || "Student";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function gradientFor(seed?: string | null) {
  const gradients = [
    "from-blue-500 to-purple-500",
    "from-cyan-500 to-blue-500",
    "from-indigo-500 to-sky-500",
    "from-purple-500 to-fuchsia-500",
    "from-emerald-500 to-blue-500"
  ];
  const value = (seed ?? "demo").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return gradients[value % gradients.length];
}

export function UserAvatar({ username, displayName, avatarUrl, size = "md", className }: UserAvatarProps) {
  const label = displayName ?? username ?? "Student profile";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${label} avatar`}
        className={cn("rounded-full border object-cover shadow-sm", sizeClass[size], className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      aria-label={`${label} avatar`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm",
        gradientFor(username ?? displayName),
        sizeClass[size],
        className
      )}
    >
      {initialsFor(displayName, username)}
    </span>
  );
}
