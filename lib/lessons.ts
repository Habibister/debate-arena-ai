import type { DrillArea } from "@/lib/debate-drills";

// Authored, hand-written teaching lessons (Khan Academy / Erica Meltzer style): a plain-language
// explanation, a weak example next to a strong one on the SAME claim so the contrast is visible,
// the mistakes students actually make, and practice that feeds the EXISTING mastery system.
//
// PROVENANCE: original instructional writing — not reproduced from any published curriculum, and not
// official competition guidance. Examples are illustrative; the lesson tells students to verify their
// own evidence before using it competitively. Practice records real MasteryProgress through the
// existing drills pipeline (recordDrillMastery), never a parallel scorekeeper.

import type { SourceFreshnessMetadata } from "@/lib/source-freshness";

export type LessonPart = { term: string; plain: string; example: string };

export type AuthoredLesson = {
  slug: string;
  track: "debate";
  organization: "DEBATE";
  // Mastery target: must resolve to a seeded Skill via the drill-area map. Practice writes here.
  skillSlug: string;
  skillLabel: string;
  // Practice questions come from this existing drill area (no new question bank).
  drillArea: DrillArea;
  title: string;
  subtitle: string;
  estimatedMinutes: number;

  // (1) What it is
  whatItIs: { intro: string; parts: LessonPart[]; closer: string };

  // (2) + (3): the SAME claim argued weakly then strongly, so only the reasoning quality changes.
  sharedClaim: string;
  weak: { text: string; reasons: string[] };
  strong: { text: string; reasons: string[]; honestyNote: string };

  // Incremental revision: the SAME warrant improved step by step, each pass fixing the weakness an
  // opponent would attack — so students see HOW to cross the gap, not just the two endpoints.
  revisionLadder: { intro: string; steps: Array<{ label: string; warrant: string; note: string }> };

  // Show, don't tell: a vague piece of support rewritten to be specific, with exactly what changed.
  evidenceUpgrade: { intro: string; vague: string; specific: string; whatChanged: string[]; honestyNote: string };

  // Misconception repair: name the wrong mental model students hold about warrants and correct it.
  misconception: { name: string; wrongModel: string; whyWrong: string; rightModel: string };

  // (4) the 2-3 things students actually get wrong
  commonMistakes: Array<{ title: string; explanation: string; fix: string }>;

  // (5) practice — served from the existing drill bank, graded + recorded by the existing pipeline
  practice: { intro: string; questionCount: number };

  // Optional video slot — empty for now. `url: null` renders an honest placeholder, never a fake embed.
  video: { url: string | null; caption: string };

  // Honest framing (teaching material, not official rules).
  provenanceNote: string;
  /**
   * Structured provenance for the shared source indicator (M9). Lives with the lesson data so no
   * renderer restates a source, a season, or a verification date.
   */
  provenance: SourceFreshnessMetadata;
};

