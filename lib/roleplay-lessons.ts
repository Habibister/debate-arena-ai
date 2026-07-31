// Authored beginner role-play lessons (C5C1). Unlike the debate Claim/Warrant/Impact lesson, these
// teach how an EVENT is performed end to end. They are fully authored and deterministic: the lesson
// owns the scenario, roles, objective, response framework, rubric, the expected follow-up, and both
// worked examples. The interactive practice reuses the existing authenticated Side Coach route only
// to give short feedback on the learner's OWN words, validated against the authored rubric below —
// it never invents the lesson, changes the objective, or becomes a scored simulation. Guided practice
// only: no rating, no competition record, no mastery write.
//
// DECA and HOSA are intentionally different in method and vocabulary. Nothing here is official
// competition material; examples are illustrative.

import type { SourceFreshnessMetadata } from "@/lib/source-freshness";

export type RolePlayLine = { speaker: string; text: string; note?: string };

// Teaching content every role-play lesson has, whether or not its interactive practice is live.
type RoleplayLessonBase = {
  slug: string;
  track: "deca" | "hosa";
  organization: "DECA" | "HOSA";
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  // eventType is passed to the Side Coach so its feedback framing is track-specific.
  eventType: string;

  intro: string[];
  keyIdeas: Array<{ term: string; plain: string }>;
  timeline: string[];
  /**
   * Heading for the sequence. Absent means it IS the event's sourced structure. Present means the
   * list is CompeteReady's teaching order and must not read as an official event timeline (M11R3).
   */
  timelineLabel?: string;
  /** Shown with a labelled sequence to say plainly what controls instead. */
  timelineNote?: string;
  framework: { name: string; steps: string[]; note: string };
  commonMistakes: Array<{ title: string; explanation: string }>;

  provenanceNote: string;
  /** Structured provenance for the shared source indicator (M9). Lives with the lesson data. */
  provenance: SourceFreshnessMetadata;
  supportingLink?: { label: string; note: string };
  nextLesson: { label: string; note: string };
  courseMap: string[];
  // Index of THIS lesson in courseMap (defaults to 0). Lets a future entry (e.g. the HOSA Event
  // Navigator) sit above the lesson without claiming it is the current one.
  courseMapCurrentIndex?: number;
};

// Interactive practice. `identify` steps are deterministic (authored answers). `write` collects the
// learner's own sentence; `followUp` is the authored in-character question they then answer. The
// rubric is what the Side Coach validates the learner's wording against. The coach analyzes the
// learner's response — it never role-plays the character (that stays authored).
// An authored rubric criterion. The `id` is a STABLE machine identifier used to match provider
// feedback back to the criterion; the `label` is the learner-facing wording. They are deliberately
// separate — full sentence text must never be the only identifier, because any rewording of the
// label would silently break matching.
export type AuthoredRubricItem = { id: string; label: string };

type RoleplayPractice = {
  intro: string;
  identify: Array<{ prompt: string; choices: string[]; correct: string; explanation: string }>;
  write: { instruction: string; placeholder: string; rubric: AuthoredRubricItem[] };
  followUp: { speaker: string; question: string; note: string };
};

// A lesson whose interactive practice is LIVE. Every scenario-dependent piece is REQUIRED here, so
// an incomplete "available" lesson is a compile error — it can never silently degrade into the
// unavailable state, which is reserved for a deliberate editorial decision.
export type AvailableRoleplayLesson = RoleplayLessonBase & {
  practiceStatus: "available";
  scenario: { title: string; text: string };
  prepOutline: { title: string; note: string; items: string[] };
  weakExample: { title: string; lines: RolePlayLine[] };
  strongExample: { title: string; lines: RolePlayLine[] };
  practice: RoleplayPractice;
  // Forbidden on this variant: an available lesson has no unavailable notice to show.
  practiceUnavailable?: never;
};

