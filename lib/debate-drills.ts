// General Debate concept-drill bank.
//
// PROVENANCE: All questions are ORIGINAL, hand-authored items that teach transferable debate
// reasoning (argument construction, refutation, evidence quality, impact weighing). They are NOT
// reproduced from any published practice set, tournament packet, or protected source. Same rule as
// the HOSA Medical Terminology bank: teach the concept, never copy protected material.
//
// Each area maps to a General Debate Skill (by slug) so grading writes MasteryProgress and spaced
// review on the right skill. "weighing" maps to a skill that must be seeded (debate-weighing); until
// it exists, its spaced-review/mastery writes are skipped gracefully (never fake progress).

export type DrillArea = "claim-warrant-impact" | "rebuttal" | "evidence-evaluation" | "weighing";

export const DRILL_AREAS: Array<{ id: DrillArea; label: string; skillSlug: string; description: string }> = [
  { id: "claim-warrant-impact", label: "Claim / Warrant / Impact", skillSlug: "debate-claim-building", description: "Build a complete argument: claim, the reasoning that proves it, and why it matters." },
  { id: "rebuttal", label: "Rebuttal", skillSlug: "debate-rebuttal", description: "Answer an opposing argument directly and strategically." },
  { id: "evidence-evaluation", label: "Evidence evaluation", skillSlug: "debate-evidence", description: "Judge which evidence actually supports a claim and how strong it is." },
  { id: "weighing", label: "Weighing", skillSlug: "debate-weighing", description: "Compare impacts and explain which should decide the round." }
];

export const DRILL_SKILL_SLUGS = DRILL_AREAS.map((a) => a.skillSlug);

