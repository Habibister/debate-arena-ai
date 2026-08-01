import { Badge } from "@/components/ui/badge";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /**
   * Heading level for this section. Defaults to `h2` — the level every current caller already
   * rendered — so the outline is unchanged unless a caller deliberately chooses otherwise. The
   * component never picks a level from context or from the page it happens to be on.
   */
  as?: "h2" | "h3" | "h4";
};

export function SectionHeading({ eyebrow, title, description, as: Heading = "h2" }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
      {/* Visual contract comes from .section-title; the semantic level stays the caller's. */}
      <Heading className="section-title mt-4">{title}</Heading>
      {description ? <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
