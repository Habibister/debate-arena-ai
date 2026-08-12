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

  // M14 Global G2 Slice 5 / DECA Slice 1: performance-indicators extended 9 -> 30. Inserted INSIDE the
  // PI block, after pi-09 and before the business-reasoning block, so the grouping holds. pi-09
  // ALREADY carried its comma and mk-09 is still the final array element, so NO legacy punctuation
  // changes here — the terminal-comma boundary at mk-09 stays unexercised for a later DECA slice.
  // AUTHORING BOUNDARY: every item below wraps a LISTED performance indicator and asks what that
  // indicator requires the competitor to demonstrate in THIS scenario. Diagnostic applied to all 21:
  // remove the indicator from the stem and the question stops working.
  // Scope comes from the DECA course Module 1 lesson 3 (PIs are behaviours to DEMONSTRATE, never to
  // recite; the PI method PI -> PLAIN MEANING -> SCENARIO REQUIREMENT -> IN-CHARACTER ACTION ->
  // JUDGE-FACING EXPLANATION -> MEASUREMENT), lesson 2 (the 5-extract decode: my role, judge's role,
  // problem, PIs, constraints) and the non-negotiable PI rule (concrete decision -> business
  // reasoning -> implementation -> feasibility -> measurement).
  // NOT BUSINESS REASONING — nothing asks whether an option is feasible, what it costs, or which is
  // commercially better; br-01..br-09 own that. br-03 and br-08 in particular own generic
  // metric quality, so pi-19/pi-29/pi-30 are anchored to what the INDICATOR asked about, not to
  // whether a metric is good in the abstract.
  // NOT CUSTOMER RELATIONS — no item asks what to do with a customer; cr-01..cr-09 own that.
  // NOT MARKETING FUNDAMENTALS — marketing topics appear only as the subject an indicator points at,
  // never as knowledge tested for its own sake; mk-01..mk-09 own that.
  // B-2 IS DELIBERATELY OUT OF SCOPE. Whether to speak a PI's title aloud or weave it into the
  // conversation is taught in the curriculum as a GENUINELY CONTESTED judgment call, and legacy
  // pi-07 has a pre-existing tension with that guidance. This slice does not modify pi-07, does not
  // reinforce explicit signposting as universally correct, and does not author a contradicting item.
  // Several distractors here reject PI-name recitation as a substitute for demonstration (pi-11 D,
  // pi-13 D, pi-18 B, pi-19 C, pi-29 D) — that is the ⟨D6⟩ demonstration-vs-recitation rule, NOT a
  // ruling on speaking style. The B-2 question remains open curriculum debt. See docs/HANDOFF.md.
  // PROVENANCE: every indicator string below is an ORIGINAL PI-style prompt. None reproduces an
  // official DECA competency statement, exam item, sample role-play, or evaluation form. No official
  // PI code, cluster or list-year is named, and no per-PI exam weighting is claimed — pi-26 keys on
  // the curriculum's own point that published weighting is instructional-area level only.
  // AI-ASSISTED authoring (M14 Global G2 Slice 5 / DECA Slice 1, pi-10..pi-30) — HUMAN CONTENT REVIEW
  // OUTSTANDING. See docs/HANDOFF.md. AI self-review does NOT count as human review.
  { id: "pi-10", area: "performance-indicators", question: "A listed indicator reads \"Analyze the effect of a supplier delay on store operations.\" A response that only defines what a supplier delay is:", choices: ["Misses what the verb asks — analyzing means breaking the delay down into which operations it hits and how those knock into each other", "Fully satisfies the indicator, because the topic was addressed", "Fails only because it is too short", "Should instead calculate the store's total cost of the delay"], correctAnswer: "Misses what the verb asks — analyzing means breaking the delay down into which operations it hits and how those knock into each other", explanation: "'Analyze' asks you to take the situation apart — which operations are affected, in what order, and how they interact. A definition names the topic without doing any of that. Costing the delay out is a different task from analyzing it." },
  { id: "pi-11", area: "performance-indicators", question: "Two listed indicators cover the same topic: one reads \"Identify the store's primary customer group,\" the other \"Explain why that group is the store's priority.\" The difference in what you must do is:", choices: ["Identify asks you to name the right group; explain asks for the reasoning that makes it the priority", "There is no real difference — both ask for the same answer", "Identify requires more detail than explain", "Both are satisfied by stating the indicator's wording first"], correctAnswer: "Identify asks you to name the right group; explain asks for the reasoning that makes it the priority", explanation: "The verb sets the work. Naming the group satisfies the first; the second needs the reasoning behind that choice. Covering one does not automatically cover the other, even though the two usually sit together in a response." },
  { id: "pi-12", area: "performance-indicators", question: "A listed indicator reads \"Evaluate two shipping options for the store.\" A response that describes both options accurately and stops:", choices: ["Has not evaluated — an evaluation needs a judgment plus the criteria behind it", "Has evaluated, because both options were covered", "Has evaluated, as long as the descriptions are accurate", "Should have chosen the cheaper option, since cost always decides"], correctAnswer: "Has not evaluated — an evaluation needs a judgment plus the criteria behind it", explanation: "Describing is not evaluating. The indicator asks you to come down somewhere and say what you weighed — speed, reliability, cost — to get there. Which of those should dominate depends on the scenario, not on a rule." },
  { id: "pi-13", area: "performance-indicators", question: "A listed indicator reads \"Demonstrate a procedure for handling a damaged shipment.\" The competitor gives a textbook-accurate definition of damage-claim procedure and moves on. This response:", choices: ["Shows the knowledge but never performs the procedure the indicator asks to see", "Is complete, because the definition was accurate", "Fails because the definition was wrong", "Fails because the indicator was not named aloud first"], correctAnswer: "Shows the knowledge but never performs the procedure the indicator asks to see", explanation: "Accuracy is not the problem — the verb is. 'Demonstrate' asks you to walk the steps in the scenario rather than define them. This is the mirror image of answering with an action where the indicator asked you to describe a concept." },
  { id: "pi-14", area: "performance-indicators", question: "One listed indicator reads \"Describe the store's return policy\"; another reads \"Apply the return policy to a customer's request.\" The strongest response:", choices: ["Explains what the policy is for the first, and works through the customer's actual request for the second", "Uses the same explanation for both, since the topic is identical", "Handles only the second, because applying includes describing", "Handles only the first, because describing is the harder task"], correctAnswer: "Explains what the policy is for the first, and works through the customer's actual request for the second", explanation: "Shared topic, different demonstrations. One asks what the policy is; the other asks you to run it against a live request. Doing one well leaves the other undemonstrated, because the verbs call for different things." },
  { id: "pi-15", area: "performance-indicators", question: "A listed indicator reads \"Explain the nature of staff-morale factors in a retail setting.\" Before building your response, the most useful first step is to restate it as:", choices: ["\"What makes staff here feel good or bad about this job, and why does that matter to the store?\"", "\"I will now be addressing staff morale.\"", "\"Staff morale is an important business topic.\"", "\"Morale should be kept as high as possible at all times.\""], correctAnswer: "\"What makes staff here feel good or bad about this job, and why does that matter to the store?\"", explanation: "Putting a formal indicator into plain words is what makes the rest of the response possible — you cannot demonstrate something you have not yet pinned down. Announcing the topic or calling it important restates nothing." },
  { id: "pi-16", area: "performance-indicators", question: "You understand the indicator \"Explain the nature of inventory control.\" The scenario is a food truck with one small refrigerator and daily deliveries. What this scenario makes the indicator require is:", choices: ["Inventory control as it works under tight storage and daily turnover, not inventory control in general", "A general definition of inventory control, since the concept does not change", "A calculation of the truck's optimal order quantity", "A list of the inventory systems available on the market"], correctAnswer: "Inventory control as it works under tight storage and daily turnover, not inventory control in general", explanation: "The same indicator asks for different things in different scenarios. Here the constraints — one refrigerator, daily deliveries — are what the explanation has to be about. Running the order-quantity numbers is a separate task." },
  { id: "pi-17", area: "performance-indicators", question: "You are the assistant manager. The listed indicator is \"Demonstrate how to resolve a scheduling conflict between two employees.\" Which response stays inside your role and shows the skill?", choices: ["Bring both employees together, hear each constraint, and propose a swap you have the authority to approve", "Explain that scheduling conflicts should generally be resolved fairly", "Dismiss the employee who complained and rebuild the schedule", "Tell the judge you would send it to the district director to decide"], correctAnswer: "Bring both employees together, hear each constraint, and propose a swap you have the authority to approve", explanation: "The indicator asks to see the skill, and the scenario gives you a role with limits. A general principle demonstrates nothing, dismissing someone exceeds an assistant manager's authority, and handing it upward avoids the demonstration altogether." },
  { id: "pi-18", area: "performance-indicators", question: "You have decided to move a new display to the store entrance. The listed indicator is \"Explain the role of product placement in sales.\" The strongest thing to say next is:", choices: ["Why entrance placement drives impulse purchases, and why that fits a store whose foot traffic peaks at lunch", "That you have now addressed the product-placement indicator", "That product placement is a well-known part of retail marketing", "That the display simply looks better near the entrance"], correctAnswer: "Why entrance placement drives impulse purchases, and why that fits a store whose foot traffic peaks at lunch", explanation: "The judge scores the reasoning, not the move on its own. Tying the placement principle to this store's traffic pattern is what shows the indicator was understood and used. Reporting that you covered it adds nothing to the demonstration." },
  { id: "pi-19", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of employee retention in a small business.\" You decide to give every associate a monthly twenty-minute one-on-one with the manager, because associates say they have no way to raise problems, and you set out who runs the meetings and when. Against a complete demonstration of that indicator, the response:", choices: ["Has not finished — nothing in it would show whether associates actually stay, which is what this indicator is about", "Is complete, because the action, its reason and its rollout are all present", "Is incomplete because the indicator was not restated at the end", "Is incomplete because a monthly check-in is too infrequent to help"], correctAnswer: "Has not finished — nothing in it would show whether associates actually stay, which is what this indicator is about", explanation: "A demonstration carries the action through to how success gets checked, and the indicator decides what success even means here. The reason given is about being heard, but the listed competency is retention — so the check has to be about people staying, not about how the meetings felt. Where a scenario genuinely offers nothing to measure, say so rather than inventing a number." },
  { id: "pi-20", area: "performance-indicators", question: "A scenario reads: \"You are the events coordinator for a community gym. Membership fell 12% last quarter. Your budget is $4,000. The judge is the gym owner. You will be evaluated on: explaining the nature of customer retention, and describing promotional planning.\" The listed indicators are:", choices: ["Explaining the nature of customer retention, and describing promotional planning", "The 12% membership drop and the $4,000 budget", "Being the events coordinator, and the owner being the judge", "Everything in the scenario, since all of it is scored"], correctAnswer: "Explaining the nature of customer retention, and describing promotional planning", explanation: "The indicators are the competencies you are evaluated on. The membership drop is the problem, the budget is a constraint, and the two roles say who is speaking — all necessary context, none of it the scored list." },
  { id: "pi-21", area: "performance-indicators", question: "In that same gym scenario, the $4,000 budget is:", choices: ["A constraint on how you demonstrate the indicators, not something scored on its own", "A listed indicator you must address directly", "Irrelevant, because it is not one of the indicators", "The most heavily weighted part of the evaluation"], correctAnswer: "A constraint on how you demonstrate the indicators, not something scored on its own", explanation: "Constraints shape the response — a promotional plan has to fit $4,000. But staying inside the budget is not itself a scored competency, and ignoring it would make the demonstration unrealistic." },
  { id: "pi-22", area: "performance-indicators", question: "You have ten minutes of prep and three listed indicators. The best use of that time is to:", choices: ["Work out a usable line on each indicator, then deepen whichever still looks thinnest", "Perfect your answer to the first indicator and improvise the other two", "Give each indicator exactly 200 seconds regardless of difficulty", "Skip prep and read the indicators for the first time during the role-play"], correctAnswer: "Work out a usable line on each indicator, then deepen whichever still looks thinnest", explanation: "Every listed indicator is being scored, so leaving one with no plan costs more than polishing another. Splitting the clock into equal fixed blocks is its own kind of rigid — some indicators need more thought than others." },
  { id: "pi-23", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of customer retention.\" The competitor delivers an impressive break-even analysis instead and touches retention only in passing. Against that listed indicator, the analysis:", choices: ["Does not substitute — strong extra work is not what this indicator is scoring", "Fully compensates, because the analysis was more advanced", "Is worthless, because anything unlisted is wasted effort", "Guarantees a lower total result than saying nothing at all"], correctAnswer: "Does not substitute — strong extra work is not what this indicator is scoring", explanation: "Extra strength can make the interaction better and is not wasted. It simply cannot stand in for the competency that was actually listed, which still has to be demonstrated." },
  { id: "pi-24", area: "performance-indicators", question: "You know your event's instructional area but not which indicators will appear. The most useful preparation is to:", choices: ["Learn the instructional area's core concepts and practice decoding unfamiliar indicators quickly", "Try to obtain the exact indicator list before the event", "Memorize responses to last year's indicators and reuse them", "Skip preparing, since the indicators are unknown"], correctAnswer: "Learn the instructional area's core concepts and practice decoding unfamiliar indicators quickly", explanation: "You cannot prepare the exact wording, but you can prepare the ground it comes from — the area's concepts — and the skill of turning an indicator you have never seen into a response on the spot." },
  { id: "pi-25", area: "performance-indicators", question: "Three indicators are listed. The competitor gives an outstanding response to the first and never returns to the other two. This is weaker than a solid response to all three because:", choices: ["Each listed indicator is being scored, and two of them went undemonstrated", "Long responses are penalized", "The first indicator is always worth the least", "Judges stop listening after the first indicator"], correctAnswer: "Each listed indicator is being scored, and two of them went undemonstrated", explanation: "Depth is worth having, but not at the price of leaving scored competencies untouched. Covering all three meaningfully demonstrates more of what was actually listed." },
  { id: "pi-26", area: "performance-indicators", question: "A student plans to spend most of their study time on one indicator, believing it carries a higher published exam weight than the others. The problem with that plan is:", choices: ["Published weighting is given for instructional areas, not for individual indicators", "All indicators are always weighted exactly equally", "Studying any single indicator is never useful", "The weights are changed during the competition itself"], correctAnswer: "Published weighting is given for instructional areas, not for individual indicators", explanation: "There is no per-indicator weight to optimize against — the published figures describe instructional areas. Studying the area those indicators are drawn from is the version of this plan that actually works." },
  { id: "pi-27", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of pricing strategy.\" A poised competitor accurately defines penetration, skimming and cost-plus pricing in full sentences, and never says what this store should do. The response:", choices: ["Is fluent knowledge without the decision that would demonstrate the indicator in this scenario", "Is complete, because all three strategies were explained correctly", "Is weak because the definitions were inaccurate", "Is weak because it used technical vocabulary"], correctAnswer: "Is fluent knowledge without the decision that would demonstrate the indicator in this scenario", explanation: "Polish is not demonstration. Nothing said here is wrong, and it beats silence — but the indicator lives inside a scenario, and this response never arrives at a choice for that store." },
  { id: "pi-28", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of employee training.\" Which response demonstrates it most completely?", choices: ["Run a two-hour Saturday session because new hires are erroring on returns, cover the three most-missed steps, cost it at one trainer's overtime, and re-check return errors in a month", "Explain why training matters, describe a two-hour Saturday session, and note that new hires are erroring on returns", "Explain why training matters and recommend investing more in employee development", "Describe several common training formats and note that each suits a different kind of business"], correctAnswer: "Run a two-hour Saturday session because new hires are erroring on returns, cover the three most-missed steps, cost it at one trainer's overtime, and re-check return errors in a month", explanation: "Only the first runs the whole way: a concrete decision, the reason for it, how it is carried out, whether it is affordable, and how success gets checked. The second is genuinely developed but never costs it or checks it; the last two never reach a decision at all." },
  { id: "pi-29", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of customer-flow management in a retail store.\" A competitor decides to open a second checkout lane at peak hours, explains that queue length is driving walkouts, and sets out the staffing change that makes it happen. Against a complete demonstration of that indicator, what is missing is:", choices: ["Any check on whether the change actually reduced walkouts", "The reason the change was chosen", "The decision itself", "A closing statement that the indicator has been addressed"], correctAnswer: "Any check on whether the change actually reduced walkouts", explanation: "Decision, reasoning and implementation are all present, so this response is genuinely developed against the indicator. It stops one step short, at the point where you would name what you would watch to know it worked." },
  { id: "pi-30", area: "performance-indicators", question: "The listed indicator is \"Explain the nature of customer retention.\" You decide to send a targeted offer email to gym members who have not visited in sixty days. Which result best tells the judge whether that action succeeded FOR THIS INDICATOR?", choices: ["The share of those members who return and are still attending three months later", "The percentage of recipients who opened the email", "How many offer codes were redeemed in the first week", "The gym's total revenue for the year"], correctAnswer: "The share of those members who return and are still attending three months later", explanation: "The same email could be judged on reach, on immediate response, or on whether people came back and stayed — the listed indicator is what decides which. This one is about retention, so the evidence has to be members returning and remaining. Open rate measures reach, redemptions measure the short-term promotional response, and annual revenue moves for a dozen unrelated reasons. Each of those is a respectable business metric; they simply answer a different question from the one this indicator asks." },

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

