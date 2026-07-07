# DECISIONS

Concise decision records. Newest first. Each: date · decision · reason · consequences · status.

---

**2026-07-05 · CompeteReady is the final product name.**
Reason: clear, event-neutral across all four tracks (not debate-only). Consequences: branding replaced
the old "DebateArena" name site-wide. Status: **Implemented.**

**2026 · Classrooms/coach enrollment are optional.**
Reason: solo students must be able to practice without a coach or class code. Consequences: all core
practice works signed-in without team membership; coach tools are additive. Status: **Implemented.**

**2026 · A direct one-click path to practice exists ("Debate Now" concept).**
Reason: minimize friction from landing to practicing. Consequences: homepage "Practice Now" and nav
"Practice" route straight to `/debate`. Status: **Implemented as the direct path — but the literal
"Debate Now" label is NOT used (current labels are "Practice Now" / "Practice"). The named
"Debate Now" entry point is planned, not yet implemented.**

**2026 · Track separation is mandatory.**
Reason: presenting one org's format as another's training is dishonest and confusing. Consequences:
content filtered by track across pages/APIs/coach views; `tracks:smoke` guards it. Status: **Implemented.**

**2026 · AI-generated material must be labeled.**
Reason: students must know what is machine-generated vs. official. Consequences: generated content carries
provider tags / "AI-inferred" labels; MUN sandbox is labeled non-official. Status: **Implemented.**

**2026 · No advertising.**
Reason: ads conflict with a focused, honest learning environment. Consequences: no ad SDKs; monetization
never depends on ads. Status: **Standing policy.**

**2026 · No fake mastery / no dark patterns.**
Reason: trust is the product. Consequences: all student-facing numbers derive from real activity; mastery
must survive spaced reassessment. Status: **Implemented + enforced.**

**2026-07 · AI provider keys are server-only; all AI routes are authed + rate-limited.**
Reason: prevent secret leakage and anonymous quota abuse. Consequences: server-side `requireUser` +
`enforceRateLimit` on every AI route; `security:smoke` enforces it. Status: **Implemented.**

**2026 · Preview before Production.**
Reason: verify behavior before shipping to real users. Consequences: changes are verified in a running
environment before deploy; deploys are manual/approved. Status: **Standing practice.**

**2026 · Advanced/uncertain features ship behind honest degradation or feature gating.**
Reason: never present unfinished or unsourced work as complete/official. Consequences: e.g. weighted
scoring activates only when data is sourced; unsourced specs stay placeholder and labeled. Status:
**Standing practice.**

**2026-07-05 · Season-versioned content with sourced-vs-placeholder provenance.**
Reason: competition rules change yearly; stale data must never masquerade as current. Consequences: specs
carry a season + verification status; check a source's real date before calling it current. Status:
**Implemented.**
