"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

type AvatarUploaderProps = {
  value: string | null;
  onChange: (avatarUrl: string | null) => void;
  displayName?: string | null;
  username?: string | null;
  disabled?: boolean;
};

export function AvatarUploader({ value, onChange, displayName, username, disabled }: AvatarUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = unknown (still checking), true/false = whether image storage is configured.
  const [uploadEnabled, setUploadEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile/avatar", { method: "GET" })
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (active) setUploadEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (active) setUploadEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const uploadDisabled = disabled || uploadEnabled === false;

  async function handleFile(file: File | undefined | null) {
    if (!file) {
      return;
    }
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const result = (await response.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };
      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.error ?? "We could not upload that image. Please try again.");
      }
      onChange(result.avatarUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We could not upload that image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <UserAvatar username={username} displayName={displayName} avatarUrl={value} size="xl" />
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload profile picture"
          onClick={() => !uploadDisabled && !isUploading && inputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !uploadDisabled && !isUploading) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploadDisabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!uploadDisabled && !isUploading) {
              void handleFile(event.dataTransfer.files?.[0]);
            }
          }}
          className={cn(
            "flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm transition-colors",
            isDragging ? "border-primary bg-primary/10" : "hover:bg-muted/50",
            (uploadDisabled || isUploading) && "cursor-not-allowed opacity-70"
          )}
        >
          {isUploading ? (
            <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uploading...
            </span>
          ) : (
            <>
              <Upload className="mb-1 h-5 w-5 text-muted-foreground" aria-hidden />
              <span className="font-medium">Drop image here or click to upload</span>
              <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP · up to 2MB</span>
            </>
          )}
        </div>
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploadDisabled || isUploading}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={uploadDisabled || isUploading} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden />
          {value ? "Change photo" : "Upload photo"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>

      {uploadEnabled === false ? (
        <p className="text-sm text-muted-foreground">
          Profile photo upload is not configured yet. You can finish without a photo and add one later.
        </p>
      ) : null}

      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