// A lesson whose interactive practice has been deliberately WITHDRAWN (e.g. pending clinical and
// legal review). The learner-facing message is REQUIRED — an unavailable lesson must always be able
// to say so honestly. The scenario-dependent fields are forbidden outright, so no withdrawn content
// can linger in the data and no code path can reach it.
export type UnavailableRoleplayLesson = RoleplayLessonBase & {
  practiceStatus: "temporarily-unavailable";
  practiceUnavailable: { title: string; message: string };
  scenario?: never;
  prepOutline?: never;
  weakExample?: never;
  strongExample?: never;
  practice?: never;
};

// Discriminated on `practiceStatus`. Components branch on the discriminant — never on missing data —
// so a malformed lesson fails type checking instead of impersonating an intentionally disabled one.
export type RoleplayLesson = AvailableRoleplayLesson | UnavailableRoleplayLesson;

const decaRoleplay: AvailableRoleplayLesson = {
  practiceStatus: "available",
  slug: "how-deca-roleplay-works",
  track: "deca",
  organization: "DECA",
  title: "How a DECA Role-Play Works",
  subtitle: "The whole event, start to finish — so you walk in knowing exactly what to do.",
  estimatedMinutes: 15,
  eventType: "DECA role-play (Hospitality & Tourism example)",

  intro: [
    "A DECA role-play is a short business meeting you perform out loud. You are handed a business situation, given a few minutes to prepare, and then you meet a judge who is playing a specific character — your manager, a client, a franchise owner. Your job is to walk in, understand their problem, and recommend what the business should do, out loud, as if it were really happening.",
    "This lesson teaches the foundations shared across DECA's role-play and case-study events — Individual Series, Principles of Business Administration, Personal Financial Literacy, and Team Decision Making. The exact structure, timing, and question flow differ by family, so confirm yours in your event's current official guide. DECA's prepared, written, and online events work differently and are outside this lesson's scope. Not every chartered association offers every event.",
    "It is NOT a speech and it is NOT a quiz. You are not reciting terms. You are advising a person, in character, and defending your advice when they push back. By the end of this lesson you'll know every step, the structure of a strong recommendation, and what your event's evaluation form is actually looking for."
  ],
  keyIdeas: [
    { term: "Preparation time", plain: "A short window (often ~10 minutes) after you receive the scenario to plan before you meet the judge. You use it to find the problem and draft your recommendations — not to memorize a script. Exact preparation and presentation time depends on the selected DECA event; CompeteReady shows the current official timing for your event where it is sourced." },
    { term: "The participant (you)", plain: "The role you are told to play — e.g. the front-desk manager. Everything you say should sound like that person doing that job, not like a student giving a presentation." },
    { term: "The judge's role", plain: "The judge plays an assigned character (a guest, an owner, your boss). Speak TO that character. Read who they are before you plan what to say." },
    { term: "Performance indicators (PIs)", plain: "The specific skills the scenario says you must demonstrate — e.g. 'explain the nature of customer service' or 'handle guest complaints.' You must SHOW each one in action, not just name it. They are on your card; they are not announced ahead of time." },
    { term: "Naming a PI vs. weaving it in", plain: "Competitors disagree about whether to say a PI's title out loud before you address it, or to cover it naturally without announcing it. Both are in common use and each has a tradeoff: announcing makes your coverage unmissable but can sound mechanical; weaving sounds natural but risks a judge not registering that you covered it. The official rule is that you must DEMONSTRATE the indicator — it says nothing about announcing. This is an open judgment call, not a settled rule, so pick deliberately and stay consistent." },
    { term: "Behavior-type PIs", plain: "Some indicators start with 'Demonstrate…' — an action rather than a concept, like demonstrating active listening or a professional greeting. There's no definition to recite, so plan the observable moment instead: what will you actually DO that a judge could point at? (Teaching support from limited evidence — treat it as a planning habit, not an official delivery rule.)" },
    { term: "How your scores combine", plain: "Weighting differs by event family — some combine an exam with your presentation, some don't, and the proportions are not the same across families. There is no single universal formula, so read your own event's current guide rather than applying a number you heard somewhere else." },
    { term: "The score sheet", plain: "Your event's current official evaluation form is the authority. Role-play events commonly score how well you demonstrate the required Performance Indicators along with event-specific criteria — typically including whether your solution is accurate and original, practical, and effective, plus communication skills. When you practice, map the feedback you get back to those official categories rather than to a general impression." }
  ],
  timeline: [
    "Receive the scenario card",
    "Identify your role",
    "Identify the judge's assigned role",
    "Find the central business problem",
    "Read the performance indicators",
    "Use preparation time to plan recommendations",
    "Open professionally, in character",
    "Present specific recommendations",
    "Explain why each recommendation works (business reasoning)",
    "Cover implementation, cost, and how you'd measure success",
    "Present without being interrupted, then take the judge's questions",
    "Close persuasively",
    "Receive your score sheet"
  ],
  framework: {
    name: "CompeteReady's five-part recommendation scaffold",
    steps: [
      "Problem — name the business problem in one sentence",
      "Recommendation — say exactly what you'd do",
      "Business reason — why it works (revenue, loyalty, cost, brand)",
      "Implementation — who does what, and by when",
      "Measurement — the number you'd watch to know it worked"
    ],
    note: "This five-part shape is CompeteReady's teaching scaffold — it is not official DECA terminology, and you won't find these five words on an evaluation form. We use it because it lines up with what official forms ask about a solution: whether it is accurate and original (your recommendation), effective (your business reason), and practical and testable (your implementation and measurement). Implementation and measurement are concrete ways to make a recommendation more practical and testable and better aligned with those criteria, so they may well strengthen your answer — but we have not established that they reliably separate top scores, and we're not going to promise you a higher score. Beginners stop after 'Recommendation'; the remaining three parts are where most of the substance lives.\n\nYou may hear other competitors use a D-E-C-A-style mnemonic for handling an indicator. The expansions differ from place to place and none of them is official — it's mentioned here only so the term isn't unfamiliar. It is separate from this scaffold, and nothing here assesses you on it."
  },
  scenario: {
    title: "Scenario: the overbooked suite",
    text: "You are the front-desk manager at a busy hotel. A loyalty-program guest reserved a specific suite months ago for an anniversary, but the hotel overbooked and the suite is no longer available tonight. The judge is playing that guest, who has just arrived and is upset. Recommend how to handle this guest AND how to reduce overbooking problems going forward. Performance indicators: handle a guest complaint; explain the role of customer service in retention."
  },
  prepOutline: {
    title: "What a 10-minute prep looks like",
    note: "Budget the time before you use it, and write cues rather than sentences — usually a few words per cue. You cannot read an essay while holding a conversation, and note bloat (not misunderstanding the card) is the usual reason a prep period runs out. This layout is CompeteReady's habit, not a format DECA requires.",
    items: [
      "0–2 min — read and mark the card. Role: front-desk manager. Judge: the upset anniversary guest. (Speak to HER, warmly.)",
      "2–4 min — problem in one sentence + PIs as actions. Problem: loyalty guest's promised suite gone — service failure, retention at risk. PI cues: 'recover THIS guest' · 'service → retention'.",
      "4–8 min — two recommendations. Rec 1 (tonight): recover the guest — acknowledge, upgrade + comp, anniversary setup. Rec 2 (forward): loyalty-suite buffer.",
      "4–8 min — for each, three short cues: reason → implementation → metric.",
      "8–10 min — opening line, two or three likely questions, closing line.",
      "Materials are provided at the event and the notes you make in preparation are yours to use in the meeting — check your event's current guide for the specifics, and note that role-play events do not let you bring visual aids in."
    ]
  },

  weakExample: {
    title: "Weak role-play",
    lines: [
      { speaker: "You", text: "Hi. So, I'm the front desk manager. Customer service is very important for retention and handling guest complaints.", note: "Names the PIs instead of demonstrating them, and talks like a student listing terms — not a manager talking to a real guest." },
      { speaker: "You", text: "I would apologize. Maybe a late checkout or another room would help. We value your business.", note: "Vague. No specific recovery, no reason it works, nothing about preventing it again, no way to measure success." },
      { speaker: "Judge (guest)", text: "Another room? I booked THAT suite for my anniversary six months ago." },
      { speaker: "You", text: "I understand. Sorry. That's all I can do right now.", note: "Collapses under the first push. Gives up instead of recovering the guest or defending a plan." }
    ]
  },
  strongExample: {
    title: "Strong role-play",
    lines: [
      { speaker: "You", text: "Mrs. Rivera, welcome — and I'm so sorry. You reserved the Skyline Suite for your anniversary, and we failed to hold it. That's on us, and I want to make tonight right for you.", note: "Opens in character, TO the guest, and demonstrates 'handle the complaint' by owning it warmly and specifically — not by naming the PI." },
      { speaker: "You", text: "Here's what I recommend tonight: I'll move you to our Penthouse Corner suite — larger, better view — at no charge, add a champagne-and-dessert anniversary setup, and note your file so this never repeats. A recovered guest who feels cared for tends to stay loyal; keeping a loyalty member is far cheaper than winning a new one. I'll have housekeeping ready in 15 minutes, and I'll follow up personally before you leave tomorrow.", note: "Recommendation 1 hits the full structure: specific action → business reason (retention economics) → implementation (15 min, personal follow-up)." },
      { speaker: "You", text: "Going forward, I recommend we hold a small buffer of loyalty-tier suites — never overbook the top tier for members. It costs us a few unsold room-nights, but it protects the guests most likely to return. I'd measure it by tracking loyalty-guest complaint rate and repeat-booking rate quarter over quarter.", note: "Recommendation 2 addresses the CAUSE, weighs the cost honestly, and names the metric — this is what pushes a ballot from average to strong." },
      { speaker: "Judge (guest)", text: "A buffer costs you empty rooms. Why would the hotel accept that?" },
      { speaker: "You", text: "Because the math favors it: a handful of unsold nights is cheap next to the lifetime value of a loyalty member who tells friends about tonight — and cheaper than the refunds and reputation hits from failures like this one. I'd pilot it for one quarter and compare repeat-booking rates before we commit hotel-wide.", note: "Defends the recommendation with business reasoning under pressure instead of collapsing, and proposes a measured pilot — poise plus reasoning." },
      { speaker: "You", text: "Mrs. Rivera, again, I'm sorry for the mix-up — let me walk you up personally and get your evening started.", note: "Closes warmly and in character, staying the manager to the end." }
    ]
  },

  commonMistakes: [
    { title: "Naming performance indicators instead of demonstrating them", explanation: "Saying 'I will handle the complaint and explain customer service' scores nothing. You must actually handle it — the judge scores what you DO, not what you name." },
    { title: "Giving vague advice", explanation: "'Try to make it better' or 'offer something' isn't a recommendation. Say the specific action." },
    { title: "Recommendations with no business reason", explanation: "A recommendation without a 'because it drives retention/revenue/loyalty' is just an opinion the judge can dismiss." },
    { title: "Ignoring implementation, cost, or measurement", explanation: "Skipping who-does-what, what it costs, or how you'd know it worked leaves the recommendation half-built." },
    { title: "Talking to a generic audience", explanation: "Speaking like you're presenting to a class instead of TO the assigned character (the guest, the owner) breaks the role-play." },
    { title: "Expecting to be interrupted", explanation: "You present without being cut off; questions come after. What kind depends on your family: Individual Series, Principles, and Personal Financial Literacy use scripted standard questions that are the same for every competitor in the event, followed by any clarifications — so you can prepare for them directly. Team Decision Making uses its own arrangement per the current guide. Professional Selling and Consulting has no scripted standard questions; the judge may ask if time remains, so don't build your plan around a question round that may not happen." },
    { title: "Collapsing when questioned", explanation: "Folding ('that's all I can do') abandons the plan at the first push. Defend your reasoning or adapt it — don't surrender it." },
    { title: "Inventing an answer you don't have", explanation: "There's popular advice that says make something up and say it confidently. Don't — an invented number is exactly what falls apart under one follow-up. Instead: say what you do know, state your assumption plainly, name how you'd verify it, and return to the recommendation. 'I don't have our current no-show rate in front of me. I'm assuming it's in the normal range for a property this size — I'd pull the last two quarters before committing to a buffer size, and I'd bring you that number Monday.' That's a competent professional answer, and it has the advantage of being true." },
    { title: "Building for one imagined judge", explanation: "The business role the judge plays is part of the simulation. The people who actually evaluate differ in experience and in how much they engage — some ask a lot, some barely react. Build a meeting that stays clear and well supported either way: state your structure out loud, keep your reasoning explicit rather than implied, and don't rely on the evaluator prompting you to make your best point." }
  ],

  practice: {
    intro: "Now do it. First read the situation, then make the calls a manager makes. The last steps use your OWN words — a coach will give you feedback on exactly what you write, judged against the rubric below. Those four checks line up with what an official evaluation form asks about your solution: is it accurate and original, is it practical, and would it be effective. They are not a score, and nothing here is recorded.",
    identify: [
      { prompt: "In this scenario, who are YOU (the participant)?", choices: ["A hotel guest", "The front-desk manager", "A DECA judge", "A travel agent"], correct: "The front-desk manager", explanation: "You play the front-desk manager — everything you say should sound like that manager doing the job." },
      { prompt: "Who is the JUDGE playing?", choices: ["Your teacher", "A hotel inspector", "The upset anniversary guest", "The hotel owner"], correct: "The upset anniversary guest", explanation: "The judge is the guest whose suite was lost. Speak TO her, in character." },
      { prompt: "What is the central business PROBLEM?", choices: ["The hotel is too expensive", "A loyalty guest's promised suite was overbooked, risking retention", "The staff need training", "There aren't enough rooms in the city"], correct: "A loyalty guest's promised suite was overbooked, risking retention", explanation: "Name the real problem: a service failure that threatens a loyal guest's future business." },
      { prompt: "Which is the STRONGER recommendation?", choices: ["\"I'll try to find you another room and we value your business.\"", "\"I'll upgrade you to the Penthouse suite at no charge with an anniversary setup tonight, and add a loyalty-suite buffer so this can't repeat — measured by repeat-booking rate.\"", "\"Customer service is important for retention.\"", "\"Sorry, that's all I can do right now.\""], correct: "\"I'll upgrade you to the Penthouse suite at no charge with an anniversary setup tonight, and add a loyalty-suite buffer so this can't repeat — measured by repeat-booking rate.\"", explanation: "It's specific, has a business reason, an implementation, and a metric — the full recommendation structure." }
    ],
    write: {
      instruction: "Write ONE recommendation for this scenario, as the manager: what you would do, why it fits this situation, how you would actually carry it out, and how you would know it worked.",
      placeholder: "I recommend that we… because… I'd start by… and I'd know it worked if…",
      // Four items, aligned to the official evaluation form's Solution dimensions — accurate/unique,
      // practical, effective — while staying assessable from the two written responses alone.
      // Deliberately NOT here: any point value or score, any requirement to say a performance
      // indicator's name aloud (explicit vs woven delivery is an unresolved judgment call), any
      // D-E-C-A mnemonic, and any judgement of delivery, tone, or appearance, which text cannot show.
      rubric: [
        { id: "specific-recommendation", label: "States a specific recommendation — a concrete action for this business problem, not a general intention" },
        { id: "scenario-reasoning-pi", label: "Explains why it fits this scenario, demonstrating the performance indicator through the reasoning itself" },
        { id: "practical-implementation", label: "Covers practical implementation — who acts, what it takes, timing, or a tradeoff, where the scenario makes that relevant" },
        { id: "effectiveness-measurement", label: "Says what result is expected and how success could be checked" }
      ]
    },
    followUp: {
      speaker: "Judge (as the guest)",
      question: "That's a generous offer — but how do I know the hotel won't just overbook my suite again next year?",
      note: "A skeptical follow-up. Defend your going-forward fix with a business reason — don't just apologize again."
    }
  },

  provenanceNote:
    "Teaching lesson — original instruction, not official DECA material. The scenario and examples are illustrative; real events use official performance indicators. CompeteReady's five-part recommendation scaffold is ours, not official DECA terminology. This is shared role-play instruction, not a specification for any one event: your family's current official guideline controls timing, exam weighting, Performance Indicator count, and how the judge asks questions.",
  provenance: {
    authority: "tier-2",
    freshness: "stable",
    organization: "CompeteReady",
    sourceLabel: "CompeteReady authored lesson"
  },
  supportingLink: { label: "Need a business term?", note: "Optional: review the related DECA vocabulary cards. This is support — the role-play is the lesson." },
  nextLesson: { label: "Reading and Decoding a DECA Scenario", note: "Next you'll learn to pull the role, the judge, the problem, and the PIs out of a fresh scenario card fast." },
  courseMap: [
    "0. How a DECA Role-Play Works",
    "1. Reading and Decoding the Scenario",
    "2. Understanding Performance Indicators",
    "3. Using Preparation Time",
    "4. Opening the Role-Play",
    "5. Building Recommendations",
    "6. Business Reasoning",
    "7. Implementation and Metrics",
    "8. Handling Judge Questions",
    "9. Closing Persuasively",
    "10. Guided Full Role-Play"
  ]
};