// --- Duplicate-resistant mastery evidence (M13E1D) ------------------------------------------------
//
// `gradeDecaDrillAnswers` above reports the LEARNER'S SESSION: every graded answer, counted every
// time it was submitted. That is the right number to show someone who just finished a drill, but it
// is the wrong number to persist, because `answers` is composed entirely by the client and the same
// question id may appear in it any number of times.
//
// The bypass this closes, reproduced exactly: submit five distinct performance-indicator ids with
// only ONE answered correctly, then repeat that one correct id twelve more times. The session tally
// is 13/17 = 76%, which clears the 70% threshold and would have written PRACTICING mastery — off a
// single genuinely correct question out of five. A minimum-distinct-questions floor alone does not
// stop it, because the score itself was still duplicate-weighted.
//
// So persistence reads from an EVIDENCE SET instead: at most one entry per valid question id, using
// the FIRST answer submitted for that id.
//
//   first occurrence, not last  — a later answer to an already-answered id is ignored, so revealing
//                                 the explanation and resubmitting cannot convert a miss into credit
//   first occurrence, not all   — `buildDecaDrillSession` legitimately repeats items once a session
//                                 is longer than an area's nine-item pool, so requiring every
//                                 occurrence to be correct would punish honest repeats
//   ignore, do not reject       — an unrecognised id contributes nothing rather than failing the
//                                 whole submission, and each id is attributed to its OWN bank area,
//                                 so a filtered session can never misattribute evidence
//
// This makes the evidence duplicate-resistant and unknown-id-resistant. It is NOT tamper-proof:
// nothing yet binds a submission to the question set the server actually served, so a client may
// still answer bank ids it was never shown. Session binding is deliberately out of scope here.

