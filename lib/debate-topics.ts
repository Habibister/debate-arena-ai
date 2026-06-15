import type { Level, PracticeMode } from "@prisma/client";

export const DEBATE_TOPIC_CATEGORIES = [
  "Technology",
  "Education",
  "Social Media",
  "Government",
  "Ethics",
  "Environment",
  "Health",
  "Youth Issues",
  "School Policy",
  "Sports",
  "Economics",
  "Criminal Justice",
  "International Relations",
  "Artificial Intelligence",
  "Free Speech"
] as const;

export const DEBATE_CATEGORY_OPTIONS = ["Global", ...DEBATE_TOPIC_CATEGORIES] as const;

export type DebateTopicCategory = (typeof DEBATE_CATEGORY_OPTIONS)[number];

export const DEBATE_MOTION_BANK: Record<(typeof DEBATE_TOPIC_CATEGORIES)[number], string[]> = {
  Technology: [
    "This House would require every high school to teach cybersecurity basics.",
    "This House believes phone-free school days improve student learning.",
    "This House would make digital privacy labels mandatory for popular apps.",
    "This House believes schools should teach students how recommendation algorithms work.",
    "This House would prioritize public broadband access over smart-city surveillance tools.",
    "This House believes students should learn basic data literacy before graduation.",
    "This House would require app stores to flag manipulative design features.",
    "This House believes wearable tech in schools should be opt-in only.",
    "This House would fund local technology repair programs for students.",
    "This House believes digital ID systems create more risk than benefit for minors."
  ],
  Education: [
    "This House would require financial literacy before high school graduation.",
    "This House believes grades should include revision opportunities by default.",
    "This House would replace some homework with supervised practice labs.",
    "This House believes school schedules should start later for teenagers.",
    "This House would make media literacy a required core subject.",
    "This House believes standardized tests should count less in school accountability.",
    "This House would require all students to complete a career exploration project.",
    "This House believes schools should teach negotiation and public speaking.",
    "This House would expand dual-enrollment access for rural students.",
    "This House believes project portfolios should matter more than final exams."
  ],
  "Social Media": [
    "This House would require teen social media accounts to default to private.",
    "This House believes platforms should remove public like counts for minors.",
    "This House would ban infinite scroll on apps designed for teenagers.",
    "This House believes schools should teach students how to manage online reputation.",
    "This House would require platforms to show why a post is recommended.",
    "This House believes short-form video platforms harm attention more than they help creativity.",
    "This House would require social media companies to publish youth safety audits.",
    "This House believes creator culture creates unrealistic career expectations for students.",
    "This House would allow users to choose chronological feeds by default.",
    "This House believes online communities are better for youth activism than traditional clubs."
  ],
  Government: [
    "This House would lower the voting age in local elections to sixteen.",
    "This House believes cities should create youth advisory councils with real budget input.",
    "This House would require plain-language summaries for major public policies.",
    "This House believes public agencies should audit algorithms before using them.",
    "This House would make public transportation free for students.",
    "This House believes governments should prioritize prevention programs over punishment.",
    "This House would require civic education to include local government simulations.",
    "This House believes participatory budgeting should be used in school districts.",
    "This House would limit campaign advertising on platforms used mostly by minors.",
    "This House believes government services should remain available offline."
  ],
  Ethics: [
    "This House would require companies to label AI-generated customer service interactions.",
    "This House believes schools should prioritize restorative accountability over zero-tolerance rules.",
    "This House would ban persuasive design features that target minors.",
    "This House believes convenience is a weak justification for collecting personal data.",
    "This House would require student consent before using classroom analytics tools.",
    "This House believes public health messaging may use emotional appeals when facts alone fail.",
    "This House would restrict facial recognition in public schools.",
    "This House believes unpaid internships should be illegal unless they include academic credit.",
    "This House would require businesses to disclose when prices are personalized by data.",
    "This House believes competitive success should not excuse harmful team cultures."
  ],
  Environment: [
    "This House would require schools to publish yearly energy-use reports.",
    "This House believes climate adaptation should receive more funding than climate awareness campaigns.",
    "This House would make reusable lunch systems standard in public schools.",
    "This House believes cities should prioritize tree canopy over additional parking.",
    "This House would require environmental impact labels on fast-fashion products.",
    "This House believes youth climate councils should review local infrastructure plans.",
    "This House would subsidize home energy upgrades before electric vehicle purchases.",
    "This House believes schools should replace some lawns with native plant habitats.",
    "This House would tax single-use packaging to fund local recycling education.",
    "This House believes climate education should emphasize practical adaptation skills."
  ],
  Health: [
    "This House would require mental health first-aid training for student leaders.",
    "This House believes schools should provide free basic health screenings.",
    "This House would expand school-based clinics in underserved communities.",
    "This House believes prevention campaigns should receive more funding than emergency response.",
    "This House would require nutrition education to include label-reading practice.",
    "This House believes sleep education should be part of health class.",
    "This House would allow students to take mental health days as excused absences.",
    "This House believes public health agencies should focus on trust-building before crisis messaging.",
    "This House would require basic CPR training before graduation.",
    "This House believes youth sports programs should prioritize injury prevention over winning."
  ],
  "Youth Issues": [
    "This House would create paid youth seats on city advisory boards.",
    "This House believes teenagers should have more control over school technology policies.",
    "This House would fund youth entrepreneurship grants through local governments.",
    "This House believes student voice should shape school discipline codes.",
    "This House would make public libraries youth career hubs after school.",
    "This House believes minors should have stronger privacy rights online.",
    "This House would require employers to publish teen worker rights in plain language.",
    "This House believes students should help design community safety programs.",
    "This House would expand free transit access for young people.",
    "This House believes youth-led nonprofits should receive more public funding."
  ],
  "School Policy": [
    "This House would replace zero-tolerance discipline with restorative systems.",
    "This House believes schools should ban phone use during instructional time.",
    "This House would require AI-use policies to separate cheating from responsible support.",
    "This House believes schools should make debate or public speaking a graduation option.",
    "This House would allow students to revise major assignments for partial credit.",
    "This House believes attendance policies should account for mental health.",
    "This House would require schools to publish homework-load guidelines.",
    "This House believes school dress codes should be rewritten by student committees.",
    "This House would make peer tutoring part of every high school schedule.",
    "This House believes schools should end class rankings."
  ],
  Sports: [
    "This House would require youth teams to guarantee equal playing time through middle school.",
    "This House believes school sports should require academic skill workshops.",
    "This House would limit year-round specialization for young athletes.",
    "This House believes esports should be treated as a school activity like traditional sports.",
    "This House would require concussion education for all student athletes.",
    "This House believes public funding should prioritize recreational sports over elite travel teams.",
    "This House would pay student athletes for commercial use of their likeness.",
    "This House believes coaches should be evaluated on player wellbeing as much as wins.",
    "This House would require gender-equity audits for school athletic programs.",
    "This House believes youth sports should ban public ranking systems before high school."
  ],
  Economics: [
    "This House would require schools to teach taxes through real-world simulations.",
    "This House believes cities should support small businesses before courting large corporations.",
    "This House would expand paid apprenticeships for high school students.",
    "This House believes financial education should include consumer protection.",
    "This House would require transparent pricing for subscription services used by minors.",
    "This House believes entrepreneurship classes should include failure analysis.",
    "This House would tax vacant commercial property to support local startups.",
    "This House believes students should learn basic labor rights before graduation.",
    "This House would prioritize job-training grants over direct business subsidies.",
    "This House believes economic policy should measure youth opportunity as a core outcome."
  ],
  "Criminal Justice": [
    "This House would replace school resource officers with trained safety counselors.",
    "This House believes restorative justice should be the default for minor youth offenses.",
    "This House would limit the use of predictive policing tools.",
    "This House believes community violence prevention should receive more funding than surveillance.",
    "This House would require legal rights education in every high school.",
    "This House believes juvenile records should be automatically sealed after rehabilitation.",
    "This House would ban facial recognition for routine policing.",
    "This House believes fines and fees unfairly punish poverty.",
    "This House would expand public defender funding before increasing police budgets.",
    "This House believes youth courts should be used more often for first-time offenses."
  ],
  "International Relations": [
    "This House would make climate resilience a condition of international development aid.",
    "This House believes student exchange programs should prioritize conflict-resolution projects.",
    "This House would create an international agreement on AI use in schools.",
    "This House believes global health cooperation should focus more on prevention infrastructure.",
    "This House would require multinational companies to publish youth labor impact reports.",
    "This House believes cultural diplomacy is undervalued in foreign policy.",
    "This House would prioritize water security in international aid.",
    "This House believes international sports events should meet stronger human rights standards.",
    "This House would create a global youth council at the United Nations.",
    "This House believes countries should share cybersecurity threat education with schools."
  ],
  "Artificial Intelligence": [
    "This House would require AI literacy certification before students use AI on major assignments.",
    "This House believes AI tutors should be allowed only when they explain their reasoning.",
    "This House would require labels on AI-generated political content.",
    "This House believes schools should teach prompt evaluation before prompt writing.",
    "This House would ban automated hiring filters for entry-level youth jobs.",
    "This House believes AI tools should cite uncertainty, not just sources.",
    "This House would require human review before AI systems affect student discipline.",
    "This House believes AI art tools should compensate creators whose work trained the models.",
    "This House would require public audits of AI used in healthcare triage.",
    "This House believes AI should be used to support teachers, not replace tutoring programs."
  ],
  "Free Speech": [
    "This House believes schools should protect unpopular student speech unless it directly disrupts safety.",
    "This House would require social platforms to explain content moderation decisions.",
    "This House believes public universities should host controversial speakers with structured student dialogue.",
    "This House would limit school punishment for off-campus online speech.",
    "This House believes anonymous student journalism should be protected.",
    "This House would require debate programs to teach speech ethics alongside persuasion.",
    "This House believes misinformation policies should focus on reach reduction, not removal.",
    "This House would protect student protest rights during the school day with reasonable limits.",
    "This House believes satire should receive stronger protection in school media.",
    "This House would require civic classes to practice disagreement across viewpoints."
  ]
};

