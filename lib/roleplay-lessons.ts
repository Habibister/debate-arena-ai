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

export type RolePlayLine = { speaker: string; text: string; note?: string };

export type RoleplayLesson = {
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
  framework: { name: string; steps: string[]; note: string };
  scenario: { title: string; text: string };
  prepOutline: { title: string; note: string; items: string[] };

  weakExample: { title: string; lines: RolePlayLine[] };
  strongExample: { title: string; lines: RolePlayLine[] };

  commonMistakes: Array<{ title: string; explanation: string }>;

  // Interactive practice. `identify` steps are deterministic (authored answers). `write` collects the
  // learner's own sentence; `followUp` is the authored in-character question they then answer. The
  // rubric is what the Side Coach validates the learner's wording against. The coach analyzes the
  // learner's response — it never role-plays the character (that stays authored).
  practice: {
    intro: string;
    identify: Array<{ prompt: string; choices: string[]; correct: string; explanation: string }>;
    write: { instruction: string; placeholder: string; rubric: string[] };
    followUp: { speaker: string; question: string; note: string };
  };

  provenanceNote: string;
  supportingLink?: { label: string; note: string };
  nextLesson: { label: string; note: string };
  courseMap: string[];
  // Index of THIS lesson in courseMap (defaults to 0). Lets a future entry (e.g. the HOSA Event
  // Navigator) sit above the lesson without claiming it is the current one.
  courseMapCurrentIndex?: number;
};

