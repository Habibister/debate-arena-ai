// Autosave draft keys — one per debate so drafts never leak across debates. localStorage only
// (never JWT/cookies). Kept pure so key isolation is unit-testable.
export function draftKey(debateId: string): string {
  return `debatearena_draft_${debateId}`;
}