function normalizeCategory(category?: string): DebateTopicCategory {
  const match = DEBATE_CATEGORY_OPTIONS.find((item) => item.toLowerCase() === category?.trim().toLowerCase());
  return match ?? "Global";
}

function baseMotionText(motion: string) {
  return motion
    .replace(/^This House believes that /, "")
    .replace(/^This House believes /, "")
    .replace(/^This House would /, "")
    .replace(/\.$/, "");
}

function adaptMotionToFormat(motion: string, eventType?: string) {
  const normalizedEvent = (eventType ?? "").toUpperCase();

  if (normalizedEvent.includes("QUICK") || normalizedEvent.includes("PUBLIC_FORUM")) {
    const base = baseMotionText(motion);
    return `Resolved: ${base.charAt(0).toUpperCase()}${base.slice(1)}.`;
  }

  if (normalizedEvent.includes("REBUTTAL")) {
    return `Rebuttal drill: ${motion}`;
  }

  return motion;
}

function levelBackground(level: Level) {
  if (level === "ELITE") {
    return "Elite motion with multiple stakeholders, hidden tradeoffs, and room for strategic weighing.";
  }

  if (level === "INTERMEDIATE") {
    return "Intermediate motion with a real policy tradeoff and enough clash for direct refutation.";
  }

  return "Beginner-friendly motion with a clear proposal, obvious sides, and room to practice structure.";
}