const decaRoleplay: RoleplayLesson = {
  slug: "how-deca-roleplay-works",
  track: "deca",
  organization: "DECA",
  title: "How a DECA Role-Play Works",
  subtitle: "The whole event, start to finish — so you walk in knowing exactly what to do.",
  estimatedMinutes: 15,
  eventType: "DECA role-play (Hospitality & Tourism example)",

  intro: [
    "A DECA role-play is a short business meeting you perform out loud. You are handed a business situation, given a few minutes to prepare, and then you meet a judge who is playing a specific character — your manager, a client, a franchise owner. Your job is to walk in, understand their problem, and recommend what the business should do, out loud, as if it were really happening.",
    "It is NOT a speech and it is NOT a quiz. You are not reciting terms. You are advising a person, in character, and defending your advice when they push back. By the end of this lesson you'll know every step, the exact structure of a strong recommendation, and what the judge is actually scoring."
  ],
  keyIdeas: [
    { term: "Preparation time", plain: "A short window (often ~10 minutes) after you receive the scenario to plan before you meet the judge. You use it to find the problem and draft your recommendations — not to memorize a script. Exact preparation and presentation time depends on the selected DECA event; CompeteReady shows the current official timing for your event where it is sourced." },
    { term: "The participant (you)", plain: "The role you are told to play — e.g. the front-desk manager. Everything you say should sound like that person doing that job, not like a student giving a presentation." },
    { term: "The judge's role", plain: "The judge plays an assigned character (a guest, an owner, your boss). Speak TO that character. Read who they are before you plan what to say." },
    { term: "Performance indicators (PIs)", plain: "The specific skills the scenario says you must demonstrate — e.g. 'explain the nature of customer service' or 'handle guest complaints.' You must SHOW each one in action, not just name it." },
    { term: "The score sheet", plain: "Your event's current official evaluation form is the authority. Role-play events commonly score how well you demonstrate the required Performance Indicators along with event-specific communication and presentation criteria." }
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
    "Answer the judge's questions without collapsing",
    "Close persuasively",
    "Receive the ballot"
  ],
  framework: {
    name: "The recommendation structure",
    steps: [
      "Problem — name the business problem in one sentence",
      "Recommendation — say exactly what you'd do",
      "Business reason — why it works (revenue, loyalty, cost, brand)",
      "Implementation — who does what, and by when",
      "Measurement — the number you'd watch to know it worked"
    ],
    note: "Every recommendation you make should hit all five. Beginners stop after 'Recommendation'; strong competitors always land the reason, the implementation, and the metric."
  },
  scenario: {
    title: "Scenario: the overbooked suite",
    text: "You are the front-desk manager at a busy hotel. A loyalty-program guest reserved a specific suite months ago for an anniversary, but the hotel overbooked and the suite is no longer available tonight. The judge is playing that guest, who has just arrived and is upset. Recommend how to handle this guest AND how to reduce overbooking problems going forward. Performance indicators: handle a guest complaint; explain the role of customer service in retention."
  },
  prepOutline: {
    title: "What a 10-minute prep looks like",
    note: "Don't script every word — plan the spine, then talk like a manager.",
    items: [
      "Role: front-desk manager. Judge: the upset anniversary guest. (Speak to HER, warmly.)",
      "Problem: a loyalty guest's promised suite is gone — a service failure that threatens retention.",
      "PIs to show: (1) handle the complaint, (2) explain customer service's role in keeping guests.",
      "Recommendation 1 (tonight): recover THIS guest — acknowledge, upgrade + comp, make the anniversary special.",
      "Recommendation 2 (going forward): fix the cause — an overbooking buffer for loyalty reservations.",
      "For each: reason → implementation → the metric I'd watch."
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
    { title: "Collapsing when questioned", explanation: "The judge WILL push. Folding ('that's all I can do') loses the poise-under-questioning score. Defend your reasoning or adapt it — don't surrender it." }
  ],

  practice: {
    intro: "Now do it. First read the situation, then make the calls a manager makes. The last steps use your OWN words — a coach will give you feedback on exactly what you write, judged against the rubric below.",
    identify: [
      { prompt: "In this scenario, who are YOU (the participant)?", choices: ["A hotel guest", "The front-desk manager", "A DECA judge", "A travel agent"], correct: "The front-desk manager", explanation: "You play the front-desk manager — everything you say should sound like that manager doing the job." },
      { prompt: "Who is the JUDGE playing?", choices: ["Your teacher", "A hotel inspector", "The upset anniversary guest", "The hotel owner"], correct: "The upset anniversary guest", explanation: "The judge is the guest whose suite was lost. Speak TO her, in character." },
      { prompt: "What is the central business PROBLEM?", choices: ["The hotel is too expensive", "A loyalty guest's promised suite was overbooked, risking retention", "The staff need training", "There aren't enough rooms in the city"], correct: "A loyalty guest's promised suite was overbooked, risking retention", explanation: "Name the real problem: a service failure that threatens a loyal guest's future business." },
      { prompt: "Which is the STRONGER recommendation?", choices: ["\"I'll try to find you another room and we value your business.\"", "\"I'll upgrade you to the Penthouse suite at no charge with an anniversary setup tonight, and add a loyalty-suite buffer so this can't repeat — measured by repeat-booking rate.\"", "\"Customer service is important for retention.\"", "\"Sorry, that's all I can do right now.\""], correct: "\"I'll upgrade you to the Penthouse suite at no charge with an anniversary setup tonight, and add a loyalty-suite buffer so this can't repeat — measured by repeat-booking rate.\"", explanation: "It's specific, has a business reason, an implementation, and a metric — the full recommendation structure." }
    ],
    write: {
      instruction: "Write ONE recommendation for this scenario using the structure: recommendation → business reason → how you'd measure it. Speak as the manager.",
      placeholder: "I recommend that we… because… and I'd measure success by…",
      rubric: [
        "States a specific recommendation (a concrete action, not 'try to help')",
        "Gives a business reason (retention, revenue, loyalty, cost, or brand)",
        "Names a measurable outcome (a number the business would watch)",
        "Sounds like the manager speaking to the guest, in character"
      ]
    },
    followUp: {
      speaker: "Judge (as the guest)",
      question: "That's a generous offer — but how do I know the hotel won't just overbook my suite again next year?",
      note: "A skeptical follow-up. Defend your going-forward fix with a business reason — don't just apologize again."
    }
  },

  provenanceNote: "Teaching lesson — original instruction, not official DECA material. The scenario and examples are illustrative; real events use official performance indicators.",
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

const hosaScenarioInteraction: RoleplayLesson = {
  slug: "how-hosa-scenario-interaction-works",
  track: "hosa",
  organization: "HOSA",
  title: "How a HOSA Scenario Interaction Works",
  subtitle: "A real professional conversation with a patient — not a speech, not a quiz.",
  estimatedMinutes: 15,
  eventType: "HOSA scenario interaction (patient-facing communication practice)",

  intro: [
    "HOSA includes written tests, presentations, clinical skill performances, team events, and scenario-based events. This lesson teaches the communication foundation used in applicable patient-facing and scenario events. Your exact official event guideline remains the source of truth.",
    "A HOSA scenario interaction is a short professional conversation. You're given a health-science situation and a role — a clinic volunteer, a nursing assistant, a pharmacy tech — and you talk with a person (the judge) who has a real concern. Your job is to handle that conversation the way a caring, careful professional would: listen, understand the concern, explain clearly, and give an appropriate next step.",
    "The single biggest shift for beginners: this is a CONVERSATION, not a speech. You are not delivering facts at someone. You are talking WITH a worried person, staying inside what your role is actually allowed to do. By the end you'll know the whole interaction, a simple framework for every reply, and what the feedback in these events often rewards: empathy, clarity, boundaries, and responsiveness — alongside the accurate terminology and event-specific rubric steps your event may also score."
  ],
  keyIdeas: [
    { term: "Scenario interaction", plain: "You perform a workplace conversation in a specific health role. The point is HOW you interact — warmth, clarity, and safe, appropriate help — not how many facts you recite." },
    { term: "Conversation vs. speech", plain: "A speech talks AT someone; a conversation responds TO them. You listen, acknowledge, ask, and adapt to what the person actually said." },
    { term: "Your assigned role", plain: "You can only do what that role is allowed to do. A volunteer or aide explains and reassures and refers — they don't diagnose or promise medical outcomes." },
    { term: "Professional boundaries", plain: "Staying inside your scope: no diagnosing, no guaranteeing results, no sharing what you shouldn't. Knowing your limits is itself scored." },
    { term: "The feedback", plain: "In applicable patient-facing scenario events, feedback may reward empathy, clarity, professional boundaries, responsiveness, and an appropriate next step. It is not based on vocabulary alone; accurate terminology and event-specific rubric steps may also matter, depending on the event. The current official rating sheet remains the authority." }
  ],
  timeline: [
    "Read the scenario",
    "Identify your role",
    "Identify the other person and who they are to you",
    "Identify their main concern",
    "Identify your professional boundaries",
    "Open professionally and warmly",
    "Acknowledge the concern before explaining anything",
    "Ask one useful clarifying question",
    "Respond in plain language",
    "Handle a follow-up worry",
    "Check that they understood",
    "Give an appropriate next step",
    "Close professionally",
    "Receive feedback",
  ],
  framework: {
    name: "The interaction framework",
    steps: [
      "Acknowledge — name and validate the person's feeling first",
      "Clarify — ask one question to understand what they actually mean",
      "Respond safely — explain in plain language, inside your role",
      "Check understanding — make sure it landed",
      "Next step — give a sound, appropriate action"
    ],
    note: "Run this loop for each concern. Beginners jump straight to 'Respond' with facts; professionals always Acknowledge and Clarify first."
  },
  scenario: {
    title: "Scenario: who can see my records?",
    text: "You are a clinic volunteer helping at the front desk. A patient checking in is visibly anxious and says, 'I don't want my family or my employer finding out what I'm here for — who can actually see my medical information?' The judge is playing that patient. Reassure them appropriately and explain, in plain language, without promising anything outside your role.",
  },
  prepOutline: {
    title: "Plan the interaction (quick)",
    note: "You're planning how to be with this person — not a script to recite.",
    items: [
      "Role: clinic volunteer. The person: an anxious patient. Their concern: privacy of their records.",
      "Boundary check: I can reassure and explain general privacy practice + point them to the right staff. I CANNOT promise specifics about their case or access their record.",
      "Acknowledge the fear first ('That's a really understandable thing to worry about').",
      "Clarify what they're most worried about (family? employer? something specific?).",
      "Explain generally in plain language — protected, not automatically shared — without absolute promises.",
      "Check understanding, then next step: connect them to the nurse or privacy officer for specifics."
    ]
  },

  weakExample: {
    title: "Ineffective interaction",
    lines: [
      { speaker: "You", text: "Under HIPAA, protected health information is restricted to covered entities and their business associates per the minimum necessary standard.", note: "A speech, not a conversation. Recites jargon before even acknowledging the person — the anxious patient is more scared, not less." },
      { speaker: "Patient", text: "…I don't know what any of that means. I just don't want my job finding out." },
      { speaker: "You", text: "Don't worry, no one will ever see anything, I promise.", note: "Over-promises outside the volunteer's role — a boundary violation — and still hasn't answered the real worry (the employer)." },
      { speaker: "You", text: "Anyway, you can go sit down.", note: "Ends with no check for understanding and no appropriate next step. The patient leaves unsure and unheard." }
    ]
  },
  strongExample: {
    title: "Effective interaction",
    lines: [
      { speaker: "You", text: "That's a really understandable thing to be worried about — a lot of people ask this, and it's good that you did.", note: "Acknowledges and validates the feeling FIRST. The patient feels heard before any information arrives." },
      { speaker: "You", text: "Can I ask — is there someone in particular you're worried might find out, like your employer or a family member?", note: "One useful clarifying question. Now the response can target the ACTUAL worry instead of a generic lecture." },
      { speaker: "Patient", text: "My employer. I don't want work knowing I was here." },
      { speaker: "You", text: "Okay. In plain terms: your medical information is generally protected, and it is not automatically shared with your employer simply because you received care here. There are specific situations where information may legally be shared, so I don't want to make an overly broad promise.", note: "Plain language that answers the employer worry generally — and honestly names its own limits instead of making an absolute guarantee a volunteer can't make." },
      { speaker: "Patient", text: "But what if someone I know works here and sees my file?" },
      { speaker: "You", text: "That's a fair question, and I don't want to guess at the specifics. I can bring over our privacy officer or another qualified staff member right now — they can explain exactly how the rules apply to your situation, including who can access your record and when.", note: "Refers case-specific rules to qualified staff instead of improvising them — knowing what is NOT yours to answer is itself the professional skill." },
      { speaker: "You", text: "Would that help? I want to make sure you're comfortable before you go in.", note: "Checks understanding instead of assuming, keeping it a two-way conversation." },
      { speaker: "You", text: "You're in good hands — I'll go get them now so you can ask anything else directly.", note: "Closes warmly with a concrete, appropriate next step within the volunteer role." }
    ]
  },

  commonMistakes: [
    { title: "Delivering a speech instead of having a conversation", explanation: "Talking AT the patient with a block of facts. Respond to what THEY said; leave room for them to talk back." },
    { title: "Reciting facts before acknowledging the person", explanation: "Jumping to information before naming their feeling makes an anxious person more anxious. Acknowledge first, always." },
    { title: "Sounding robotic", explanation: "A flat, textbook tone reads as uncaring. Warmth is part of the score." },
    { title: "Asking irrelevant questions", explanation: "Clarify to understand the real worry — don't ask questions that don't move the conversation." },
    { title: "Using unexplained medical terminology", explanation: "Jargon like 'covered entity' without plain-language translation confuses the person you're trying to help." },
    { title: "Making promises outside your role", explanation: "'No one will ever see anything, I promise' oversteps a volunteer's scope. Reassure honestly, avoid absolute guarantees, and refer case-specific rules to qualified staff — never state legal specifics you're not qualified to give." },
    { title: "Not answering the actual concern", explanation: "Giving a generic privacy talk when the person is specifically worried about their employer misses the point." },
    { title: "Ending without checking understanding", explanation: "Closing without confirming it landed — and without a next step — leaves the patient unsure and unheard." }
  ],

  practice: {
    intro: "Now hold the conversation. Read the situation, make the right early moves, then respond in your OWN words — a coach will give you feedback on exactly what you write, judged against the rubric below.",
    identify: [
      { prompt: "What is your ROLE here?", choices: ["The patient's doctor", "A clinic volunteer at the front desk", "A hospital administrator", "The patient's family member"], correct: "A clinic volunteer at the front desk", explanation: "You're a volunteer — you can reassure, explain generally, and refer, but not diagnose or promise specifics." },
      { prompt: "What is the patient's MAIN concern?", choices: ["The cost of the visit", "That their medical information could reach their employer or family", "How long the wait is", "Which medication to take"], correct: "That their medical information could reach their employer or family", explanation: "Their worry is privacy — specifically who can see their information. Answer THAT, not a generic topic." },
      { prompt: "Which OPENING is stronger?", choices: ["\"Under HIPAA, protected health information is restricted to covered entities.\"", "\"That's a really understandable thing to worry about — can I ask who you're most concerned might find out?\"", "\"Don't worry, no one will ever see anything, I promise.\"", "\"You can just go sit down, it's fine.\""], correct: "\"That's a really understandable thing to worry about — can I ask who you're most concerned might find out?\"", explanation: "It acknowledges the feeling first and clarifies the real worry — and it stays inside the volunteer's role." },
      { prompt: "Which is INSIDE a volunteer's professional boundaries?", choices: ["Promising the record will never be seen by anyone", "Diagnosing why they're anxious", "Explaining general privacy practice and offering to bring the nurse or privacy officer", "Telling them their employer definitely already knows"], correct: "Explaining general privacy practice and offering to bring the nurse or privacy officer", explanation: "Reassure honestly within general practice and refer to the right person for specifics — that's the volunteer's lane." }
    ],
    write: {
      instruction: "The patient says they're worried their EMPLOYER might find out they were here. Write your response using the framework: acknowledge → explain generally in plain language (no absolute promises) → offer an appropriate next step. Stay in your role.",
      placeholder: "I can understand why that worries you… In general terms… If it would help, I can…",
      rubric: [
        "Acknowledges the patient's concern before explaining",
        "Explains generally in plain language (no unexplained jargon)",
        "Avoids absolute promises (no 'never', 'no one will ever', or guarantees)",
        "Stays within the volunteer role (no diagnosing, no legal specifics)",
        "Refers case-specific details to qualified staff (privacy officer or nurse)"
      ]
    },
    followUp: {
      speaker: "Patient",
      question: "But what if someone I know works here and looks at my file out of curiosity?",
      note: "A harder follow-up. Answer honestly, avoid absolute promises, and refer the case-specific details to qualified staff — that referral is the professional move."
    }
  },

  provenanceNote: "Teaching lesson — original instruction, not official HOSA material. The scenario and examples are illustrative and generic; they are never scored as official. Privacy explanations are illustrative communication practice, not legal guidance.",
  supportingLink: { label: "Need help with a medical term?", note: "Optional: review the related medical-terminology cards. This is support — the role-play is the lesson." },
  nextLesson: { label: "Reading and Decoding a HOSA Scenario", note: "Next you'll learn to pull your role, the person, their concern, and your boundaries out of a fresh scenario fast." },
  courseMap: [
    "0. HOSA Event Navigator — identify your exact event and what it contains",
    "1. How a HOSA Scenario Interaction Works",
    "2. Reading and Decoding the Scenario",
    "3. Planning the Interaction",
    "4. Opening Professionally",
    "5. Empathy and Active Listening",
    "6. Clarifying Questions",
    "7. Plain-Language Explanations",
    "8. Professional Boundaries",
    "9. Handling Follow-Up Concerns",
    "10. Checking Understanding and Closing",
    "11. Guided Full Scenario"
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
