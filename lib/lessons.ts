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
  // Optional since the beginner rewrite (2026-09-08): evidence specificity is class C for a first-time
  // learner and belongs to Evidence Evaluation, so the block may be absent and the view skips it.
  evidenceUpgrade?: { intro: string; vague: string; specific: string; whatChanged: string[]; honestyNote: string };

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
  subtitle: "What you are saying, why it is true, and why anyone should care.",
  estimatedMinutes: 6,

  whatItIs: {
    intro: "They say: the school should offer free breakfast. Why? Some students arrive without eating, and a hungry student has a hard time concentrating. So what? Free breakfast helps those students focus, so they learn more.\n\nThat is one complete argument: what you want me to believe, why, and so what. Debaters call the three parts the CLAIM, the WARRANT, and the IMPACT. Judges vote on all three. Beginners say the first part and stop.\n\nTo build one: say your point. Explain why. Say what happens and why it matters.",
    parts: [
      {
        term: "Claim",
        plain: "The point you want the judge to accept. It must say something you could argue about. A topic is not a claim: school lunches is a topic; free school lunches mean fewer missed meals is a claim.",
        example: "“The school should offer free breakfast.”"
      },
      {
        term: "Warrant",
        plain: "Why the judge should believe the claim: the because, the cause-and-effect step that shows how the claim comes true. A second claim is not a warrant, and “because it is important” names no cause at all. Naming a problem is not a cause either: “kids are bored” says what goes wrong, not why it happens.",
        example: "“Some students arrive without eating, and a hungry student has a hard time concentrating.”"
      },
      {
        term: "Impact",
        plain: "So what? What happens, who is affected, and why it matters. It is a job, not a place in the sentence or a scary word. Later lessons ask how big an outcome is; here, impact simply means the consequence that makes the argument matter.",
        example: "“Free breakfast helps those students focus, so they learn more.”"
      }
    ],
    closer: "A claim with no warrant is only a claim: the other side can say the opposite just as easily. A claim and warrant with no impact may be true, but gives the judge no reason to care. Facts with no claim leave the judge asking what they prove.\n\nQuick check: is every sentence a claim, or did you explain why one leads to the next?"
  },

  sharedClaim: "Schools should start the day after 8:30 a.m.",
  weak: {
    text: "Schools should start later because it is better for students. Starting so early is bad. A later start would really help everyone.",
    reasons: [
      "The warrant only repeats the claim. “Better” and “early is bad” never say why, so the judge cannot tell this from the opposite claim.",
      "The impact is empty. “Help everyone” says nothing about who is helped or how much."
    ]
  },
  strong: {
    text: "Schools should start after 8:30 a.m. During puberty the body clock shifts about two hours later, so a 7 a.m. bell asks teenagers to concentrate while their bodies still think it is night. Schools that moved the bell later saw fewer teen car crashes. A later start protects thousands of students from real harm.",
    reasons: [
      "The warrant is a cause-and-effect step: the body clock shifts, so the early bell steals sleep that cannot be made up.",
      "The impact says who is affected and how: fewer crashes, thousands of students. And the claim is the same as the weak version. Only the warrant and the impact got better."
    ],
    honestyNote: "This is an example argument, not evidence to quote. Before using specifics in a round, find and check your own current evidence: a warrant is only as strong as the evidence you can actually defend."
  },

  revisionLadder: {
    intro: "You do not jump from weak to strong. You revise. One warrant, three passes.",
    steps: [
      {
        label: "Draft 1: repeats the claim",
        warrant: "“…because a later start is better for students.”",
        note: "Not a warrant. “Better” just says the claim again. Next: name the actual harm."
      },
      {
        label: "Draft 2: names the harm, not the cause",
        warrant: "“…because teenagers do not get enough sleep when school starts at 7 a.m.”",
        note: "A real harm now. But why can they not just go to bed earlier? Next: the cause."
      },
      {
        label: "Draft 3: gives the cause",
        warrant: "“…because during puberty the body clock shifts about two hours later, so teens cannot fall asleep early enough for a 7 a.m. bell.”",
        note: "Now it is a warrant. It says how the early bell causes the harm."
      }
    ]
  },

  // The evidence-specificity block (class C in the beginner manifest) left the required beginner path on
  // 2026-09-08; evidence quality is the Evidence Evaluation lesson's job. The field is optional and unset.

  misconception: {
    name: "“The facts speak for themselves.”",
    wrongModel: "Many students picture an argument as a claim plus a fact that obviously proves it. So they say the claim, add the fact, and move on.",
    whyWrong: "The judge has to stay neutral and will not fill in the reasoning for you. And the same fact usually fits both sides: “teens are tired in the morning” can back a later start, or the reply “so teach them better sleep habits.” Whoever says the connecting sentence decides what the fact means.",
    rightModel: "Treat every fact as raw material, and say the sentence that turns it into a reason for your side: “which means ___, therefore ___.” Until you say that step, you have pointed at something true, not argued.\n\nYou may hear the warrant called the bridge from your evidence to your claim. Same job, seen from the other end."
  },

  commonMistakes: [
    {
      title: "Stopping at the warrant",
      explanation: "You show the claim is true and never say why it should decide anything. “This matters a lot” is not an impact: it names no one and nothing.",
      fix: "Ask “so what?” out loud, and answer it."
    },
    {
      title: "Naming a source and calling it done",
      explanation: "A study or a statistic is evidence, not the reasoning. Left alone, it can be read either way. Citing a lot does not mean the reasoning is missing; leaving out the connecting sentence does. Whether the evidence itself is any good is the Evidence Evaluation lesson’s job.",
      fix: "After every source, add the sentence that says what it shows and why that helps your side."
    }
  ],

  practice: {
    intro: "Now spot the parts under time pressure: warrant or restatement, a missing impact, evidence or reasoning. Feedback explains every answer, and your results update your Claim Building mastery.",
    questionCount: 6
  },

  video: {
    url: null,
    caption: "A short walkthrough of Claim — Warrant — Impact is planned for this slot."
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