export type DrillQuestion = {
  id: string;
  area: DrillArea;
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

// Original item bank. IDs are stable so review scheduling can reference them.
export const DRILL_BANK: DrillQuestion[] = [
  // --- Claim / Warrant / Impact ---
  { id: "cw-01", area: "claim-warrant-impact", question: "Which is a COMPLETE argument (claim + warrant + impact)?", choices: ["Cities should add bike lanes.", "Cities should add bike lanes because separated lanes cut cyclist collisions, so more people ride and traffic deaths fall.", "Bike lanes are popular in Europe.", "I feel bike lanes make cities nicer."], correctAnswer: "Cities should add bike lanes because separated lanes cut cyclist collisions, so more people ride and traffic deaths fall.", explanation: "A complete argument states the claim (add bike lanes), the warrant (separation cuts collisions), and the impact (fewer deaths). The others give only a claim, an observation, or an opinion." },
  { id: "cw-02", area: "claim-warrant-impact", question: "The 'warrant' of an argument is the part that:", choices: ["States your position", "Explains WHY the claim is true", "Describes the real-world consequence", "Cites a source"], correctAnswer: "Explains WHY the claim is true", explanation: "The warrant is the reasoning link — why the claim follows. The claim is the position; the impact is the consequence; a citation is evidence, not a warrant." },
  { id: "cw-03", area: "claim-warrant-impact", question: "An argument has a claim and evidence but the judge asks 'so what?'. What is missing?", choices: ["The impact", "The claim", "A rebuttal", "A source"], correctAnswer: "The impact", explanation: "'So what?' is a request for the impact — why the argument matters to the round. The claim and evidence are present; the consequence is not." },
  { id: "cw-04", area: "claim-warrant-impact", question: "Which turns a weak claim ('social media is bad') into a debatable one?", choices: ["Social media is really, really bad.", "Everyone knows social media is bad.", "Social media harms teens because algorithmic feeds increase comparison, raising anxiety.", "Social media has existed since the 2000s."], correctAnswer: "Social media harms teens because algorithmic feeds increase comparison, raising anxiety.", explanation: "A debatable claim is specific and carries a warrant (mechanism) and impact. Intensifiers, appeals to popularity, and background facts don't make a claim arguable." },
  { id: "cw-05", area: "claim-warrant-impact", question: "In 'claim, warrant, impact', the impact should ideally be:", choices: ["As long as possible", "Tied to something the judge cares about (harm, magnitude, people affected)", "A restatement of the claim", "Always about money"], correctAnswer: "Tied to something the judge cares about (harm, magnitude, people affected)", explanation: "Impacts persuade when they connect to values the judge weighs — scale, severity, who is affected. Restating the claim or defaulting to money isn't inherently impactful." },
  { id: "cw-06", area: "claim-warrant-impact", question: "Which sentence is ONLY a claim, with no warrant?", choices: ["Nuclear power is safe because modern reactors passively shut down without operator action.", "Nuclear power is the best energy source.", "Nuclear power is safe: its death rate per unit of energy is among the lowest measured.", "Nuclear power is safe because containment designs limit radiation release."], correctAnswer: "Nuclear power is the best energy source.", explanation: "A bare claim asserts a position with no 'because'. The others each supply a reason (warrant)." },
  { id: "cw-07", area: "claim-warrant-impact", question: "A strong warrant most importantly:", choices: ["Uses big vocabulary", "Gives a logical reason the claim follows", "Repeats the claim louder", "Names a famous person"], correctAnswer: "Gives a logical reason the claim follows", explanation: "Warrants are about logical connection, not vocabulary, repetition, or authority name-drops." },
  { id: "cw-08", area: "claim-warrant-impact", question: "Which best completes the impact? 'We should ban single-use plastics because they persist for centuries, so...'", choices: ["...plastics are everywhere.", "...marine ecosystems accumulate lasting damage that harms food supplies.", "...people use a lot of plastic.", "...plastic is cheap."], correctAnswer: "...marine ecosystems accumulate lasting damage that harms food supplies.", explanation: "The impact should state the meaningful consequence of the warrant (persistence → lasting ecosystem harm → human food supply). The others restate facts without a consequence." },
  { id: "cw-09", area: "claim-warrant-impact", question: "Why do judges reward explicit warrants?", choices: ["They make speeches longer", "They let the judge see the logic instead of assuming it", "They sound more confident", "They are required by the rules"], correctAnswer: "They let the judge see the logic instead of assuming it", explanation: "An explicit warrant shows the reasoning so the judge doesn't have to fill it in (and may fill it in against you). It's about transparency of logic." },

  // --- Rebuttal ---
  { id: "rb-01", area: "rebuttal", question: "Opponent: 'Raising the minimum wage cuts jobs.' Which is the most DIRECT rebuttal?", choices: ["Minimum wage is a popular policy.", "Our plan also helps the environment.", "Studies of recent increases found no measurable employment drop, so the job-loss link is unproven.", "The opponent is wrong about everything."], correctAnswer: "Studies of recent increases found no measurable employment drop, so the job-loss link is unproven.", explanation: "A direct rebuttal engages the specific claim (job loss) with a reason it fails. Changing the subject, asserting popularity, or a blanket dismissal do not answer the argument." },
  { id: "rb-02", area: "rebuttal", question: "A 'turn' in debate is when you:", choices: ["Ignore the opponent's argument", "Show the opponent's own argument actually supports YOUR side", "Repeat your first speech", "Ask the judge to disregard the round"], correctAnswer: "Show the opponent's own argument actually supports YOUR side", explanation: "A turn flips an argument so its logic favors you (e.g., 'that harm is actually worse under their plan'). It's more powerful than merely blocking the argument." },
  { id: "rb-03", area: "rebuttal", question: "Which rebuttal structure is clearest for the judge?", choices: ["They say X. I disagree.", "They say X. But X is wrong because [reason], which means [impact for the round].", "X is bad and so is their whole case.", "Let me tell you about my own argument instead."], correctAnswer: "They say X. But X is wrong because [reason], which means [impact for the round].", explanation: "Name the argument, give the reason it fails, and state what that does to the round. 'I disagree' has no reason; the others don't engage." },
  { id: "rb-04", area: "rebuttal", question: "If you have limited time and the opponent made five points, you should first answer:", choices: ["The easiest point", "The point most important to their winning the round", "All five equally and quickly", "The point you find most interesting"], correctAnswer: "The point most important to their winning the round", explanation: "Prioritize the load-bearing argument — the one that decides the round if it stands. Spreading thin or picking easy/interesting points wastes the clash." },
  { id: "rb-05", area: "rebuttal", question: "Opponent drops (never answers) your main argument. In rebuttal you should:", choices: ["Drop it too, to be fair", "Extend it and explain why the dropped argument now decides the round", "Start a brand-new argument", "Say nothing about it"], correctAnswer: "Extend it and explain why the dropped argument now decides the round", explanation: "A conceded argument is strongest — extend it and weigh it. Dropping it back or ignoring it wastes the advantage; new arguments in late speeches are often disallowed." },
  { id: "rb-06", area: "rebuttal", question: "Which is NOT genuine refutation?", choices: ["Pointing out the opponent's evidence doesn't actually mention their claim", "Showing the opponent's warrant has a false assumption", "Restating your own contention louder", "Demonstrating the impact is exaggerated"], correctAnswer: "Restating your own contention louder", explanation: "Refutation engages the opponent's argument (evidence mismatch, false assumption, exaggerated impact). Re-asserting your case is not answering theirs." },
  { id: "rb-07", area: "rebuttal", question: "The best response to weak evidence is usually to:", choices: ["Call the opponent a liar", "Explain specifically why the evidence doesn't prove the claim", "Bring louder evidence unrelated to it", "Ignore it and hope the judge does too"], correctAnswer: "Explain specifically why the evidence doesn't prove the claim", explanation: "Attack the link between the evidence and the claim (dated, unrepresentative, doesn't say what they claim). Insults and avoidance aren't arguments." },
  { id: "rb-08", area: "rebuttal", question: "'Even if' rebuttal (e.g., 'even if their plan works, it still...') is useful because it:", choices: ["Concedes the whole round", "Gives you a fallback that wins even if you lose the first point", "Confuses the judge on purpose", "Is required in every speech"], correctAnswer: "Gives you a fallback that wins even if you lose the first point", explanation: "'Even if' builds layered defense: you contest the claim AND show you still win if it stands. It's strategic depth, not concession." },
  { id: "rb-09", area: "rebuttal", question: "Signposting in rebuttal means:", choices: ["Telling the judge which argument you are answering before you answer it", "Holding up a sign", "Ending early", "Speaking faster"], correctAnswer: "Telling the judge which argument you are answering before you answer it", explanation: "Signposting ('On their first contention...') tells the judge where you are on the flow, so your answers land against the right arguments." },

  // --- Evidence evaluation ---
  { id: "ev-01", area: "evidence-evaluation", question: "Which evidence most strongly supports 'this policy reduces crime'?", choices: ["A columnist says the policy feels tough on crime.", "A controlled study found cities adopting the policy saw crime fall more than similar cities that didn't.", "A politician promises it will reduce crime.", "The policy is popular in polls."], correctAnswer: "A controlled study found cities adopting the policy saw crime fall more than similar cities that didn't.", explanation: "A comparison against similar control cities isolates the policy's effect. Opinion, promises, and popularity don't establish that the policy caused the change." },
  { id: "ev-02", area: "evidence-evaluation", question: "A study from 1998 is used to prove a claim about current smartphone use. The main weakness is:", choices: ["It is too short", "It may be outdated for a fast-changing topic", "It has too many authors", "It is a study at all"], correctAnswer: "It may be outdated for a fast-changing topic", explanation: "Recency matters most when the subject changes quickly. Age isn't always disqualifying, but for smartphone behavior a 1998 study likely predates the phenomenon." },
  { id: "ev-03", area: "evidence-evaluation", question: "'9 out of 10 dentists recommend it' is weak if:", choices: ["Dentists are experts", "We don't know how many dentists were asked or how they were chosen", "It uses a number", "It mentions a profession"], correctAnswer: "We don't know how many dentists were asked or how they were chosen", explanation: "A statistic's strength depends on sample size and selection. Ten cherry-picked dentists is not the same as a representative survey." },
  { id: "ev-04", area: "evidence-evaluation", question: "Correlation is presented as proof of causation. The best objection is:", choices: ["Numbers can't be trusted", "Something else could cause both, or the order could be reversed", "Correlation is always false", "The source is foreign"], correctAnswer: "Something else could cause both, or the order could be reversed", explanation: "Correlation ≠ causation because of confounders or reverse causation. The blanket claims ('numbers can't be trusted', 'always false') are themselves fallacies." },
  { id: "ev-05", area: "evidence-evaluation", question: "Which source has the clearest conflict of interest for 'sugar is harmless'?", choices: ["A university nutrition department", "A study funded by a soft-drink trade group", "A government health agency", "A meta-analysis of independent studies"], correctAnswer: "A study funded by a soft-drink trade group", explanation: "Funding by a party that profits from the conclusion is a direct conflict of interest. It doesn't automatically make the study wrong, but it's the clearest bias risk here." },
  { id: "ev-06", area: "evidence-evaluation", question: "An opponent cites a real statistic but it doesn't actually mention their claim. You should argue:", choices: ["The statistic is fake", "The evidence doesn't support the claim it's attached to", "Statistics are irrelevant", "They cited too many numbers"], correctAnswer: "The evidence doesn't support the claim it's attached to", explanation: "The strongest, honest attack is the link: the evidence is real but doesn't prove THIS claim. Calling real evidence 'fake' is inaccurate and risky." },
  { id: "ev-07", area: "evidence-evaluation", question: "Between a single dramatic anecdote and a large representative dataset, the dataset is usually stronger because:", choices: ["Stories are never true", "It reflects the general pattern, not one memorable case", "It is longer", "Anecdotes are against the rules"], correctAnswer: "It reflects the general pattern, not one memorable case", explanation: "A vivid anecdote can mislead (it may be an outlier). Representative data shows what's typical. Anecdotes aren't banned or always false — just weaker for general claims." },
  { id: "ev-08", area: "evidence-evaluation", question: "The most important question to ask about a statistic is often:", choices: ["Is the number big?", "Compared to what?", "Who typed it?", "Is it round?"], correctAnswer: "Compared to what?", explanation: "Numbers gain meaning from comparison and baseline ('30% higher' — than what?). Size alone, formatting, or authorship don't establish significance." },
  { id: "ev-09", area: "evidence-evaluation", question: "Cherry-picking evidence means:", choices: ["Using only the data that fits your side and ignoring the rest", "Using fruit metaphors", "Citing too many sources", "Reading evidence aloud"], correctAnswer: "Using only the data that fits your side and ignoring the rest", explanation: "Cherry-picking selectively presents favorable data while hiding contrary evidence, distorting the true picture." },

  // --- Weighing ---
  { id: "wg-01", area: "weighing", question: "Both sides win an impact. 'Magnitude' weighing asks:", choices: ["Which impact happens sooner", "Which impact affects more people or is more severe", "Which is more likely", "Which is easier to say"], correctAnswer: "Which impact affects more people or is more severe", explanation: "Magnitude = size/severity/scope of the impact. Timeframe is about sooner; probability is about likelihood." },
  { id: "wg-02", area: "weighing", question: "'Timeframe' weighing argues your impact should win because it:", choices: ["Is larger", "Happens sooner or sets off other harms first", "Is more certain", "Is more original"], correctAnswer: "Happens sooner or sets off other harms first", explanation: "Timeframe prioritizes impacts that occur first, especially if they trigger or foreclose others. Size is magnitude; certainty is probability." },
  { id: "wg-03", area: "weighing", question: "'Probability' weighing tells the judge to prefer your impact because it:", choices: ["Sounds scarier", "Is more likely to actually happen", "Is bigger if it happens", "Comes first"], correctAnswer: "Is more likely to actually happen", explanation: "Probability weighs how likely each impact is. A smaller, near-certain harm can outweigh a huge but speculative one." },
  { id: "wg-04", area: "weighing", question: "Why is explicit weighing important even when you're winning arguments?", choices: ["It fills time", "It tells the judge HOW to decide when both sides have impacts", "It is required by rule", "It sounds aggressive"], correctAnswer: "It tells the judge HOW to decide when both sides have impacts", explanation: "Without weighing, the judge chooses which impacts matter — maybe against you. Weighing gives them your framework for the decision." },
  { id: "wg-05", area: "weighing", question: "Which is a weighing argument, not just an impact?", choices: ["Climate change displaces millions.", "Our economic harm outweighs their climate impact because it is far more probable in the next year.", "The economy could suffer.", "Millions could be displaced."], correctAnswer: "Our economic harm outweighs their climate impact because it is far more probable in the next year.", explanation: "Weighing compares two impacts on a named metric (probability + timeframe). The others state a single impact without comparison." },
  { id: "wg-06", area: "weighing", question: "An impact that is huge but very unlikely is best answered by weighing on:", choices: ["Magnitude", "Probability", "Word count", "Volume"], correctAnswer: "Probability", explanation: "If an impact is large but improbable, argue probability: prefer the more likely harm. Meeting magnitude with magnitude concedes their frame." },
  { id: "wg-07", area: "weighing", question: "'Reversibility' weighing argues an impact matters more because:", choices: ["It can be undone easily", "Once it happens it cannot be undone", "It is cheaper", "It is popular"], correctAnswer: "Once it happens it cannot be undone", explanation: "Irreversible harms (extinction, lost lives, ecosystem collapse) weigh heavily because there's no recovery — a common and powerful weighing standard." },
  { id: "wg-08", area: "weighing", question: "The purpose of a weighing framework stated early in the round is to:", choices: ["Confuse the opponent", "Set the standard the judge uses before impacts are compared", "Use up prep time", "Avoid making arguments"], correctAnswer: "Set the standard the judge uses before impacts are compared", explanation: "Establishing the framework early (e.g., 'prefer probability') shapes how every later impact is judged, before the clash on impacts happens." },
  { id: "wg-09", area: "weighing", question: "Two impacts are equal in size and likelihood. The best remaining weighing move is:", choices: ["Repeat your impact", "Introduce timeframe or reversibility to break the tie", "Concede", "Speak louder"], correctAnswer: "Introduce timeframe or reversibility to break the tie", explanation: "When magnitude and probability tie, a different axis (timeframe, reversibility) breaks the tie. Repetition and volume don't give the judge a reason." }
];

export type DrillMode = "focused" | "mixed";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Draw a session of `count` original questions. If `areas` is given, restrict to them (focused drill).
export function buildDrillSession(count: number, areas?: DrillArea[]): DrillQuestion[] {
  const pool = areas && areas.length > 0 ? DRILL_BANK.filter((q) => areas.includes(q.area)) : DRILL_BANK;
  const shuffled = shuffle(pool);
  if (count <= shuffled.length) return shuffled.slice(0, count);
  const result = [...shuffled];
  while (result.length < count) result.push(...shuffle(pool));
  return result.slice(0, count);
}

export type DrillAnswer = { id: string; selected: string };

export type DrillGradedItem = { id: string; area: DrillArea; correct: boolean; correctAnswer: string; explanation: string };

export type DrillSkillResult = { area: DrillArea; skillSlug: string; label: string; total: number; correct: number; scorePercent: number; passed: boolean };

export type DrillResult = {
  total: number;
  correctCount: number;
  scorePercent: number;
  items: DrillGradedItem[];
  perSkill: DrillSkillResult[]; // one entry per area/skill present in the session
};

export const DRILL_PASS_THRESHOLD = 70;

// Server-authoritative grading from the bank, broken down per skill so each skill's mastery and
// spaced review update independently.
export function gradeDrillAnswers(answers: DrillAnswer[]): DrillResult {
  const byId = new Map(DRILL_BANK.map((q) => [q.id, q]));
  const items: DrillGradedItem[] = [];
  const areaTally = new Map<DrillArea, { total: number; correct: number }>();

  for (const answer of answers) {
    const q = byId.get(answer.id);
    if (!q) continue;
    const correct = answer.selected === q.correctAnswer;
    items.push({ id: q.id, area: q.area, correct, correctAnswer: q.correctAnswer, explanation: q.explanation });
    const tally = areaTally.get(q.area) ?? { total: 0, correct: 0 };
    tally.total += 1;
    if (correct) tally.correct += 1;
    areaTally.set(q.area, tally);
  }

  const total = items.length;
  const correctCount = items.filter((i) => i.correct).length;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const perSkill: DrillSkillResult[] = Array.from(areaTally.entries()).map(([area, tally]) => {
    const meta = DRILL_AREAS.find((a) => a.id === area);
    const pct = tally.total > 0 ? Math.round((tally.correct / tally.total) * 100) : 0;
    return {
      area,
      skillSlug: meta?.skillSlug ?? "",
      label: meta?.label ?? area,
      total: tally.total,
      correct: tally.correct,
      scorePercent: pct,
      passed: pct >= DRILL_PASS_THRESHOLD
    };
  });

  return { total, correctCount, scorePercent, items, perSkill };
}