/**
 * Distinct valid questions required for ONE skill before any mastery or review may be written.
 *
 * Five, because each area's bank holds nine distinct items (so five is a majority of what exists),
 * five is the smallest focused-session size the UI offers, and at five questions the 70% threshold
 * needs at least four correct — there is no way to clear it on a single lucky answer.
 */
export const DECA_DRILL_REQUIRED_UNIQUE = 5;

export type DecaDrillEvidenceStatus = "insufficient-evidence" | "below-threshold" | "passing";

export type DecaDrillSkillEvidence = {
  area: DecaDrillArea;
  skillSlug: string;
  label: string;
  /** Distinct valid question ids submitted for this skill. */
  uniqueTotal: number;
  /** How many of those were correct ON THEIR FIRST submitted answer. */
  uniqueCorrect: number;
  requiredUnique: number;
  /** `uniqueCorrect / uniqueTotal` — the only score that may reach the database. */
  evidenceScore: number;
  evidenceStatus: DecaDrillEvidenceStatus;
  /** True only with enough distinct questions AND an evidence score at or above the threshold. */
  passed: boolean;
};

/** Build the per-skill evidence set for a submission. Pure; deterministic; order-independent. */
export function buildDecaDrillEvidence(answers: DecaDrillAnswer[]): DecaDrillSkillEvidence[] {
  const byId = new Map(DECA_DRILL_BANK.map((q) => [q.id, q]));

  // First occurrence per valid id wins; unknown ids and every repeat are dropped here.
  const firstById = new Map<string, { question: DecaDrillQuestion; selected: string }>();
  for (const answer of answers) {
    const question = byId.get(answer.id);
    if (!question) continue;
    if (firstById.has(answer.id)) continue;
    firstById.set(answer.id, { question, selected: answer.selected });
  }

  const tally = new Map<DecaDrillArea, { uniqueTotal: number; uniqueCorrect: number }>();
  for (const { question, selected } of firstById.values()) {
    // Attribution is by the question's OWN area, never by whatever area the session requested.
    const bucket = tally.get(question.area) ?? { uniqueTotal: 0, uniqueCorrect: 0 };
    bucket.uniqueTotal += 1;
    if (selected === question.correctAnswer) bucket.uniqueCorrect += 1;
    tally.set(question.area, bucket);
  }

  return Array.from(tally.entries()).map(([area, bucket]) => {
    const meta = DECA_DRILL_AREAS.find((a) => a.id === area);
    const evidenceScore = bucket.uniqueTotal > 0 ? Math.round((bucket.uniqueCorrect / bucket.uniqueTotal) * 100) : 0;
    const evidenceStatus: DecaDrillEvidenceStatus =
      bucket.uniqueTotal < DECA_DRILL_REQUIRED_UNIQUE
        ? "insufficient-evidence"
        : evidenceScore >= DECA_DRILL_PASS_THRESHOLD
          ? "passing"
          : "below-threshold";
    return {
      area,
      skillSlug: meta?.skillSlug ?? "",
      label: meta?.label ?? area,
      uniqueTotal: bucket.uniqueTotal,
      uniqueCorrect: bucket.uniqueCorrect,
      requiredUnique: DECA_DRILL_REQUIRED_UNIQUE,
      evidenceScore,
      evidenceStatus,
      passed: evidenceStatus === "passing"
    };
  });
}

/**
 * What to persist for one skill, or `null` meaning DO NOT CALL the persistence helper at all.
 *
 * `null` is not "write a zero" — it is the absence of a call, so a short submission cannot write
 * mastery, cannot schedule a review, and cannot knock an existing mastery down through a due
 * review it never earned the right to answer.
 */
export function decaDrillPersistenceRequest(evidence: DecaDrillSkillEvidence): { scorePercent: number; passed: boolean } | null {
  if (evidence.uniqueTotal < evidence.requiredUnique) return null;
  return { scorePercent: evidence.evidenceScore, passed: evidence.passed };
}
