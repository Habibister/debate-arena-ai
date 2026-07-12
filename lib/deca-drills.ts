// DECA concept-drill bank.
//
// PROVENANCE: All questions are ORIGINAL, hand-authored items that teach transferable DECA business
// concepts (identifying/addressing performance indicators, business reasoning about cost/feasibility/
// measurement, customer relations, marketing fundamentals). They are NOT reproduced from any DECA
// exam, sample role-play, evaluation form, or other protected source. Same rule as the HOSA MT and
// General Debate banks: teach the concept, never copy protected material.
//
// SCOPE: This is CONCEPT DRILLING only. It has nothing to do with the DECA role-play judging system
// (judgeDecaRoleplay, scenario/objection generation) or the blocked rubric point-split work. It only
// grades multiple-choice items and writes MasteryProgress + spaced review via recordDrillMastery.
//
// Each area maps to a DECA Skill (by slug). "deca-marketing" already exists; the other three must be
// seeded (surgical upsert). Until a skill exists, its writes are skipped gracefully (never faked).

export type DecaDrillArea = "performance-indicators" | "business-reasoning" | "customer-relations" | "marketing-fundamentals";

export const DECA_DRILL_AREAS: Array<{ id: DecaDrillArea; label: string; skillSlug: string; description: string }> = [
  { id: "performance-indicators", label: "Performance indicators", skillSlug: "deca-performance-indicators", description: "Identify what a performance indicator asks and address it explicitly." },
  { id: "business-reasoning", label: "Business reasoning", skillSlug: "deca-business-reasoning", description: "Reason about cost, feasibility, measurement, and ROI." },
  { id: "customer-relations", label: "Customer relations", skillSlug: "deca-customer-relations", description: "Handle customers and service situations professionally." },
  { id: "marketing-fundamentals", label: "Marketing fundamentals", skillSlug: "deca-marketing", description: "Apply the marketing mix, positioning, and promotion basics." }
];

export const DECA_DRILL_SKILL_SLUGS = DECA_DRILL_AREAS.map((a) => a.skillSlug);