const hosaScenarioInteraction: UnavailableRoleplayLesson = {
  // Interactive practice is WITHDRAWN by editorial decision, not missing by accident. The
  // discriminant says so explicitly; the type then forbids scenario/examples/practice outright.
  practiceStatus: "temporarily-unavailable",
  // Slug intentionally UNCHANGED (existing lesson ID / deep links preserved) even though the title
  // was corrected in M3. The lesson is now scoped to the communication layer inside clinical skill
  // events, per the approved official finding that no standalone patient-conversation event exists
  // in the reviewed corpus.
  slug: "how-hosa-scenario-interaction-works",
  track: "hosa",
  organization: "HOSA",
  title: "Patient Communication in HOSA Clinical Skill Events",
  subtitle: "One scored layer inside a clinical skill event — not the skill itself.",
  estimatedMinutes: 12,
  eventType: "HOSA clinical skill event (patient-communication layer)",

  intro: [
    "HOSA includes written tests, clinical skill performances, presentations, interview events, team events, and emergency-preparedness events. This lesson teaches one specific thing: the patient-communication layer that some clinical skill events score as rows on their rating sheet.",
    "That scoping matters, because there is no separate 'patient conversation' event to sign up for. In the current official guidelines reviewed for this lesson, communication with a patient is something you are scored on WHILE performing a clinical skill — and separately in the interview events, which work differently. Your exact event's current official guideline and rating sheet remain the source of truth for what is scored and how.",
    "Two honest boundaries before you start. This lesson does not teach the physical clinical skill, and finishing it does not make you ready for your complete event — the hands-on portion needs in-person practice with your instructor. And the interaction framework taught here is CompeteReady's teaching method, not something HOSA publishes or requires."
  ],
  keyIdeas: [
    { term: "Communication is one layer, not the event", plain: "In a clinical skill round you are performing a skill AND talking while you do it. Some rating sheets score steps like greeting and introducing yourself, explaining what you are doing, and reporting concerns to the right professional. Those rows are what this lesson trains — the skill itself is trained in a lab, with an instructor." },
    { term: "Who is in the room", plain: "More people than beginners expect, and the roles are distinct. The judge is frequently playing the professional you report to — when a sheet says 'reported concerns to the nurse,' the nurse is the judge. Some events provide a live patient or an actor for noninvasive components where the guideline and equipment list specify one. For invasive, medication, blood-draw, injection, and resuscitation components, the specified simulation equipment is used — manikins, training arms, or medication trainers. Some events mix these within one skill, and where a guideline does not say, it is simply unspecified. Your event's current guideline and equipment list are the only place to find out which applies to you." },
    { term: "Your assigned role and its limits", plain: "You can only do what your assigned role is allowed to do. Identify a concern, stay inside the role, report to the designated professional, and avoid diagnosing or claiming a treatment decision that isn't yours. Saying 'I'm not able to assess that — let me get the nurse right now' is the professional move, not a failure." },
    { term: "Verbalizing, with the nuance", plain: "Some rating sheets require you to state actions or observations aloud — do that, because it is a scored step. But saying a step out loud does not replace performing it when the required equipment is present and the action has to actually happen. The community shorthand 'just say everything out loud' oversimplifies the rule. Your current event guideline and rating sheet decide which steps require what." },
    { term: "What the rating sheet actually says", plain: "For most clinical skill events the sheet is a step-by-step checklist with points attached, and often a threshold you have to clear. It is literally the list of what earns points, which makes it your practice plan. Read your own event's current sheet — do not infer it from another event or from someone else's description." }
  ],
  // M11R3 — this is CompeteReady's LEARNING order, not an official HOSA event timeline.
  // Two steps were removed because our record does not support them as event structure:
  //   "Receive your score sheet"        — whether competitors receive rating sheets or feedback is
  //                                       an OPEN advisor gate, so it cannot be listed as a step.
  //   "Check that the person understood you" — documented as good practice with NO scored row
  //                                       located; it survives in the framework below, where it is
  //                                       already labelled as ours, rather than here where a
  //                                       numbered list reads as official sequence.
  // "who each person in the room is playing" was reworded: who portrays the patient is also an open
  // gate, and the original implied a universal room and cast.
  timeline: [
    "Read your event's current guideline and rating sheet",
    "Identify your assigned role and what it permits",
    "Confirm from that guideline who each participant represents in your event",
    "Greet and introduce yourself",
    "Explain what you are about to do, in plain language",
    "Perform the skill (trained in a lab, with your instructor — not here)",
    "Verbalize the actions or observations your rating sheet requires",
    "Identify any concern you notice",
    "Report that concern to the designated professional",
    "Close professionally"
  ],
  timelineLabel: "CompeteReady learning flow",
  timelineNote:
    "This is the order CompeteReady teaches these communication layers in — it is not an official HOSA event timeline, and events differ. Your event's current official guideline and rating sheet control what actually happens and what is scored. Communication is one layer inside applicable clinical skill events; CompeteReady does not teach or score hands-on procedures, and finishing this lesson does not mean you are ready for the complete event.",
  framework: {
    name: "CompeteReady's interaction framework",
    steps: [
      "Acknowledge — name and validate the person's feeling first",
      "Clarify — ask one question to understand what they actually mean",
      "Respond safely — explain in plain language, inside your role",
      "Check understanding — make sure it landed",
      "Next step — report to the designated professional, or give a sound action inside your role"
    ],
    note: "This five-move sequence is CompeteReady's teaching method. HOSA does not publish or require it. Its steps line up only partly with official scored steps: greeting and introducing yourself is scored on many sheets, explaining the skill to the patient is scored, and reporting concerns to the professional is scored. Acknowledging someone's feelings and checking their understanding are our standards for doing those scored steps well — you will not find them as their own rows. Beginners jump straight to 'Respond'; professionals acknowledge and clarify first."
  },

  commonMistakes: [
    { title: "Treating it as a speech", explanation: "Delivering health facts AT a person instead of responding to what they actually said. Leave room for them to talk back." },
    { title: "Explaining before acknowledging", explanation: "Jumping to information before naming the person's feeling makes an anxious person more anxious. Acknowledge first." },
    { title: "Sounding robotic", explanation: "A flat, recited tone reads as uncaring — and a checklist delivered like a checklist is still a checklist. Warmth is how you perform the scored step well." },
    { title: "Using unexplained medical terminology", explanation: "Precise terms belong in your report to the professional. With the person in front of you, translate — jargon they can't follow doesn't inform anyone." },
    { title: "Stepping outside your assigned role", explanation: "Diagnosing, promising an outcome, or making a decision that belongs to licensed staff. Observe, stay in role, and hand off what isn't yours." },
    { title: "Verbalizing instead of performing", explanation: "Narrating a step you were supposed to actually do, when the equipment is right there. Say what your sheet requires — and still do the action." },
    { title: "Not reporting the concern", explanation: "Noticing something and keeping it to yourself. On many sheets, reporting it to the designated professional is its own scored step." },
    { title: "Closing without checking understanding", explanation: "Ending without confirming it landed leaves the person unsure, and skips a move that costs you nothing." }
  ],

  // ===== M3: interactive practice WITHDRAWN =====
  // The previous practice was built entirely on a clinic-privacy scenario that carries medical,
  // privacy, and legal implications and has NO clinical or legal approval. Per the approved decision
  // it is disabled by default rather than left live through an open-ended interim period.
  //
  // Removed together, so nothing is orphaned: the scenario, its preparation outline, both worked
  // examples, all four identify questions, the written prompt, the follow-up prompt, and the
  // five-item rubric that only made sense for that scenario. No Side Coach path remains for this
  // lesson — the request payload required `scenario`, which no longer exists here.
  //
  // No replacement is authored in M3. Replacement authoring is M4 and is separately gated:
  // medical/privacy/legal content requires clinical and legal review; even a clearly non-medical,
  // non-legal administrative scenario requires advisor, safety, and product review.
  practiceUnavailable: {
    title: "This practice scenario is temporarily unavailable",
    message: "The interactive scenario that used to sit here is being reviewed, so it has been taken down for now. Nothing above it has changed — the lesson content, the framework, and the common mistakes are all still here to read. Your event's current official guideline and rating sheet remain the place to check what your event actually scores."
  },

  provenanceNote: "Teaching lesson — original instruction, not official HOSA material. Examples are illustrative and generic; they are never scored as official. CompeteReady never teaches, scores, or simulates hands-on clinical procedures, and practising here does not create clinical readiness. Guidance about practising with supervision is CompeteReady's own policy, not a HOSA rule. Communication is one layer inside applicable clinical skill events, and your event's current official guideline and rating sheet control every rule.",
  provenance: {
    authority: "tier-2",
    freshness: "stable",
    organization: "CompeteReady",
    sourceLabel: "CompeteReady authored lesson"
  },
  supportingLink: { label: "Need help with a medical term?", note: "Optional: review the related medical-terminology cards. This is support — the communication layer is the lesson." },
  nextLesson: { label: "Reading Your Event's Rating Sheet", note: "Next you'll learn to pull the scored steps out of your own event's current rating sheet — the list of what actually earns points." },
  courseMap: [
    "0. HOSA Event Navigator — identify your exact event and what it contains",
    "1. Patient Communication in HOSA Clinical Skill Events",
    "2. Reading Your Event's Rating Sheet",
    "3. Your Assigned Role and Its Boundaries",
    "4. Plain-Language Explanation",
    "5. Verbalizing What You Observe and Do",
    "6. Reporting Concerns to the Designated Professional",
    "7. Checking Understanding",
    "8. Closing Professionally",
    "9. Guided Communication Scenario"
  ],
  courseMapCurrentIndex: 1
};

export const ROLEPLAY_LESSONS: RoleplayLesson[] = [decaRoleplay, hosaScenarioInteraction];

export function getRoleplayLesson(slug: string): RoleplayLesson | undefined {
  return ROLEPLAY_LESSONS.find((lesson) => lesson.slug === slug);
}

export function roleplayLessonsForTrack(trackSlug: string | undefined): RoleplayLesson[] {
  if (!trackSlug) return [];
  return ROLEPLAY_LESSONS.filter((lesson) => lesson.track === trackSlug);
}
