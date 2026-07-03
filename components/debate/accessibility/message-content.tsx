"use client";

import { cn } from "@/lib/utils";
import { accessibilityTextClass, splitDebateSections } from "@/lib/accessibility";
import { useAccessibility } from "@/components/debate/accessibility/accessibility-context";
import { SpeakButton } from "@/components/debate/accessibility/speak-button";

// Renders a speech message as accessible, chunked text with audio controls. AI speeches are split
// into labeled sections (Claim/Evidence/Rebuttal/Impact/Weighing) when those headers are present,
// each with its own "Listen to section" button. Student speeches render as a single readable block.
// The original content is displayed verbatim — accessibility rendering never alters the text.
export function MessageContent({ content, isStudent }: { content: string; isStudent: boolean }) {
  const { settings } = useAccessibility();
  const textClass = accessibilityTextClass(settings);
  const canRead = isStudent ? settings.readStudentAloud : settings.readAiAloud;
  const sections = isStudent ? [{ label: "Speech", text: content }] : splitDebateSections(content);
  const chunked = !isStudent && sections.length > 1;

  return (
    <div className="space-y-3">
      {chunked ? (
        sections.map((section, index) => (
          <div key={`${section.label}-${index}`} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{section.label}</span>
              {canRead ? (
                <SpeakButton
                  text={`${section.label}. ${section.text}`}
                  label="Listen to section"
                  className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
                />
              ) : null}
            </div>
            <p className={cn("whitespace-pre-wrap text-sm leading-6", textClass)}>{section.text}</p>
          </div>
        ))
      ) : (
        <p className={cn("whitespace-pre-wrap text-sm leading-6", textClass)}>{content}</p>
      )}

      {canRead ? (
        <SpeakButton
          text={content}
          label={chunked ? "Play full speech" : "Play audio"}
          className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
        />
      ) : null}
    </div>
  );
}