export type DecaDrillQuestion = {
  id: string;
  area: DecaDrillArea;
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

// Original item bank. IDs are stable so review scheduling can reference them.
export const DECA_DRILL_BANK: DecaDrillQuestion[] = [
  // --- Performance indicators ---
  { id: "pi-01", area: "performance-indicators", question: "A role-play lists the performance indicator 'Explain the nature of positive customer relations.' The BEST way to earn it is to:", choices: ["Mention customers once in passing", "Define what positive customer relations means and explain why it matters to this business, then apply it to the scenario", "List your favorite companies", "Skip it and focus on price"], correctAnswer: "Define what positive customer relations means and explain why it matters to this business, then apply it to the scenario", explanation: "Top scores come from naming the indicator, explaining the concept, AND connecting it to the specific scenario — not just referencing the topic." },
  { id: "pi-02", area: "performance-indicators", question: "Performance indicators in a DECA role-play are best described as:", choices: ["Random trivia", "The specific business skills/knowledge the judge is scoring you on", "The names of the judges", "Your personal opinions"], correctAnswer: "The specific business skills/knowledge the judge is scoring you on", explanation: "PIs are the scored competencies drawn from the event's instructional area — they tell you exactly what to demonstrate." },
  { id: "pi-03", area: "performance-indicators", question: "You're given the PI 'Describe the nature of pricing.' A response that only says 'I'd lower the price' misses points because it:", choices: ["Is too long", "States an action without explaining the pricing concept the PI asks for", "Uses the word price", "Mentions money"], correctAnswer: "States an action without explaining the pricing concept the PI asks for", explanation: "'Describe the nature of' asks you to explain the concept (how pricing works, its role), not just take an action. Address what the verb asks." },
  { id: "pi-04", area: "performance-indicators", question: "What separates a top competitor from a good one on PIs?", choices: ["Speaking faster", "Explaining each PI and connecting it to the scenario, not just naming it", "Memorizing more PIs", "Wearing a better suit"], correctAnswer: "Explaining each PI and connecting it to the scenario, not just naming it", explanation: "Good competitors mention PIs; top competitors explain them and tie them to the situation, which is where the higher scores live." },
  { id: "pi-05", area: "performance-indicators", question: "The PI verb 'Demonstrate' (e.g., 'Demonstrate active listening') asks you to:", choices: ["Define it only", "Actually show the skill in your interaction with the judge", "Skip it", "Ask the judge to do it"], correctAnswer: "Actually show the skill in your interaction with the judge", explanation: "'Demonstrate' means perform the skill live (ask a clarifying question, paraphrase back), not merely define it." },
  { id: "pi-06", area: "performance-indicators", question: "If a scenario's PI is 'Explain the concept of market segmentation,' the strongest answer:", choices: ["Names one customer", "Defines segmentation, gives an example relevant to the business, and shows how it guides the decision", "Says 'segmentation is important'", "Lists the 50 states"], correctAnswer: "Defines segmentation, gives an example relevant to the business, and shows how it guides the decision", explanation: "Define + relevant example + application to the scenario is the full pattern judges reward." },
  { id: "pi-07", area: "performance-indicators", question: "Why should you explicitly signpost the PIs you're addressing?", choices: ["It wastes time", "It helps the judge see you hit each scored indicator", "It's against the rules", "It confuses the judge"], correctAnswer: "It helps the judge see you hit each scored indicator", explanation: "Making your PI coverage visible ('To address customer relations, I would...') helps the judge award those points confidently." },
  { id: "pi-08", area: "performance-indicators", question: "A PI reads 'Determine the impact of business ethics on decision-making.' A weak answer:", choices: ["Weighs an ethical tradeoff in the scenario", "Just says 'be ethical' with no connection to a decision", "Explains how ethics changes a specific choice", "Names an ethical principle and applies it"], correctAnswer: "Just says 'be ethical' with no connection to a decision", explanation: "The PI asks for IMPACT on decision-making. A generic 'be ethical' ignores the decision link the verb requires." },
  { id: "pi-09", area: "performance-indicators", question: "The instructional area of an event tells you:", choices: ["The lunch schedule", "The family of concepts the PIs and scenario will draw from", "The judge's name", "Nothing useful"], correctAnswer: "The family of concepts the PIs and scenario will draw from", explanation: "Instructional areas (e.g., Customer Relations, Financial Analysis) frame which PIs appear — study them to prepare." },

  // --- Business reasoning (cost / feasibility / measurement / ROI) ---
  { id: "br-01", area: "business-reasoning", question: "A judge asks 'What will this cost us?' The strongest answer includes:", choices: ["'It'll be worth it.'", "A concrete cost figure or range AND how it compares to the expected benefit", "'Costs don't matter here.'", "'I'm not sure.'"], correctAnswer: "A concrete cost figure or range AND how it compares to the expected benefit", explanation: "Business reasoning pairs a cost estimate with the return — cost alone or a vague reassurance doesn't answer the decision." },
  { id: "br-02", area: "business-reasoning", question: "ROI (return on investment) is best explained as:", choices: ["Total revenue", "The gain from an investment relative to its cost", "The number of employees", "The price of the product"], correctAnswer: "The gain from an investment relative to its cost", explanation: "ROI = (benefit − cost) / cost. It answers whether the payoff justifies the spend, not just how big revenue is." },
  { id: "br-03", area: "business-reasoning", question: "You propose a loyalty program. The judge asks how you'd MEASURE success. Best answer:", choices: ["'People will like it.'", "Track repeat-purchase rate and retention before vs. after, with a target", "'We'll just know.'", "'Sales always go up.'"], correctAnswer: "Track repeat-purchase rate and retention before vs. after, with a target", explanation: "Measurement means naming a specific metric, a baseline comparison, and a target — not a feeling or an assumption." },
  { id: "br-04", area: "business-reasoning", question: "A recommendation is 'feasible' when it:", choices: ["Sounds impressive", "Can realistically be done with the business's resources and constraints", "Is the most expensive option", "Is what a competitor did"], correctAnswer: "Can realistically be done with the business's resources and constraints", explanation: "Feasibility is about whether the plan fits the real budget, staff, time, and capabilities — not ambition or imitation." },
  { id: "br-05", area: "business-reasoning", question: "The judge says 'We tried something like this and it failed.' The best response:", choices: ["Repeat your original pitch louder", "Acknowledge it, then explain what's different about your approach and how you'd de-risk it", "Give up on the idea", "Say the last team was incompetent"], correctAnswer: "Acknowledge it, then explain what's different about your approach and how you'd de-risk it", explanation: "Strong reasoning engages the objection: what changed, and how you'd reduce the risk this time. Volume and blame don't." },
  { id: "br-06", area: "business-reasoning", question: "'Break-even' is the point where:", choices: ["Profit is highest", "Total revenue equals total costs", "You run out of inventory", "The store closes"], correctAnswer: "Total revenue equals total costs", explanation: "Break-even is where you've covered costs and start making profit beyond it — a key feasibility/measurement concept." },
  { id: "br-07", area: "business-reasoning", question: "Which best shows you considered a TRADEOFF?", choices: ["'My plan has no downsides.'", "'This raises upfront cost, but the higher retention pays it back within a quarter.'", "'Everything will be perfect.'", "'Cost is irrelevant.'"], correctAnswer: "'This raises upfront cost, but the higher retention pays it back within a quarter.'", explanation: "Acknowledging a real cost and explaining why the benefit outweighs it demonstrates mature business judgment." },
  { id: "br-08", area: "business-reasoning", question: "A judge asks for a metric to track a marketing campaign. The WEAKEST answer is:", choices: ["Conversion rate", "Cost per acquisition", "'Vibes'", "Return on ad spend"], correctAnswer: "'Vibes'", explanation: "Conversion rate, cost per acquisition, and ROAS are measurable; 'vibes' is not a metric and can't be tracked or targeted." },
  { id: "br-09", area: "business-reasoning", question: "Prioritizing recommendations by impact and effort helps because it:", choices: ["Impresses with jargon", "Directs limited resources to the highest-value, achievable actions first", "Guarantees success", "Avoids making decisions"], correctAnswer: "Directs limited resources to the highest-value, achievable actions first", explanation: "Impact/effort prioritization is practical reasoning: do the high-impact, feasible things first when resources are limited." },

  // --- Customer relations ---
  { id: "cr-01", area: "customer-relations", question: "An angry customer's reserved product is out of stock. The BEST first move:", choices: ["Explain company policy immediately", "Apologize sincerely and acknowledge the frustration before proposing a solution", "Tell them it's not your fault", "Offer nothing"], correctAnswer: "Apologize sincerely and acknowledge the frustration before proposing a solution", explanation: "Service recovery starts with empathy and ownership; leading with policy or blame escalates the conflict." },
  { id: "cr-02", area: "customer-relations", question: "'Active listening' with a customer means:", choices: ["Waiting silently to talk", "Paraphrasing their concern back to confirm you understood", "Interrupting to give advice", "Reading a script"], correctAnswer: "Paraphrasing their concern back to confirm you understood", explanation: "Active listening confirms understanding ('So the issue is...'), which de-escalates and gets to the real problem." },
  { id: "cr-03", area: "customer-relations", question: "A loyal customer asks for a discount you can't fully give. Best response:", choices: ["Flatly say no", "Explain what you CAN offer and frame it around their value to the business", "Give away everything for free", "Ignore the request"], correctAnswer: "Explain what you CAN offer and frame it around their value to the business", explanation: "Offer the achievable alternative and tie it to the relationship — preserves goodwill without overpromising." },
  { id: "cr-04", area: "customer-relations", question: "The main goal of positive customer relations is to:", choices: ["Win one argument", "Build repeat business and loyalty over time", "Avoid all customers", "Maximize a single transaction"], correctAnswer: "Build repeat business and loyalty over time", explanation: "Customer relations is a long-game investment in retention and referrals, not winning a single interaction." },
  { id: "cr-05", area: "customer-relations", question: "A customer complaint is actually valuable because it:", choices: ["Is always unfair", "Surfaces a fixable problem and a chance to recover the relationship", "Should be ignored", "Means you should quit"], correctAnswer: "Surfaces a fixable problem and a chance to recover the relationship", explanation: "Complaints reveal issues other customers stay silent about; handled well, they increase loyalty." },
  { id: "cr-06", area: "customer-relations", question: "Which is a professional way to handle a mistake YOUR company made?", choices: ["Blame the customer", "Own it, apologize, fix it, and prevent recurrence", "Pretend it didn't happen", "Argue about who's right"], correctAnswer: "Own it, apologize, fix it, and prevent recurrence", explanation: "Ownership + fix + prevention is the professional recovery pattern; defensiveness damages the relationship." },
  { id: "cr-07", area: "customer-relations", question: "Following up after resolving an issue matters because it:", choices: ["Wastes the customer's time", "Confirms the fix worked and shows the customer they matter", "Is never done", "Annoys everyone"], correctAnswer: "Confirms the fix worked and shows the customer they matter", explanation: "Follow-up verifies resolution and signals care — a hallmark of strong customer relations." },
  { id: "cr-08", area: "customer-relations", question: "A customer is calm but confused about a product. The best approach is to:", choices: ["Use heavy jargon to sound expert", "Explain clearly in plain language and check understanding", "Rush them out", "Tell them to read the manual"], correctAnswer: "Explain clearly in plain language and check understanding", explanation: "Clear, jargon-free explanation plus a comprehension check serves the customer and builds trust." },
  { id: "cr-09", area: "customer-relations", question: "'Exceeding expectations' in service usually means:", choices: ["Doing the bare minimum", "Delivering a small, thoughtful extra beyond what was required", "Charging more", "Making the customer wait"], correctAnswer: "Delivering a small, thoughtful extra beyond what was required", explanation: "A thoughtful extra (a proactive fix, a small courtesy) turns satisfaction into loyalty and word-of-mouth." },

  // --- Marketing fundamentals ---
  { id: "mk-01", area: "marketing-fundamentals", question: "The '4 Ps' of the marketing mix are:", choices: ["Price, People, Profit, Purpose", "Product, Price, Place, Promotion", "Plan, Produce, Promote, Profit", "Product, Payment, Percent, Push"], correctAnswer: "Product, Price, Place, Promotion", explanation: "The classic marketing mix is Product, Price, Place, Promotion — the controllable levers a marketer sets." },
  { id: "mk-02", area: "marketing-fundamentals", question: "'Place' in the marketing mix refers to:", choices: ["The store's decoration", "How and where the product is distributed and made available", "The advertising budget", "The company headquarters"], correctAnswer: "How and where the product is distributed and made available", explanation: "'Place' is distribution — the channels and locations through which customers can get the product." },
  { id: "mk-03", area: "marketing-fundamentals", question: "Market positioning is about:", choices: ["The shelf a product sits on", "The distinct place a brand occupies in the customer's mind vs. competitors", "The GPS location of a store", "The size of the logo"], correctAnswer: "The distinct place a brand occupies in the customer's mind vs. competitors", explanation: "Positioning is perceptual — how customers see your brand relative to alternatives (e.g., premium vs. budget)." },
  { id: "mk-04", area: "marketing-fundamentals", question: "A 'target market' is:", choices: ["Everyone on earth", "The specific group a business aims its marketing at", "The competitor's customers only", "The sales team"], correctAnswer: "The specific group a business aims its marketing at", explanation: "Targeting focuses resources on the segment most likely to buy, rather than marketing to everyone." },
  { id: "mk-05", area: "marketing-fundamentals", question: "Which is a PROMOTION decision?", choices: ["Setting the wholesale price", "Choosing to run a social-media ad campaign", "Selecting a distributor", "Designing the product"], correctAnswer: "Choosing to run a social-media ad campaign", explanation: "Promotion covers advertising, sales promotion, PR, and personal selling — how you communicate value. The others are Price, Place, and Product." },
  { id: "mk-06", area: "marketing-fundamentals", question: "A brand's 'value proposition' is:", choices: ["Its stock price", "The clear reason a customer should choose it over alternatives", "Its number of employees", "Its office address"], correctAnswer: "The clear reason a customer should choose it over alternatives", explanation: "The value proposition states the specific benefit that makes the brand the better choice for its target." },
  { id: "mk-07", area: "marketing-fundamentals", question: "Raising price while keeping quality signals can support a strategy of:", choices: ["Bargain positioning", "Premium positioning", "Hiding the product", "Ignoring customers"], correctAnswer: "Premium positioning", explanation: "Higher price paired with quality cues positions a brand as premium; it must be backed by real perceived value." },
  { id: "mk-08", area: "marketing-fundamentals", question: "Which metric best tracks a promotion's efficiency?", choices: ["Number of employees", "Cost per acquisition (what you pay to gain one customer)", "Office square footage", "CEO's salary"], correctAnswer: "Cost per acquisition (what you pay to gain one customer)", explanation: "Cost per acquisition links spend to customers gained, showing whether the promotion is efficient." },
  { id: "mk-09", area: "marketing-fundamentals", question: "Product differentiation means:", choices: ["Making your product identical to rivals", "Giving your product distinct features/benefits that set it apart", "Lowering price only", "Copying a competitor exactly"], correctAnswer: "Giving your product distinct features/benefits that set it apart", explanation: "Differentiation creates a meaningful difference customers value, reducing head-to-head price competition." }
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildDecaDrillSession(count: number, areas?: DecaDrillArea[]): DecaDrillQuestion[] {
  const pool = areas && areas.length > 0 ? DECA_DRILL_BANK.filter((q) => areas.includes(q.area)) : DECA_DRILL_BANK;
  const shuffled = shuffle(pool);
  if (count <= shuffled.length) return shuffled.slice(0, count);
  const result = [...shuffled];
  while (result.length < count) result.push(...shuffle(pool));
  return result.slice(0, count);
}

export type DecaDrillAnswer = { id: string; selected: string };
export type DecaDrillGradedItem = { id: string; area: DecaDrillArea; correct: boolean; correctAnswer: string; explanation: string };
export type DecaDrillSkillResult = { area: DecaDrillArea; skillSlug: string; label: string; total: number; correct: number; scorePercent: number; passed: boolean };
export type DecaDrillResult = { total: number; correctCount: number; scorePercent: number; items: DecaDrillGradedItem[]; perSkill: DecaDrillSkillResult[] };

export const DECA_DRILL_PASS_THRESHOLD = 70;

export function gradeDecaDrillAnswers(answers: DecaDrillAnswer[]): DecaDrillResult {
  const byId = new Map(DECA_DRILL_BANK.map((q) => [q.id, q]));
  const items: DecaDrillGradedItem[] = [];
  const areaTally = new Map<DecaDrillArea, { total: number; correct: number }>();

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
  const perSkill: DecaDrillSkillResult[] = Array.from(areaTally.entries()).map(([area, tally]) => {
    const meta = DECA_DRILL_AREAS.find((a) => a.id === area);
    const pct = tally.total > 0 ? Math.round((tally.correct / tally.total) * 100) : 0;
    return { area, skillSlug: meta?.skillSlug ?? "", label: meta?.label ?? area, total: tally.total, correct: tally.correct, scorePercent: pct, passed: pct >= DECA_DRILL_PASS_THRESHOLD };
  });

  return { total, correctCount, scorePercent, items, perSkill };
}