export function pickFallbackDebateTopic(input: {
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
  previousTopics?: string[];
}) {
  const category = normalizeCategory(input.focusArea);
  const pool =
    category === "Global"
      ? DEBATE_TOPIC_CATEGORIES.flatMap((item) => DEBATE_MOTION_BANK[item])
      : DEBATE_MOTION_BANK[category];
  const previous = new Set((input.previousTopics ?? []).map((topic) => topic.trim().toLowerCase()));
  const available = pool.filter((motion) => !previous.has(adaptMotionToFormat(motion, input.eventType).toLowerCase()));
  const effectivePool = available.length > 0 ? available : pool;
  const seed = Date.now() + (input.previousTopics?.length ?? 0) * 17 + category.length + input.level.length;
  const rawMotion = effectivePool[Math.abs(seed) % effectivePool.length];
  const topic = adaptMotionToFormat(rawMotion, input.eventType);

  return {
    topic,
    category,
    background: `${levelBackground(input.level)} Category: ${category}. This is original local practice content, not copied from a tournament packet.`,
    affirmativePosition: "Defend the proposal by defining the mechanism, proving the main benefit, and explaining why the status quo leaves an important problem unsolved.",
    negativePosition: "Challenge the proposal by testing feasibility, fairness, unintended consequences, and whether a narrower alternative solves with less risk.",
    suggestedEvidenceAngles: [
      "Name the stakeholders and the decision rule for the judge.",
      "Use one concrete example and connect it to a measurable impact.",
      "Compare magnitude, probability, timeframe, and reversibility."
    ]
  };
}