const claimWarrantImpact: AuthoredLesson = {
  slug: "claim-warrant-impact",
  track: "debate",
  organization: "DEBATE",
  skillSlug: "debate-claim-building",
  skillLabel: "Claim Building",
  drillArea: "claim-warrant-impact",
  title: "Claim, Warrant, Impact",
  subtitle: "The three-part shape of every argument a judge can actually vote on.",
  estimatedMinutes: 12,

  whatItIs: {
    intro:
      "Almost every argument you make in a round is three moves stacked together. Beginners usually say the first move and stop. Judges vote on all three. Once you can see the three parts, you can hear exactly what an argument is missing — your own or your opponent's.",
    parts: [
      {
        term: "Claim",
        plain: "The position you want the judge to accept. It should be specific enough to argue about.",
        example: "“Schools should start the day after 8:30 a.m.”"
      },
      {
        term: "Warrant",
        plain:
          "The reason the claim is true — the logic that connects “what I say” to “why you should believe it.” This is the part beginners skip. A warrant explains a mechanism: it names the cause-and-effect step that makes the claim follow.",
        example:
          "“During puberty a teenager’s body clock shifts about two hours later, so a 7 a.m. bell asks them to focus during what is biologically the middle of their night — and they can’t just fall asleep earlier to make it up.”"
      },
      {
        term: "Impact",
        plain:
          "Why it matters to the round: who is affected, how badly, and how many. The impact is your answer to the judge’s silent question, “so what?”",
        example:
          "“Chronic sleep loss raises teen car-crash and depression rates, so a later start prevents real, physical harm to thousands of students a year.”"
      }
    ],
    closer:
      "A claim with no warrant is just an assertion — the judge could assert the opposite just as easily. A claim and warrant with no impact proves the point is true but never says why it should decide the round. You need all three: a position, a reason it’s true, and a reason it matters.\n\nQuick self-check on anything you write: are all of your sentences claims, or did you explain why one claim leads to the next? If every sentence could stand alone as its own assertion, the connecting reasoning is still missing."
  },

  sharedClaim: "Schools should start the day after 8:30 a.m.",
  weak: {
    text:
      "Schools should start later because it’s better for students. Starting so early is bad, and students don’t like it. A later start would really help everyone.",
    reasons: [
      "The warrant is circular. “It’s better” and “early is bad” just restate the claim in new words — they never say WHY. There’s no mechanism, so a judge can’t tell this apart from the opposite assertion.",
      "“Students don’t like it” is a preference, not a reason. Plenty of good policies are unpopular; popularity doesn’t prove the claim is right.",
      "The impact is vague. “Help everyone” tells the judge nothing they can weigh — helped how, who exactly, and how much?"
    ]
  },
  strong: {
    text:
      "Schools should start after 8:30 a.m. During puberty, adolescents’ internal clocks shift roughly two hours later, so a 7 a.m. bell asks them to concentrate during what is biologically their night — and they can’t simply sleep earlier to compensate. That sleep loss is the mechanism behind the later-start recommendation from groups like the American Academy of Pediatrics, and districts that pushed their start times back reported fewer teen car crashes and better attendance. So a later start isn’t about comfort — it prevents measurable, physical harm to thousands of students every year.",
    reasons: [
      "The warrant is a mechanism, not a restatement. It walks the judge through a causal chain — puberty shifts the body clock → an early bell forces sleep at the wrong biological time → that sleep can’t be recovered — so the judge can follow WHY the claim is true, step by step.",
      "Evidence is attached to the reasoning, not name-dropped. The pediatric recommendation is used to back the mechanism, not just to sound authoritative.",
      "The impact is concrete and weighable: fewer crashes, better attendance, “thousands of students,” “measurable, physical harm.” The judge is told who is affected and how much, so it can be compared against the other side.",
      "Notice what changed: it’s the SAME claim as the weak version. Only the warrant and impact got better — and that is the entire skill."
    ],
    honestyNote:
      "Illustrative argument. The pediatric recommendation is real, but always find and verify your own current evidence before using specifics in a round — a warrant is only as strong as the support you can actually defend."
  },

  revisionLadder: {
    intro:
      "You don’t leap from the weak version to the strong one — you revise. Watch the SAME warrant get better in three passes. Each pass fixes the exact weakness an opponent would have attacked in the pass before.",
    steps: [
      {
        label: "Draft 1 — a restatement",
        warrant: "“…because a later start is better for students.”",
        note: "Not a warrant yet: “better” just repeats the claim. The opponent says “prove it,” and you have nothing to point to. Next fix: name the actual harm."
      },
      {
        label: "Draft 2 — names the harm, not the cause",
        warrant: "“…because teenagers don’t get enough sleep when school starts at 7 a.m.”",
        note: "Better — there’s a real harm now (lost sleep). But it doesn’t say WHY teens can’t just go to bed earlier, so the opponent answers “then set an earlier bedtime.” You’ve named the problem, not the mechanism. Next fix: the cause."
      },
      {
        label: "Draft 3 — a causal mechanism",
        warrant: "“…because during puberty the body clock shifts about two hours later, so teens physically can’t fall asleep early enough to get a full night before a 7 a.m. bell.”",
        note: "Now it’s a warrant. It gives the cause (the biological clock shift) and pre-answers the obvious rebuttal — “just sleep earlier” fails because the body won’t allow it. This is the version a judge can’t wave away."
      }
    ]
  },

  evidenceUpgrade: {
    intro:
      "The same move works on your evidence. “Studies show it helps” is not something a judge can weigh. Watch a vague stat become a specific one — and notice exactly what changed, because that is what makes evidence hard to dismiss.",
    vague: "“Studies show later start times are better for students.”",
    specific:
      "“In one district’s own before-and-after report, crashes involving teen drivers fell about 15% in the year after it moved the first bell to 8:35 a.m.”",
    whatChanged: [
      "A number you can weigh. “Better” is unmeasurable; “about 15% fewer teen-driver crashes” is something the judge can size up against the other side’s impacts.",
      "A built-in comparison. “Before vs. after the change” tells the judge what the number is measured against — without a baseline, a statistic means nothing.",
      "A timeframe. “The year after” bounds the claim, so it can’t be dismissed as a one-day fluke or waved off as coincidence.",
      "A specific outcome. “Teen-driver crashes,” not the vague “helps students” — now the opponent has to engage your actual data instead of just citing some other study."
    ],
    honestyNote:
      "The 15% here is illustrative — copy the SHAPE (a number, a comparison, a timeframe, a specific outcome), not the figure. Always find and cite real, current data before you use it in a round."
  },

  misconception: {
    name: "“The facts speak for themselves.”",
    wrongModel:
      "Most students picture an argument as two parts: a claim, plus a fact that obviously proves it. Under that model the warrant feels pointless — “why explain WHY early starts hurt? Everyone knows that” — so they state the claim, attach a fact, and move on.",
    whyWrong:
      "A judge is required to stay neutral: they will not fill in the reasoning you left out. And the same fact usually fits both sides — “teens are tired in the morning” can support your claim OR the reply “so teach them better time management.” The fact just sits there; it doesn’t pick a side. Whoever supplies the warrant gets to decide what the fact means.",
    rightModel:
      "An argument is claim → warrant → impact, and the warrant is the part YOU have to say out loud. Treat every fact as raw material and the warrant as the sentence that turns it into a reason for YOUR side: “which means ___, therefore ___.” If you can’t say that step, you haven’t argued yet — you’ve only pointed at something true.\n\nYou will hear a warrant described two ways: as the reasoning that proves the claim is true, and as the bridge that connects your evidence to your claim. These are two angles on the same job, not competing rules — one starts from the claim, the other starts from the evidence, and both end at the sentence that makes the connection explicit."
  },

  commonMistakes: [
    {
      title: "Restating the claim and calling it a warrant",
      explanation:
        "“It’s better,” “it’s important,” “it just makes sense” — these feel like reasons but only repeat the claim. The judge still has no mechanism to believe.",
      fix: "After your claim, finish the sentence “…because ___” where the blank is a cause-and-effect step, not a synonym for the claim."
    },
    {
      title: "Stopping at the warrant and never landing the impact",
      explanation:
        "You prove the claim is true but never tell the judge why it should decide the round, so a true-but-minor argument loses to a smaller point that was actually weighed.",
      fix: "After your warrant, ask “so what?” out loud and answer it with who is harmed or helped and how much."
    },
    {
      title: "Confusing evidence with a warrant",
      explanation:
        "Dropping a statistic or a source and assuming it argues for you. A stat is only as strong as the reasoning that connects it to your claim; left “naked,” it can support either side.\n\nThe harder version of this sounds prepared, which is why it survives: a claim, then a source, over and over. “Later start times improve outcomes — Smith 2021 finds this. Attendance rises — Lee 2022 confirms it.” Fluent, well researched, and the judge still hasn’t been told HOW a later bell produces any of it. Naming a source is not the same move as explaining the mechanism. The study may well contain that reasoning — but the judge only has what you said out loud, and citation density doesn’t substitute for the connecting step.",
      fix: "Never leave evidence unexplained — add the one sentence that says what it proves and why that supports your side. If you’re citing several sources, take the load-bearing one and put its mechanism in your own words: “…because the body clock shift means an earlier bedtime doesn’t work, so the lost sleep can’t be recovered.” One explained source beats three announced ones."
    }
  ],

  practice: {
    intro:
      "Now spot the pattern under time pressure. Each question isolates one part — telling a real warrant from a restatement, catching a missing impact, separating evidence from reasoning. Immediate feedback explains every answer, and your results update your Claim Building mastery.",
    questionCount: 6
  },

  video: {
    url: null,
    caption: "A short walkthrough of Claim → Warrant → Impact is planned for this slot."
  },

  provenanceNote:
    "Teaching lesson — original instruction, not official competition rules. Claim/Warrant/Impact is an officially supported beginner model in the NSDA's Debate Training Guide, and CompeteReady uses it as its beginner teaching model; compatible four-part presentations (Claim/Data/Warrant/Impact) also appear in official material, so this is one supported formulation rather than the only one. Examples are illustrative; verify your own evidence before using it in a round.",

  // The Guide is durable teaching material, NOT a current-competition-rules source, and our record
  // carries no version or verification date for it — so neither is claimed here.
  provenance: {
    authority: "stable-teaching",
    freshness: "stable",
    organization: "NSDA",
    sourceLabel: "NSDA Debate Training Guide"
  }
};

export const AUTHORED_LESSONS: AuthoredLesson[] = [claimWarrantImpact];

export function getLesson(slug: string): AuthoredLesson | undefined {
  return AUTHORED_LESSONS.find((lesson) => lesson.slug === slug);
}

export function lessonsForTrack(trackSlug: string | undefined): AuthoredLesson[] {
  if (!trackSlug) return AUTHORED_LESSONS;
  return AUTHORED_LESSONS.filter((lesson) => lesson.track === trackSlug);
}
