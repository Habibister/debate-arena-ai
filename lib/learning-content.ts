import type { Organization, SkillTrack } from "@prisma/client";

export type LearningQuestion = {
  prompt: string;
  choices: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  skillTag: string;
  retryPrompt: string;
  retryChoices: string[];
  retryCorrectAnswer: string;
};

export type LearningLessonContent = {
  objective: string;
  explanation: string;
  whyMatters: string;
  steps: string[];
  workedExample: {
    prompt: string;
    weakAnswer: string;
    strongAnswer: string;
    whyItWorks: string;
  };
  guidedQuestion: LearningQuestion;
  practiceQuestions: LearningQuestion[];
  masteryCheck: LearningQuestion[];
};

export type LearningSkillSeed = {
  organization: Organization;
  track: SkillTrack;
  name: string;
  slug: string;
  description: string;
  category: string;
  order: number;
  lesson: {
    title: string;
    slug: string;
    summary: string;
    estimatedMinutes: number;
    content: LearningLessonContent;
  };
};

function q(
  prompt: string,
  choices: string[],
  correctAnswer: string,
  hint: string,
  explanation: string,
  skillTag: string,
  retryPrompt = prompt
): LearningQuestion {
  return {
    prompt,
    choices,
    correctAnswer,
    hint,
    explanation,
    skillTag,
    retryPrompt,
    retryChoices: choices,
    retryCorrectAnswer: correctAnswer
  };
}

function lesson(
  objective: string,
  explanation: string,
  whyMatters: string,
  steps: string[],
  workedExample: LearningLessonContent["workedExample"],
  guidedQuestion: LearningQuestion,
  practiceQuestions: LearningQuestion[],
  masteryCheck: LearningQuestion[]
): LearningLessonContent {
  return {
    objective,
    explanation,
    whyMatters,
    steps,
    workedExample,
    guidedQuestion,
    practiceQuestions,
    masteryCheck
  };
}

export const LEARNING_SKILL_CATALOG: LearningSkillSeed[] = [
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Debate Round Orientation",
    slug: "debate-round-orientation",
    description: "Understand what happens in a debate round before your first practice.",
    category: "Debate foundations",
    order: 0,
    lesson: {
      title: "How a debate round works",
      slug: "debate-round-orientation-lesson",
      summary: "What debate is, what each side is doing, and what the judge needs from you.",
      estimatedMinutes: 6,
      content: lesson(
        "Understand what a debate round is and what you are trying to do in one.",
        "A debate round is a structured disagreement: two sides give reasons for different positions, answer each other, and a judge decides which side argued more persuasively. Your job is not just to speak — it is to help the judge see what your side claims, why it is true, why the other side's answers do not defeat it, and why your strongest points should decide the round. An argument is a claim backed by a reason and a why-it-matters; the Claim, Warrant, Impact lesson teaches how to build one. Early speaking in a round is mostly constructive — introducing and building your side's case. Later speaking is mostly responsive — answering what has already been argued and comparing the two sides. Formats differ in speech names, order and timing, but these jobs stay the same.",
        "Beginners who enter a round without knowing the goal tend to list facts or repeat themselves. Judges can only vote on what they can follow: once you know the judge is deciding between reasons, every sentence gets a purpose — building a point, answering one, or explaining why yours matters more.",
        ["Know your side's position and the strongest reasons for it.", "Track what the other side actually argues, and answer it directly instead of repeating yourself.", "Tell the judge which argument you are on and why your most important points should decide the round."],
        {
          prompt: "A short exchange on whether the school day should start later.",
          weakAnswer: "Side A: Later starts are good. Side B: No, they are not. Side A: Yes, they really are.",
          strongAnswer: "Side A: A later start helps because students sleep more and focus better in class. Side B: But buses and family schedules make a later start hard for many households. Side A: Schedules can be adjusted once — lost focus in every class is a cost that repeats every single day.",
          whyItWorks: "Each side makes a claim with a reason, the reply answers that claim directly, and the final turn explains why one concern should matter more to the judge. That is a debate round in miniature."
        },
        q("What is a debater's real job in a round?", ["Help the judge see why your side's reasons should win", "Talk longer than the opponent", "Avoid mentioning the other side's points", "Use the most impressive vocabulary"], "Help the judge see why your side's reasons should win", "Think about who decides the round.", "The judge decides between reasons. Everything you say should help the judge understand your side's reasoning and prefer it.", "Orientation"),
        [
          q("What is the goal of a debate round?", ["Persuade the judge that your side's position is stronger", "Prove the other team is dishonest", "Say as many separate points as possible", "Finish your speeches quickly"], "Persuade the judge that your side's position is stronger", "The judge is the audience that matters.", "Every speech exists to persuade the judge — not to overwhelm, insult, or outlast the other side.", "Orientation"),
          q("Which choice gives the judge an actual reason instead of only stating a position?", ["School uniforms help because they reduce visible income differences between students", "School uniforms are obviously good", "Everyone already knows uniforms work", "Uniforms are a topic people discuss"], "School uniforms help because they reduce visible income differences between students", "An argument carries a reason the judge can weigh.", "A claim plus a reason gives the judge something to evaluate. The other options assert or observe without giving a reason.", "Orientation"),
          q("The other side just answered one of your arguments. What should you do?", ["Respond to their answer and explain why your point still stands", "Repeat your original sentence more confidently", "Ignore it and move to a new topic", "Concede the argument immediately"], "Respond to their answer and explain why your point still stands", "An unanswered response usually wins the point.", "Debate is exchange: once your argument is answered, the judge needs your response to the answer — not a louder restatement.", "Orientation")
        ],
        [
          q("Side A says: 'Homework should be limited because students need sleep.' Side B answers: 'Students lose sleep to phones, not homework.' What does the judge most need from Side A next?", ["Why homework is still a real cause of lost sleep worth acting on, even if phones matter too", "A louder restatement that sleep is important", "A brand-new argument about grades instead", "A comment about Side B's sincerity"], "Why homework is still a real cause of lost sleep worth acting on, even if phones matter too", "The clash is about the cause — resolve it.", "Side B answered the reason, so the judge needs Side A to engage that answer and explain why the original concern survives it. Responding to the response is the heart of debating.", "Orientation")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Claim, Warrant, Impact",
    slug: "debate-claim-warrant-impact",
    description: "Turn an idea into a complete argument the judge can evaluate.",
    category: "Debate foundations",
    order: 1,
    lesson: {
      title: "Build a complete argument",
      slug: "debate-claim-warrant-impact-lesson",
      summary: "Learn the claim-warrant-impact pattern for stronger speeches.",
      estimatedMinutes: 8,
      content: lesson(
        "Write an argument with a clear claim, warrant, and impact.",
        "A complete argument has three parts: the claim says what you believe, the warrant explains why it is true, and the impact explains why it matters in the round.",
        "Judges cannot give full credit to an idea they cannot follow. This pattern makes your reasoning visible and gives later speeches something to extend.",
        [
          "Name the claim in one direct sentence.",
          "Add a warrant that explains the cause or logic.",
          "End with the impact: who is affected, how much, and why it matters more than the other side."
        ],
        {
          prompt: "Schools should teach practical AI literacy.",
          weakAnswer: "AI literacy is important because AI is everywhere.",
          strongAnswer: "Schools should teach practical AI literacy because students already use AI tools for research and writing. If they learn limits, bias checks, and responsible use, they make fewer mistakes and are better prepared for college and work.",
          whyItWorks: "The strong answer states a claim, explains the mechanism, and gives a concrete impact."
        },
        q(
          "Which sentence is the warrant?",
          [
            "Schools should teach practical AI literacy.",
            "Students already use AI tools for research and writing.",
            "Prepared students make fewer mistakes in college and work.",
            "This debate is about education policy."
          ],
          "Students already use AI tools for research and writing.",
          "The warrant is the reason the claim is true.",
          "This sentence explains why AI literacy belongs in school: students are already using the tools.",
          "Warrant"
        ),
        [
          q(
            "Which answer has all three parts?",
            [
              "We affirm because the plan is good.",
              "The plan improves safety because trained students can identify AI errors before relying on them, which reduces academic and workplace harm.",
              "AI errors are bad.",
              "The negative side has no evidence."
            ],
            "The plan improves safety because trained students can identify AI errors before relying on them, which reduces academic and workplace harm.",
            "Look for claim, reason, and why it matters.",
            "This choice includes the position, the mechanism, and the impact.",
            "Complete argument"
          ),
          q(
            "What should come after a claim?",
            ["A new topic", "A warrant", "A thank-you", "A speaker score"],
            "A warrant",
            "The next step is explaining why the claim is true.",
            "A warrant connects the claim to logic or evidence.",
            "Warrant"
          ),
          q(
            "What is an impact?",
            ["The rule for speaking order", "The reason a point matters", "The first sentence only", "A citation title"],
            "The reason a point matters",
            "Ask: why should the judge care?",
            "The impact explains the importance or consequence of the argument.",
            "Impact"
          )
        ],
        [
          q(
            "A judge asks why your argument matters. Which part are they asking for?",
            ["Claim", "Impact", "Signpost", "Definition"],
            "Impact",
            "The word matters points to the consequence.",
            "Impact tells the judge why the argument should affect the decision.",
            "Impact"
          )
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Evidence Evaluation",
    slug: "debate-evidence-evaluation",
    description: "Judge whether evidence actually supports the claim being made.",
    category: "Debate foundations",
    order: 10,
    lesson: {
      title: "Judge the evidence",
      slug: "debate-evidence-evaluation-lesson",
      summary: "Decide how much a piece of evidence really proves, and compare competing evidence.",
      estimatedMinutes: 8,
      content: lesson(
        "Evaluate whether evidence genuinely supports an argument, and explain why one piece of evidence deserves more weight than another.",
        "Evidence only helps an argument when it actually supports the specific claim being made. To judge a piece of evidence, ask four things. FIT: does it address this exact claim, or something merely nearby? SOURCE: who produced it, is their expertise relevant, and are there incentives that call for extra scrutiny? METHOD: how was the conclusion reached — who was studied, was there a real comparison, could something else explain the result? INTERPRETATION: does the conclusion claimed actually follow, or is the speaker stretching the evidence past what it shows? When two pieces of evidence conflict, compare them on these same questions instead of picking the one you like.",
        "Rounds are full of confident citations. The debater who can say WHY one piece of evidence deserves more weight — not just that a source exists — gives the judge a reason to prefer their side, and spots the moment an opponent's conclusion goes further than their evidence.",
        ["Check fit: restate the exact claim and ask whether the evidence is about that claim.", "Check source and method: relevant expertise, reasons for caution, who was studied, and whether anything else could explain the result.", "Check the conclusion: say plainly what the evidence does prove, and challenge whatever is claimed beyond that."],
        {
          prompt: "Claim: removing library late fees gets more books returned on time. Two pieces of (hypothetical) evidence: A - a survey where members say they would return books on time without fees; B - return rates tracked at two similar libraries, where only the one that removed fees improved.",
          weakAnswer: "Evidence A is more recent, so it is better.",
          strongAnswer: "Evidence B deserves more weight. It measures actual returns rather than what people say they would do, and the unchanged library gives a comparison that points at the fee change itself. A is about intentions, which often differ from behaviour — it fits the topic, but B fits the claim.",
          whyItWorks: "The strong answer compares the two pieces on fit and method — measured behaviour with a comparison versus stated intentions — instead of using a shortcut like recency."
        },
        q("Claim: the new crosswalk made the street safer. Evidence: accidents fell in the month after it was installed. What is the biggest weakness?", ["One month with no comparison cannot show the crosswalk caused the drop", "The evidence is about the wrong street", "Accidents are impossible to count", "The source is anonymous"], "One month with no comparison cannot show the crosswalk caused the drop", "Think about what else could explain one short window.", "A short window with no comparison leaves the drop open to chance and season. The evidence is relevant, but it cannot yet carry the causal claim.", "Evidence"),
        [
          q("Claim: the gym renovation improved student fitness. Evidence: a survey shows students like the new gym. What is the problem?", ["The evidence measures enjoyment, not fitness, so it does not fit the claim", "Surveys are always worthless", "The renovation was too expensive", "Students cannot judge a gym"], "The evidence measures enjoyment, not fitness, so it does not fit the claim", "Compare what was measured with what is claimed.", "Credible evidence can still fail to support the specific claim. Liking the gym is real information — about enjoyment, not fitness.", "Evidence"),
          q("Neighbourhoods with more streetlights have less litter. A speaker concludes streetlights prevent litter. What should a careful debater say?", ["Something else, like overall upkeep, could produce both — this needs a comparison before the causal claim stands", "The connection proves the conclusion", "Litter statistics are always unreliable", "Streetlights are too expensive to matter"], "Something else, like overall upkeep, could produce both — this needs a comparison before the causal claim stands", "Two things appearing together is not yet cause.", "The association is real evidence, but well-kept neighbourhoods may get both lights and less litter. Without a comparison that separates the factors, the causal conclusion overreaches.", "Evidence"),
          q("Two reports on a teen curfew disagree. One, from a group campaigning for curfews, highlights a single town that improved. The other, an independent review of many towns with its method disclosed, found mixed results. Which deserves more weight and why?", ["The independent review — it covers the whole pattern and shows its method, while the campaign report highlights one favourable case", "The campaign report, because it is more confident", "Neither, because they disagree", "The campaign report, because one clear example beats many mixed ones"], "The independent review — it covers the whole pattern and shows its method, while the campaign report highlights one favourable case", "Compare breadth, method and incentives — do not just pick a side.", "Disagreement is where evaluation starts. An incentive to persuade plus a single selected example warrants caution; breadth and a disclosed method warrant more confidence. That is comparison, not source-bashing.", "Evidence")
        ],
        [
          q("Claim: a reading app doubled students' reading skill. Evidence: the app company surveyed volunteer users, who reported big improvement. What is the strongest evaluation?", ["Self-selected users self-reporting, gathered by the seller, cannot support a claim as strong as 'doubled' — the conclusion outruns the evidence", "The evidence is fine because the company knows its own app best", "Reading skill cannot be measured, so the claim is meaningless", "The study is acceptable because many users responded"], "Self-selected users self-reporting, gathered by the seller, cannot support a claim as strong as 'doubled' — the conclusion outruns the evidence", "Stack the problems: who gathered it, who answered, what was measured, what is claimed.", "Each issue alone calls for caution; together — seller incentive, volunteers, self-report, and a precise 'doubled' claim — the evidence cannot carry the conclusion. Naming that gap is exactly the skill.", "Evidence")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Signposting",
    slug: "debate-signposting",
    description: "Make your speech easy to flow with clear labels and transitions.",
    category: "Debate foundations",
    order: 2,
    lesson: {
      title: "Guide the judge through your speech",
      slug: "debate-signposting-lesson",
      summary: "Use labels, numbers, and transitions so the judge never gets lost.",
      estimatedMinutes: 6,
      content: lesson(
        "Use signposts to organize arguments out loud.",
        "A signpost is a short label that tells listeners where you are in the speech. Good signposting sounds like: first, on their evidence, now on impact comparison.",
        "Debate judges track arguments quickly. If they cannot place your response on the flow, even a smart answer may be missed.",
        ["Preview the order.", "Label each argument before explaining it.", "Use transition phrases when you move to a new issue."],
        {
          prompt: "Respond to two arguments about cost and safety.",
          weakAnswer: "That is wrong because the cost is lower and safety is better too.",
          strongAnswer: "I have two answers. First, on cost: the plan uses existing advisory time, so the budget impact is small. Second, on safety: teaching responsible use reduces risky shortcuts.",
          whyItWorks: "The strong answer numbers the responses and names the issue before explaining."
        },
        q(
          "Which phrase is the clearest signpost?",
          ["That is not true", "Next, on their cost argument", "Everyone knows this", "We win"],
          "Next, on their cost argument",
          "A signpost names where the judge should place the response.",
          "This phrase tells the judge the speaker is moving to the cost argument.",
          "Signposting"
        ),
        [
          q("What should a preview do?", ["Tell the judge the order of the speech", "Replace evidence", "Hide the main claim", "End the round"], "Tell the judge the order of the speech", "A preview is a roadmap.", "A preview helps the judge follow the structure before details begin.", "Speech organization"),
          q("Which transition is strongest?", ["Also stuff", "Moving to their second contention", "Anyway", "Like I said"], "Moving to their second contention", "The best transition names the next flow location.", "This transition clearly identifies where the response belongs.", "Signposting"),
          q("Why does signposting improve scores?", ["It makes arguments easier to follow", "It makes speeches longer", "It avoids all clash", "It replaces warrants"], "It makes arguments easier to follow", "Think about what helps a judge flow.", "Judges reward arguments they can understand and place on the flow.", "Clarity")
        ],
        [
          q("You are answering the opponent's evidence. What should your signpost mention?", ["Evidence", "Your lunch", "The room", "A random voter"], "Evidence", "Name the argument area you are answering.", "A targeted signpost tells the judge this answer belongs on the evidence flow.", "Signposting")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Clash",
    slug: "debate-clash",
    description: "Find the real disagreement and answer it directly.",
    category: "Debate foundations",
    order: 3,
    lesson: {
      title: "Create direct clash",
      slug: "debate-clash-lesson",
      summary: "Learn how to identify and resolve the main disagreement.",
      estimatedMinutes: 7,
      content: lesson(
        "Identify what both sides disagree about and answer that point directly.",
        "Clash happens when two arguments meet on the same point. It starts with finding what the two sides actually disagree about — not what they both accept. A responsive answer targets the opponent's reasoning on that disputed point: repeating your own case is not clash, and answering a claim the opponent never made is not clash either. The strongest clash goes one step further and explains why your direct answer changes the disputed issue in your favour.",
        "Rounds are won on comparison. Clash shows the judge that you are not just speaking well, you are winning the debate.",
        ["Name the opponent's claim.", "State your answer.", "Explain why your answer matters more or proves their claim wrong."],
        {
          prompt: "Opponent says the plan costs too much.",
          weakAnswer: "Our plan is still good.",
          strongAnswer: "On cost, they assume a new class is required. Our plan uses existing advisory time, so their budget objection does not apply.",
          whyItWorks: "The strong answer names the opposing argument and directly removes its assumption."
        },
        q("Which response creates clash?", ["Our case is important.", "On cost, their objection assumes a new class, but our plan uses advisory time.", "I will move on.", "This topic is interesting."], "On cost, their objection assumes a new class, but our plan uses advisory time.", "Look for a direct answer to the other side.", "This response meets the cost argument directly.", "Clash"),
        [
          q("Side A argues a longer lunch break improves focus in afternoon classes. Side B argues the schedule cannot fit a longer lunch without cutting class time. Where is the real disagreement?", ["Whether the schedule can absorb a longer lunch, since Side B never disputed the focus benefit", "Whether focus matters in afternoon classes", "Whether students enjoy lunch", "Whether school days have schedules"], "Whether the schedule can absorb a longer lunch, since Side B never disputed the focus benefit", "Find the point Side B actually contests.", "Side B accepts the focus claim and attacks the schedule fit, so that is where the clash lives. Engaging anything else answers a point nobody disputed.", "Clash"),
          q("Which is weakest?", ["They say cost, we answer with existing time.", "They say safety, we answer with training.", "Our first contention is still true.", "They say delay, we answer with phase-in."], "Our first contention is still true.", "Repeating your case is not direct clash.", "This does not answer a specific opposing argument.", "Clash"),
          q("The opponent argues a school garden takes up field space used for sports. Which reply creates clash?", ["Gardens teach responsibility, which is our first contention.", "The garden plan uses the unused corner lot, so no field space is lost.", "Sports are also valuable to students.", "We will now summarise our own case."], "The garden plan uses the unused corner lot, so no field space is lost.", "Which reply meets the space objection itself?", "Only the corner-lot answer engages the opponent's actual objection. Restating your contention or agreeing sports matter leaves the space argument standing.", "Clash")
        ],
        [
          q("If the opponent says your plan is unrealistic, what should you answer first?", ["The feasibility objection", "A new unrelated benefit", "Your speaking time", "The ballot color"], "The feasibility objection", "Answer their exact pressure point.", "Directly answering feasibility creates clash.", "Clash")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Refutation",
    slug: "debate-refutation",
    description: "Use a repeatable pattern to answer opposing arguments.",
    category: "Debate responses",
    order: 4,
    lesson: {
      title: "Answer with refutation",
      slug: "debate-refutation-lesson",
      summary: "Use they say, but, because, therefore to build strong rebuttal answers.",
      estimatedMinutes: 8,
      content: lesson(
        "Write a direct refutation using a clear four-part structure.",
        "Refutation is the skill of answering the other side. A simple structure is: they say, but, because, therefore.",
        "This keeps rebuttals from becoming scattered. It also makes your answer easy for the judge to evaluate.",
        ["They say: identify the argument.", "But: state your answer.", "Because: explain why.", "Therefore: tell the judge what to do with it."],
        {
          prompt: "They say AI literacy wastes class time.",
          weakAnswer: "No it does not.",
          strongAnswer: "They say AI literacy wastes class time, but it can fit inside existing advisory lessons because schools already use that time for digital citizenship. Therefore, the time-cost argument is smaller than our preparedness benefit.",
          whyItWorks: "The strong answer identifies, answers, explains, and weighs the argument."
        },
        q("Which part explains the reason the answer is true?", ["They say", "But", "Because", "Therefore"], "Because", "The word because usually introduces the warrant.", "The because part gives the reasoning behind the refutation.", "Refutation"),
        [
          q("What does 'therefore' do?", ["Tells the judge the result of the answer", "Starts a new claim only", "Copies the opponent", "Gives speaker points"], "Tells the judge the result of the answer", "It closes the loop.", "Therefore explains how the judge should treat the argument after your answer.", "Refutation"),
          q("Which refutation is best?", ["They are wrong.", "They say it costs too much, but the plan uses existing resources because advisory time already exists, so cost is not a voter.", "Our case is nice.", "I disagree strongly."], "They say it costs too much, but the plan uses existing resources because advisory time already exists, so cost is not a voter.", "Look for all four parts.", "This answer identifies the claim, answers it, explains why, and gives a result.", "Refutation"),
          q("What should refutation avoid?", ["Direct answers", "Specific warrants", "Vague denial", "Clear therefore statements"], "Vague denial", "Saying no is not enough.", "Vague denial does not explain why the opposing argument fails.", "Refutation")
        ],
        [
          q("In 'They say X, but Y because Z,' what is Y?", ["The answer", "The judge", "The impact", "The topic"], "The answer", "But introduces the response.", "Y is the direct answer to the opponent's claim.", "Refutation")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Weighing Arguments",
    slug: "debate-weighing",
    description: "Compare impacts so the judge knows which argument matters more.",
    category: "Debate responses",
    order: 5,
    lesson: {
      title: "Explain why your impact wins",
      slug: "debate-weighing-lesson",
      summary: "Use magnitude, probability, and timeframe to compare arguments.",
      estimatedMinutes: 8,
      content: lesson(
        "Compare impacts instead of only listing them.",
        "Weighing explains why one argument matters more than another. Magnitude, probability, timeframe, and reversibility are useful names for common comparison moves — the skill is making the comparison clear, not saying the lens words.",
        "Judges often believe both sides have some truth. Weighing tells them which truth should decide the round.",
        ["Identify both impacts.", "Pick a weighing lens.", "Explain why your impact wins under that lens."],
        {
          prompt: "Aff says preparedness; Neg says class time.",
          weakAnswer: "Preparedness is more important.",
          strongAnswer: "Preparedness outweighs class time on timeframe and reversibility. Lost class time is small and adjustable, but students using AI irresponsibly can create immediate academic and career consequences.",
          whyItWorks: "The strong answer compares both impacts and explains why one should decide the round — the lens names just make that comparison easy to follow."
        },
        q("Which phrase is weighing?", ["Our impact is bigger and happens sooner", "We have an impact", "They are wrong", "I have two points"], "Our impact is bigger and happens sooner", "Weighing compares importance.", "This phrase compares magnitude and timeframe.", "Weighing"),
        [
          q("Aff wins a jobs impact; Neg wins a housing-cost impact. Which response weighs them?", ["Jobs matter more here because lost income reaches more families and cannot be recovered quickly", "Our jobs argument is very strong", "The Neg is simply wrong about housing", "We made more arguments than they did"], "Jobs matter more here because lost income reaches more families and cannot be recovered quickly", "Weighing compares the two impacts against each other.", "Only this answer compares the two impacts and says why one should matter more. That comparison is weighing, whatever words it uses.", "Weighing"),
          q("Their impact is huge but very unlikely; yours is smaller but nearly certain. Which comparison resolves that honestly?", ["Prefer the near-certain impact, because a harm that will almost surely happen should beat one that probably never does", "The huge impact automatically wins because it is bigger", "Tell the judge to ignore likelihood", "Neither impact counts"], "Prefer the near-certain impact, because a harm that will almost surely happen should beat one that probably never does", "Compare how likely each impact is, not only its size.", "This weighs likelihood against size and tells the judge why likelihood should decide here. A speaker can make this move without ever saying the word probability.", "Weighing"),
          q("Why weigh arguments?", ["To help the judge decide between impacts", "To avoid rebuttal", "To skip definitions", "To make speeches confusing"], "To help the judge decide between impacts", "Think about decision-making.", "Weighing turns competing impacts into a clear decision.", "Weighing")
        ],
        [
          q("Your harm begins now; theirs arrives years away. Which sentence weighs that difference?", ["Our harm is already starting, so the judge should act on it before their distant harm can even begin", "Our impact is about time", "Their impact is in the future, so it must be false", "Both impacts exist"], "Our harm is already starting, so the judge should act on it before their distant harm can even begin", "Explain why sooner should matter to the decision.", "This uses the time difference to tell the judge why one impact should decide the round — timeframe weighing, whether or not the word is said.", "Weighing")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Answer Types",
    slug: "debate-answer-types",
    description: "Classify answers as defense, indict, turn, or offense, and choose the kind a round needs.",
    category: "Debate responses",
    order: 11,
    lesson: {
      title: "Know what your answer does",
      slug: "debate-answer-types-lesson",
      summary: "Tell defense, indicts, turns, and offense apart by what each accomplishes, and pick what the round needs.",
      estimatedMinutes: 7,
      content: lesson(
        "Classify answers by what they do — defense, indict, turn, or offense — and choose the kind of answer the round actually needs.",
        "Suppose the other side argues that a new downtown park will hurt nearby shops. You could answer in several ways, and each answer DOES a different job. If you show the harm is smaller or shakier than claimed, that is a defensive answer: when it succeeds, their argument gets smaller or less credible, but nothing new counts for you. One special kind of defense is the INDICT: you attack the argument's support — the source, the reasoning, the assumptions behind it — so the judge trusts it less. An indict weakens; it never reverses. An OFFENSIVE answer does a different job: it creates a reason the judge should prefer YOUR side. A simple way to keep them straight: defense explains why they lose an argument; offense creates a reason you win. The most surprising offensive move is the TURN, a reversal: followed honestly, the argument they made becomes a reason for your side — the harm they warned about points the other way, or the measure they chose favours you. These are functional categories, not magic labels: what matters is what the answer accomplishes if it succeeds, not what you call it. The refutation structure — they say, but, because, therefore — still tells you HOW to state any answer; this lesson is about WHAT KIND of answer you are making inside that structure. Turns also come in named varieties you will meet in a later lesson; for now, the skill is spotting the reversal.",
        "Judges vote for reasons, not for damage. Defense is not bad — a clean defensive answer is often exactly what a moment needs — and depending on what each side must prove and what remains standing, defense can sometimes be enough. The strategic risk comes when some of their offense survives and you have built no offense of your own: you may have made their case smaller all round without giving the judge a competing reason to prefer your side.",
        ["Restate what they claimed, in one sentence.", "Name the part your response attacks: the claim itself, its support, or where it leads.", "Ask: if this response fully succeeds, what is now true in the round?", "Decide the direction: did their argument only get weaker or smaller, or does something now count for your side?", "Classify: weaker only is defense (an indict if you attacked its support); counting for you is offense (a turn if their own argument was reversed to help you)."],
        {
          prompt: "Topic: the city should turn a downtown parking lot into a public park. Opponent: shoppers will lose parking, so nearby businesses will lose customers. Response A: their claim rests on a survey of what business owners fear, not on any sales data. Response B: in similar projects, the park brought shops more foot traffic than the parking spots ever did — their business concern favours the park. Classify each response.",
          weakAnswer: "Both responses beat the business argument, so both count as offense for our side.",
          strongAnswer: "Response A is an indict: if it succeeds, the judge trusts their support less and the argument weakens — but they only lose ground; nothing counts for us yet. Response B is a turn: if it succeeds, the business concern they raised now argues FOR the park, so the judge gains a reason to prefer our side. In the refutation structure both begin the same way — they say shoppers are lost, but... — the difference is what each answer accomplishes.",
          whyItWorks: "The strong answer classifies by outcome — what is true if the response succeeds — instead of by how forceful the response sounds. Weakening the support is an indict; making their own concern point your way is a turn."
        },
        q("The opponent argues your school recycling plan is too expensive. You answer: the plan is fully paid for by an existing county grant, so no school money is spent. Your answer completely succeeds. What kind of answer was it?", ["Defense — the cost objection is gone, but the judge still has no new reason to support recycling", "Offense — any answer that fully succeeds becomes offense", "A turn — the cost argument now helps your side", "An indict — you attacked the source of their cost figures"], "Defense — the cost objection is gone, but the judge still has no new reason to support recycling", "Ask what is true after the answer succeeds — did anything start counting FOR you?", "This is the classic trap: a strong, completely successful answer can still be pure defense. Success is not what makes offense — direction is. The cost argument is removed, which is real progress, but removal only means they lose that argument; nothing here gives the judge a reason to vote for recycling. And no source was attacked, so it is not an indict.", "Answer Types"),
        [
          q("Topic: ban single-use plastic bags. Opponent: reusable cotton bags are worse for the environment, because making one takes far more resources than making one plastic bag. You answer: one reusable bag replaces hundreds of plastic ones over its life, so on the environmental measure they chose, the ban comes out ahead. What did your answer do?", ["Played defense — it only shows their resource number is smaller than claimed", "Indicted their evidence — it attacks where their resource figures came from", "Turned the argument — the environmental concern they raised now counts in favour of the ban", "Changed the subject to a different advantage of the ban"], "Turned the argument — the environmental concern they raised now counts in favour of the ban", "Follow their own measure to its honest conclusion — whose side does it land on?", "This is a reversal. You accepted their measure — total environmental cost — and showed that, counted over whole lifetimes, it favours the ban. Their concern became your reason, and that reversal is exactly what makes a turn. Merely shrinking their number would have been defense, and nothing here questions their sources, so it is not an indict.", "Answer Types"),
          q("Opponent: the new stadium will boost the local economy, according to a report. You answer: that report was commissioned by the stadium's own developer and counts spending that would have happened in town anyway. If your answer succeeds, what has it accomplished?", ["A turn — attacking their evidence flips the economy argument to your side", "An indict — the judge trusts the report less, so the economy argument carries less weight, but it does not count for your side", "Offense — it gives the judge a new reason of your own to oppose the stadium", "It proves stadiums harm local economies everywhere"], "An indict — the judge trusts the report less, so the economy argument carries less weight, but it does not count for your side", "Weakening their support and reversing their argument are different jobs.", "Indict and turn are not the same move. An indict attacks the argument's support — here the report's incentives and its counting method — so the argument weakens. A turn would require the economy issue to end up favouring your side, and nothing here does that. Even a devastating indict is still defense: their loss, not your gain.", "Answer Types"),
          q("They claim school uniforms reduce bullying, citing a small survey. You read a much larger, better-designed study finding uniforms have no effect on bullying. A teammate whispers: great, that turns their argument. Is the teammate right?", ["Yes — whenever your evidence is better than theirs, the argument is turned", "Yes — a larger study always converts an argument into offense", "No — because surveys can never be answered with studies", "No — stronger counter-evidence is still defense here, because a finding of no effect cancels their advantage without making bullying a reason for your side"], "No — stronger counter-evidence is still defense here, because a finding of no effect cancels their advantage without making bullying a reason for your side", "A turn needs a reversal. Did the bullying issue end up pointing at your side?", "Better evidence makes an answer stronger, not offensive. A finding of no effect neutralises their advantage — excellent defense — but the bullying issue now counts for nobody. If your study had instead found uniforms increase bullying, the issue would point your way and you would have a turn. What the answer accomplishes, not the quality of the evidence, decides the label.", "Answer Types"),
          q("Your rebuttal answered all three of their arguments with clean defensive answers and one sharp indict, and you spent no time on your own case. Their strongest argument survives in weakened form. What is the strategic gap?", ["Defensive answers were the wrong choice — every answer should have been a turn", "You made their case smaller but never gave the judge anything that counts for your side, so their surviving argument can still decide the round", "Indicts should never be used while any opposing argument survives", "There is no gap — weakening all three arguments guarantees the win"], "You made their case smaller but never gave the judge anything that counts for your side, so their surviving argument can still decide the round", "After all that defense, what reason does the judge have to vote FOR you?", "None of the defensive answers was a mistake — defense is often exactly the right tool, and here it did real work. The gap is what you relied on it to accomplish: defense can only shrink what they have, never build what you need. With part of their offense standing and yours unextended, the judge's only surviving reason belongs to them. The round needed at least one source of offense — your extended case, a turn, or both.", "Answer Types")
        ],
        [
          q("The opponent argues that keeping the library open later will exhaust its staff. Which response is a TURN?", ["The plan funds two new part-time hires, so nobody's shift gets longer", "Their exhaustion claim comes from a staffing report about a far larger city system", "Evening shifts are the shifts our staff most often request, so on their own staff-wellbeing concern, the later hours are an improvement", "Later hours also let working parents visit, which is a separate benefit"], "Evening shifts are the shifts our staff most often request, so on their own staff-wellbeing concern, the later hours are an improvement", "Three of these help you. Only one makes THEIR concern argue for your side.", "Walk the labels. The part-time hires answer removes the harm — defense. The larger-city report answer attacks their support — an indict, which is still defense. Working parents is offense, but it is a new independent reason, not a reversal. Only the shift-request answer takes the very concern they raised — staff wellbeing — and shows it favours later hours: their argument now helps you, which is what a turn is.", "Answer Types"),
          q("Final speech, four minutes left. Their case is mostly answered, but one of their advantages survives your defense, and your own case has not been mentioned since your first speech. What does this round need most?", ["More defensive answers piled onto the surviving advantage, since defense got you this far", "A restatement that their other arguments were all answered", "New indicts against evidence the judge has already discounted", "Something the judge can vote for: extend your own offense or a turn, and weigh it against their surviving advantage"], "Something the judge can vote for: extend your own offense or a turn, and weigh it against their surviving advantage", "Decide what the judge is missing, then pick the answer type that supplies it.", "The classification model also works in reverse: instead of labelling an answer, ask what the round is missing. The judge currently holds one live reason — theirs. More defense might shave it further but cannot hand the judge a reason to choose you; that job belongs to offense. Extending your case or a turn, then weighing it against what survives, supplies the missing piece. Defense got you here and was the right call earlier — it is simply the wrong tool for this last job.", "Answer Types")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Turn Mechanics",
    slug: "debate-turn-mechanics",
    description: "Split a causal argument into action, link, and impact, and choose the reversal — or the defense — each part supports.",
    category: "Debate responses",
    order: 12,
    lesson: {
      title: "Turn the right part of the argument",
      slug: "debate-turn-mechanics-lesson",
      summary: "Break a causal argument into action, link, and impact; tell denials from reversals at each level; and avoid the double turn.",
      estimatedMinutes: 9,
      content: lesson(
        "Split a causal argument into action, link, and impact; decide whether to deny, shrink, or reverse each part; and never reverse both parts of the same chain.",
        "In the answer-types lesson you learned to sort answers by what they accomplish, and you met the turn — the reversal that makes an opponent's own argument count for your side. You were promised that turns come in named varieties: this is that lesson, and the names depend on WHERE in the argument the reversal happens. Start with the argument itself. Suppose your side proposes building a skate park in Miller Park, and the opponent answers: the skate park will bring more teenagers into the neighborhood, and more teenagers around is bad for residents — noise and trouble. Look closely: this argument is a chain with three parts — an ACTION (build the skate park), a LINK (the causal claim that the action produces an outcome: more teenagers around the neighborhood), and an IMPACT (the value claim that the outcome is bad: more teenagers around means noise and trouble for residents). Almost every argument that predicts a consequence has this shape, and each part can be answered differently. (Real arguments sometimes run longer — action to outcome to a further outcome to the harm; debaters call the middle steps internal links, and the choices below apply at every step.) Try the first answer: 'the park will not bring more teenagers — the big regional skate park is two towns over, and small local parks like this sit half empty.' This denies that the action causes the outcome; the chain never starts. That is a NO-LINK. Notice what it accomplishes if it succeeds: their argument disappears, but nothing counts for your side — in the last lesson's language, it is defense. Now a different answer: 'teenagers already hang around this neighborhood — skating outside the pharmacy, sitting on the bank steps. A park gathers them into one supervised corner, so the streets see fewer roaming teens, not more.' This does not deny the connection between the park and teen presence; it reverses the direction — the action lowers the very thing they said it raises. That is a LINK TURN, and it is offense: their own concern now argues for the park. Keep those two straight. A no-link says the arrow from action to outcome does not exist; a link turn says the arrow points the other way. They are different moves with different results — not weaker and stronger versions of one answer. Now move down the chain to the endpoint. One answer there: 'even if the park draws a few more teenagers, it is a dozen skaters on weekend afternoons — a small rise the neighborhood will barely notice.' The outcome still arrives and is still counted as bad; you have only made it smaller. That is IMPACT DEFENSE — still defense. But the endpoint can be reversed too: 'more teenagers around is exactly what this neighborhood should want — young people out in the open, visible and known to their neighbors, make a street feel alive instead of empty.' This grants that the outcome happens and reverses its value: the very thing they called bad — more teenagers around — is defended as good for the residents themselves. That is an IMPACT TURN — offense again, because their predicted outcome is now a reason to vote your way. Shrinking and reversing are different moves: impact defense leaves the outcome bad but smaller; an impact turn makes the outcome good. One hazard remains, and it is the most important sentence here: do not run the link turn and the impact turn against the SAME chain. Say both reversals above and listen to what you have jointly claimed — the park means fewer teenagers around the neighborhood, and more teenagers around would be good. Together they argue that your own plan prevents something you yourself call good. The opponent can simply agree with both answers and thank you for the reason to vote against the park. That self-defeating combination is the DOUBLE TURN. Each reversal is strong alone; composed on one chain, they hand your offense to the other side. The fix is a choice: keep the reversal you can win, and let the other part of the chain get ordinary defense or nothing at all.",
        "A turn is not a magic word, and naming one is not the same as winning one. A link turn earns offense only when the outcome you now claim to change was genuinely coming: if the teens were never going to roam the streets anyway, proving your park keeps them away wins you nothing extra. An impact turn concedes, within that answer, that the outcome arrives — so you must actually win that the outcome is good, not merely assert it. That concession does not silence your other answers: you may still say, separately, 'it will not happen — and even if it does, it would be good.' Denial plus even-if reversal is a legitimate pair of alternatives, and judges hear it all the time. What you cannot do is combine a link turn and an impact turn into one story on the same chain. The double-turn rule is precise, not a superstition: it forbids reversing both the link and the impact of ONE chain. Turning two different arguments in the same round is normal, sound strategy — the contradiction lives inside a single chain, nowhere else. And often the honest choice is no turn at all: a clean no-link or a modest impact defense is frequently the stronger, safer play, exactly as the last lesson said about defense generally. One final honesty note: these labels travel with the idea, not the other way around. Public Forum opponents and judges use them; in many parliamentary rounds the judge will just call all of this refutation. If the vocabulary ever draws blank looks, drop the labels and keep the logic — what disappears, what shrinks, and what reverses is the same in every format.",
        ["Map their chain: what action, causing what outcome, and why is that outcome supposed to matter?", "Pick your target: the connection (does the action really produce the outcome?) or the endpoint (how big is the outcome, and is it really bad?).", "Ask what is true if your answer fully succeeds: does that part disappear (no-link), shrink (impact defense), or reverse (link turn at the connection, impact turn at the endpoint)? Among these four ways of answering this chain, only the two reversals turn their argument into offense for your side.", "If you reversed the link, hold the endpoint steady: you are treating their outcome as genuinely bad — the thing your side now prevents. Do not also call it good.", "If you reversed the impact, that answer grants that the outcome arrives. Do not ALSO claim your side reverses the outcome's arrival — pairing those two reversals is the double turn. A separate 'even if' denial is still fine: 'it will not happen — and even if it does, it would be good' offers the judge two consistent alternatives.", "Audit before you finish: reversed both the link and the impact of one chain? Drop one reversal — keep the stronger, and give the other part plain defense or silence."],
        {
          prompt: "Topic: the town should build a skate park in Miller Park. The opponent's one argument: 'The skate park will bring more teenagers into the neighborhood, and more teenagers around is bad for residents — noise and trouble.' Answer this single argument four different ways — deny the connection, reverse the connection, shrink the endpoint, reverse the endpoint — then decide which of your answers may be run together.",
          weakAnswer: "Run all four at once: the park will not bring more teenagers; even if it does, it is a handful of skaters; actually the park pulls teens off the surrounding streets; and honestly, more teenagers around would be good for the neighborhood anyway. Four answers beat one — we win this argument four different ways.",
          strongAnswer: "Label each answer by what it does to the chain before running any of them. 'The regional skate park two towns over already absorbs the skaters — this park will not add teenagers to the neighborhood' denies the action-outcome connection: a no-link, defense. 'Teens already hang around the pharmacy and the bank steps; a park gathers them into one supervised corner, so the streets see fewer roaming teens' reverses the connection: a link turn, offense. 'Even if the park draws a few more teens, it is a dozen kids on weekend afternoons — a small rise, not a wave' shrinks the endpoint: impact defense. 'More teenagers around would be a benefit, not a harm — young people out in the open, known to their neighbors, make a street feel alive' reverses the value of the very outcome they forecast: an impact turn, offense. Now audit the set: the link turn and the impact turn cannot share this chain — together they claim the park means fewer teenagers around while more teenagers around would be good, which is an argument for the other side. Choose one story. Either run the link turn and leave the more-teens-is-good thought unsaid, or run the impact turn and drop the claim that the park thins the streets. And if neither reversal is winnable, the no-link plus the impact defense make a clean, consistent all-defense package.",
          whyItWorks: "The strong answer does two things the weak answer skips. First, it classifies each response by which part of the chain it touches and what happens to that part — disappear, shrink, or reverse — which is what makes the no-link defense, the two reversals offense, and the shrink merely helpful. Second, it runs the compatibility audit: four individually strong answers are not additive, because the two reversals compose into a claim that helps the opponent. Choosing a consistent story, not stacking every good line, is the strategic skill this lesson exists to teach."
        },
        q("Your team proposes opening the school gym at 6 a.m. for student athletes. The opponent answers: 'Early workouts will leave the athletes exhausted, and exhausted students learn less in every class.' Before responding, you map their chain. Which part of what they said is the link?", ["The gym opens at 6 a.m. for student athletes", "Early workouts will leave the athletes exhausted", "Students who are exhausted learn less in every class", "Student athletes care more about sports than classes"], "Early workouts will leave the athletes exhausted", "The link is the middle of the chain — the claim that doing the action will produce a particular outcome.", "Their chain runs action to link to impact. The action is opening the gym at 6 a.m.; the link is the causal prediction that early workouts produce exhaustion; the impact is the claim that the outcome is harmful — exhausted students learn less. The fourth option appears nowhere in their argument. Mapping the chain first matters because every answer in this lesson aims at one part of it: deny or reverse the link, or shrink or reverse the impact.", "Turn Mechanics"),
        [
          q("Your school proposes compost bins in the cafeteria. The opponent argues: 'Compost bins will attract pests, and pests in a cafeteria are a health hazard.' You answer: 'These are sealed bins emptied daily — schools using this exact system report no change in pest sightings at all.' If your answer succeeds, what has it done?", ["Reversed the direction of their causal claim, so the pest concern they raised now gives the judge a reason to support the compost bins", "Granted that the pests do arrive but shown that the health risk they pose is far smaller than the opponent claimed it would be", "Made the same move as a turn but at lower strength — a softer, more cautious version of reversing the opponent's argument", "Denied that the bins produce the outcome at all — their argument collapses, but nothing new starts counting for your side"], "Denied that the bins produce the outcome at all — their argument collapses, but nothing new starts counting for your side", "Does your answer say the arrow from action to outcome points the other way, or that there is no arrow?", "This is a no-link: it denies the causal connection — sealed bins simply do not produce pests. If it succeeds, their argument disappears, which is valuable, but it is defense: no new reason to adopt the bins has been created. It is not a reversal at any strength — a link turn would claim the opposite arrow, for example that compost bins reduce pests by moving food scraps out of open cafeteria trash. No-link and link turn are different moves with different results, not weaker and stronger versions of one another. And nothing here concedes that pests arrive, so it is not impact defense either.", "Turn Mechanics"),
          q("The city proposes making buses free for students. The opponent argues: 'Free buses will pull students away from walking and biking, and losing that daily exercise harms their health.' Which response is a link turn?", ["Fare-free buses increase daily walking, since every rider walks to a stop and back — fare-free districts measured more student steps, not fewer", "Most students already live too far away to walk or bike to school, so a free fare will not change how anyone actually travels in the morning", "Whatever biking is lost comes to a few minutes a week, far too little exercise for the change to show up anywhere in student health", "The health evidence they read comes from a study of adult commuters rather than students, so it cannot support the claim they are making in this round"], "Fare-free buses increase daily walking, since every rider walks to a stop and back — fare-free districts measured more student steps, not fewer", "One response keeps their outcome in play — and sends it in the other direction.", "The walking-to-stops response reverses the direction of their causal claim: the action produces more daily exercise, not less, so their own health concern now argues for free buses — offense, which is what makes it a link turn. The too-far-to-walk response denies the connection entirely: a no-link, defense. The few-minutes response grants the loss and shrinks it: impact defense. The adult-commuters response attacks the evidence behind the argument: an indict, from the answer-types lesson — it weakens trust, but weakening is still defense.", "Turn Mechanics"),
          q("The town proposes lighting the river trail at night. The opponent argues: 'Lighting will draw crowds of evening visitors to the trail, and nightly crowds along the river are the last thing this quiet neighborhood needs.' You answer: 'They are right that the visitors will come — and that is the good news. A trail with people on it every evening is a trail residents feel safe walking, and the people who use a river become the people who stand up for it.' Your teammate says: 'Good — you showed the crowds will be less of a problem than they claimed.' Is your teammate's label right?", ["Yes — an answer aimed at the endpoint of a chain is by definition an answer that reduces the size of the impact the opponent claimed", "Yes — by presenting the visitors as peaceful trail users rather than a rowdy mob, the answer cuts the nuisance down to a size the neighborhood can live with", "No — the answer never says the crowds will be smaller or quieter; it grants that the crowds arrive and argues their arrival is itself a benefit — a reversal, not a reduction", "No — the answer actually denies that the lighting will draw evening crowds in the first place, so the outcome the opponent fears never arrives"], "No — the answer never says the crowds will be smaller or quieter; it grants that the crowds arrive and argues their arrival is itself a benefit — a reversal, not a reduction", "'Smaller but still bad' and 'actually good' are different claims — which one did the answer make?", "The teammate has confused impact defense with an impact turn. Impact defense would say the crowds will be thin, rare, or barely noticeable — the outcome stays bad, just smaller, and the answer stays defense. This answer does something else: it concedes that the crowds arrive and reverses the value of that very outcome — safe evening streets and river stewards make the nightly crowds the opponent feared a benefit. That reversal is an impact turn, and it is offense: the outcome the opponent warned about is now a reason to vote for the lights. Nothing in the answer denies the crowds or shrinks them, and the label matters because it changes what you tell the judge the answer has earned.", "Turn Mechanics"),
          q("Your school proposes replacing paper textbooks with e-textbooks. The opponent argues: 'E-textbooks will increase students' evening screen time, and more screen time damages sleep.' Your partner gives two answers: first, 'e-textbooks reduce evening screen time, because built-in search and study tools replace hours of nightly scrolling for resources'; second, 'the extra evening screen time they are worried about is time spent reading — and an evening spent reading is an evening well spent, whether the page is paper or glass.' What has your partner just done?", ["Built two fully independent answers, so the argument is now beaten twice over and either one of the answers alone can still win it", "Reversed both the connection and the outcome's value on one chain — together the answers claim the plan reduces something good", "Given the judge two layers of defense, each of which only shrinks the opponent's argument without adding offense", "Attacked the opponent's evidence from two different directions, so their sleep claim now has no support left standing"], "Reversed both the connection and the outcome's value on one chain — together the answers claim the plan reduces something good", "Say the two answers as one sentence — what does that sentence claim your own plan does?", "The first answer is a link turn: it reverses the direction of their causal claim — the plan lowers evening screen time rather than raising it. The second is an impact turn: it grants the extra screen time and reverses its value — that time is evenings spent reading, which it defends as good. Run together on the same chain, they compose into a new claim — e-textbooks reduce evening reading time your partner just called good. That is a double turn: the combination argues against your own proposal, and the opponent can claim the offense by simply agreeing with both halves. Neither answer is a denial, a shrink, or an evidence attack — and they are certainly not independent, because each one changes what the other means.", "Turn Mechanics"),
          q("Defending your proposal for a fenced dog park, you answered the opponent's argument — 'a dog park will bring more dogs into the neighborhood, and more dogs mean more noise' — with two responses: the fenced park will thin out the dogs already roaming the sidewalks, and anyway, more dogs around would be good because dog walkers make streets feel watched and friendly. The opponent stands up and cheerfully agrees with both. What is the best repair in your next speech?", ["Keep the reversal you can best win — the park thins out sidewalk dogs — cut the claim that more dogs would be good, and treat any leftover noise as small", "Restate both of the responses with more evidence and more force in the next speech, since each of the two was independently strong at the moment it was delivered", "Withdraw both responses completely and concede the noise argument, since answers that contradict each other cannot be worth anything to the judge", "Point out that the two responses were aimed at two different opposing arguments, so no contradiction between them ever actually existed"], "Keep the reversal you can best win — the park thins out sidewalk dogs — cut the claim that more dogs would be good, and treat any leftover noise as small", "A contradiction is repaired by choosing one story — not by volume, and not by surrender.", "The two responses reversed both parts of one chain — the opponent agreed with both because together they claim the park prevents something you called good. The repair is to choose: keep one reversal and give up the other. Keeping the link turn and downgrading the impact answer to plain smallness restores one consistent story — the park reduces roaming dogs, and any noise that remains is minor — a single reversal backed by ordinary defense. Doubling down repeats the contradiction louder; total concession throws away a winnable argument; and the different-arguments excuse fails because both responses plainly answered the same chain.", "Turn Mechanics")
        ],
        [
          q("Your team proposes hosting a Saturday farmers market in the school parking lot. The opponent argues: 'A market will draw outside visitors onto campus, and outsiders on school grounds are a safety concern.' Your speech reverses both parts: a staffed Saturday market actually means fewer outsiders on campus than the empty lot draws now, because organized stalls replace unsupervised weekend loitering; and outside visitors are good for the school — they build community ties and buy from student fundraisers. Why is this combination dangerous rather than doubly strong?", ["Because judges discount the credibility of any speaker who offers more than one response to a single opposing argument", "Because reversals are the weakest kind of answer a debater can give, so stacking two of them together weakens the whole speech twice over", "Because giving two answers to a single argument at the same time leaves the judge unsure which response answers which part of the opposing case", "Because together the reversals claim the market prevents visitors you called good — a reason against your own side the opponent can adopt"], "Because together the reversals claim the market prevents visitors you called good — a reason against your own side the opponent can adopt", "Merge the two reversals into a single sentence, then ask which side of the debate that sentence belongs to.", "The danger is logical, not procedural. Reverse the connection and you claim the market lowers the number of outside visitors; reverse the value and you claim outside visitors are a benefit. Composed, your speech now argues that your own proposal prevents a good thing — offense for the opponent, who can win the point by conceding both of your answers. Multiple responses to one argument are normal and often wise; reversals are among the strongest answers available, not the weakest; and the problem is not judge confusion — a judge who follows you perfectly is exactly the judge who spots the contradiction.", "Turn Mechanics"),
          q("Your side proposes homework-free weekends. The opponent argues: 'Without weekend homework, students will forget material by Monday, and that forgetting forces teachers to spend class time reteaching.' Which response is an impact turn?", ["Students actually remember more after genuine rest, not less — recall improves after real breaks, so Monday classes would start out sharper than they do now", "Whatever forgetting happens over two days needs about a five-minute Monday warm-up to fix, which is a trivial cost to the teaching week", "The reteaching they dread is a gift to learning — revisiting material after a gap is exactly how knowledge sticks, so those Monday reviews would deepen mastery", "Their forgetting claim is built on research about the long summer holiday, which says nothing about what two days away from homework do to memory"], "The reteaching they dread is a gift to learning — revisiting material after a gap is exactly how knowledge sticks, so those Monday reviews would deepen mastery", "Find the response that keeps their predicted outcome — and calls it a gain.", "The Monday-review response grants the outcome — some forgetting and some reviewing will happen — and reverses its value: revisiting after a gap strengthens learning, so the thing they feared becomes a reason for homework-free weekends. That is the impact turn. The sharper-Monday response is also a reversal, but of the connection: rest causes better memory, not worse — a link turn, one level up the chain. The five-minute response shrinks the endpoint: impact defense. The summer-holiday response attacks the evidence: an indict. And note the corollary from this lesson: you could run the link turn or the impact turn here, but running both on this one chain would claim your plan prevents beneficial reviewing — a double turn.", "Turn Mechanics"),
          q("Your class is planning its overnight spring trip, and your side proposes leaving the final afternoon completely unscheduled — no tours, no activities, three open hours. The opponent argues: 'An unscheduled afternoon means students will spend three hours with nothing planned and nothing to do, and on a once-a-year trip, hours of nothing are hours thrown away.' You answer: 'They are right — there will be three hours of nothing, and that nothing is the best thing on the itinerary. A stretch of time with no tour to follow and no worksheet to finish is the rarest thing we ever hand students: unhurried hours that belong entirely to them. That is not time thrown away; that is the part of the trip worth protecting.' If this answer fully succeeds, what has it done to their chain?", ["Denied the connection — the answer shows the students will fill the afternoon with plans of their own, so the empty hours the opponent predicted never actually arrive", "Shrunk the endpoint — the answer concedes that some trip time is wasted but shows the waste is far smaller than the opponent made it sound, too little to decide anything", "Attacked the argument's support — the answer strips the credibility from the opponent's account of how students spend unplanned time, so their chain loses its weight with the judge", "Reversed the endpoint — the hours of nothing they counted as thrown away are defended as the best part of the trip, so the outcome they predicted now argues for your side"], "Reversed the endpoint — the hours of nothing they counted as thrown away are defended as the best part of the trip, so the outcome they predicted now argues for your side", "The answer agrees the empty hours are coming. What does it say about those hours themselves — gone, smaller, or worth wanting?", "Their chain ends at three hours with nothing planned, and they evaluate that outcome itself as bad — hours thrown away. Your answer concedes that this exact outcome arrives and reverses its value: the empty hours are defended as the most valuable part of the trip, unhurried time that belongs to the students. That is an impact turn — offense at the endpoint of the chain, because the outcome they predicted is now a reason to adopt the unscheduled afternoon. You did not deny the empty hours — you welcomed them; you did not shrink the loss — you argued the hours are no loss at all; and you never questioned the support behind their prediction. The procedure transfers to any chain: find the outcome the opponent evaluated, then ask whether your answer makes it disappear, shrink, or change sides — only changing its side is the impact turn.", "Turn Mechanics")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Constructive Speeches",
    slug: "debate-constructive-speeches",
    description: "Build the first version of your case clearly and strategically.",
    category: "Debate speeches",
    order: 6,
    lesson: {
      title: "Build a constructive speech",
      slug: "debate-constructive-speeches-lesson",
      summary: "Learn what belongs in the first major speech.",
      estimatedMinutes: 7,
      content: lesson(
        "Write a constructive speech with definitions, contentions, and impacts.",
        "A constructive speech builds the foundation of the round. It should define the topic, present major contentions, and explain impacts.",
        "Later speeches depend on this foundation. If the constructive is vague, rebuttals become harder and the judge has less to evaluate.",
        ["Define key terms.", "Present two or three contentions.", "Explain the warrant and impact for each contention."],
        {
          prompt: "Opening government speech on AI literacy.",
          weakAnswer: "AI literacy is good and students need it.",
          strongAnswer: "We define AI literacy as practical training in responsible tool use. Contention one: it improves academic integrity because students learn limits and citation habits. Contention two: it improves career readiness because students practice safe workplace use.",
          whyItWorks: "The strong answer defines terms and creates organized contentions."
        },
        q("What belongs in a constructive speech?", ["Definitions and contentions", "Only new rebuttal", "Only jokes", "The final ballot"], "Definitions and contentions", "Constructives build the case.", "A constructive speech sets terms and introduces major arguments.", "Constructive"),
        [
          q("What is a contention?", ["A major line of argument", "A speaker rank", "A timer", "A room rule"], "A major line of argument", "Contentions are case pillars.", "A contention is a main argument supporting the case.", "Contention"),
          q("Why define terms?", ["To clarify the debate", "To avoid all clash", "To hide your case", "To replace evidence"], "To clarify the debate", "Definitions set boundaries.", "Clear definitions prevent confusion and focus the round.", "Definitions"),
          q("How many contentions are usually easier for beginners?", ["Two or three", "Ten", "Zero", "One hundred"], "Two or three", "Enough depth, not overload.", "Two or three contentions are manageable and distinct.", "Constructive")
        ],
        [
          q("If the judge cannot tell what your plan means, what did you likely miss?", ["Definitions", "A trophy", "Speaker rank", "A closing thank-you"], "Definitions", "Terms make the plan understandable.", "Definitions clarify the case and prevent confusion.", "Definitions")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Rebuttal Speeches",
    slug: "debate-rebuttal-speeches",
    description: "Collapse to the arguments that decide the round.",
    category: "Debate speeches",
    order: 7,
    lesson: {
      title: "Win the rebuttal",
      slug: "debate-rebuttal-speeches-lesson",
      summary: "Learn how rebuttals should answer, extend, and weigh.",
      estimatedMinutes: 7,
      content: lesson(
        "Use rebuttal time to resolve the round, not restart it.",
        "A rebuttal speech should answer the most important opposing arguments, extend your best offense, and explain the voters.",
        "Rebuttals are where judges often decide the round. A focused rebuttal is stronger than a rushed list.",
        ["Pick the key issues.", "Answer the opponent's best argument.", "Extend your best argument.", "Weigh and name voters."],
        {
          prompt: "Final rebuttal after many arguments.",
          weakAnswer: "I will answer everything quickly.",
          strongAnswer: "This round comes down to feasibility versus preparedness. We win feasibility because the plan uses advisory time, and we win preparedness because the impact is immediate and long term.",
          whyItWorks: "The strong answer collapses to the central comparison."
        },
        q("What should a rebuttal prioritize?", ["Key issues and weighing", "Every minor sentence", "New contentions", "Unrelated examples"], "Key issues and weighing", "Final speeches decide the ballot.", "Rebuttals should focus on the arguments most likely to decide the round.", "Rebuttal"),
        [
          q("What is collapsing?", ["Focusing on fewer winning issues", "Dropping every argument", "Speaking faster only", "Adding a new case"], "Focusing on fewer winning issues", "Collapse means narrow the debate.", "Collapsing helps the judge see the decisive issues.", "Rebuttal"),
          q("What is a voter?", ["A reason the judge should decide for you", "A random example", "A definition only", "A team name"], "A reason the judge should decide for you", "Voters decide ballots.", "A voter tells the judge why your side should win.", "Voter"),
          q("What should rebuttals avoid?", ["New arguments", "Weighing", "Direct answers", "Extending offense"], "New arguments", "Late new material is usually unfair and confusing.", "Rebuttals should resolve existing arguments rather than introduce fresh case offense.", "New arguments")
        ],
        [
          q("A final speech introduces a brand-new contention. What is the problem?", ["It is a new argument in rebuttal", "It is too clear", "It is a signpost", "It is a definition"], "It is a new argument in rebuttal", "New content belongs earlier.", "Rebuttal speeches should not surprise opponents with new major arguments.", "New arguments")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Parliamentary Debate Roles",
    slug: "debate-parliamentary-roles",
    description: "Understand what each side and speech is trying to do.",
    category: "Parliamentary debate",
    order: 8,
    lesson: {
      title: "Know your parliamentary role",
      slug: "debate-parliamentary-roles-lesson",
      summary: "Learn the jobs of government and opposition speakers.",
      estimatedMinutes: 6,
      content: lesson(
        "Match your speech choices to your role in parliamentary debate.",
        "Government builds and defends a case. Opposition tests the case, offers counter-pressure, and explains why the proposal should not stand.",
        "Knowing the role prevents scattered speeches and helps teams coordinate.",
        ["Government defines and builds the case.", "Opposition answers the case and creates clash.", "Later speeches extend, refute, and weigh."],
        {
          prompt: "Opposition hears a vague government case.",
          weakAnswer: "We have our own unrelated topic.",
          strongAnswer: "We challenge the definition because it is too broad, then argue the plan does not solve the stated problem.",
          whyItWorks: "The strong answer performs the opposition role by testing the case."
        },
        q("What is the government's first job?", ["Build a clear case", "Ignore definitions", "Only rebut", "Judge the round"], "Build a clear case", "Government starts the proposal.", "Government must define and defend the case.", "Role awareness"),
        [
          q("What is the opposition's job?", ["Test and answer the case", "Agree with everything", "Write the ballot", "Avoid clash"], "Test and answer the case", "Opposition creates pressure.", "Opposition should explain why the government case fails or is not best.", "Role awareness"),
          q("Why do roles matter?", ["They guide speech strategy", "They replace arguments", "They make evidence illegal", "They remove time limits"], "They guide speech strategy", "Roles tell each speaker what to do.", "Role awareness keeps the team coordinated.", "Role awareness"),
          q("Who usually introduces definitions?", ["Government", "Judge", "Audience", "Tab room"], "Government", "The case-setting side defines terms.", "Government should clarify the terms of its case.", "Definitions")
        ],
        [
          q("If you are opposition, what should you do with a weak definition?", ["Challenge how it shapes the debate", "Ignore it forever", "Accept every loophole", "Stop speaking"], "Challenge how it shapes the debate", "Definitions affect fairness and focus.", "Opposition can pressure definitions that make the debate unclear or unfair.", "Definitions")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Case Topic and Definitions",
    slug: "debate-case-topic-definitions",
    description: "Turn a resolution into a fair, debatable case.",
    category: "Parliamentary debate",
    order: 9,
    lesson: {
      title: "Set a fair case topic",
      slug: "debate-case-topic-definitions-lesson",
      summary: "Learn resolution, case topic, definitions, and contentions.",
      estimatedMinutes: 8,
      content: lesson(
        "Create a case topic with clear definitions and contentions.",
        "A resolution is the broad prompt. A case topic is the specific debate you create from it. Definitions explain key terms, and contentions are the main reasons the case should win.",
        "A fair case topic invites clash. If it is too vague, too narrow, or dependent on hidden knowledge, the round becomes less educational.",
        ["Start from the resolution.", "Choose a clear case topic.", "Define key terms fairly.", "Write distinct contentions."],
        {
          prompt: "Resolution: This House values education reform.",
          weakAnswer: "Education should be better.",
          strongAnswer: "Case topic: public high schools should require a financial literacy course. Definitions: require means graduation requirement. Contentions: student debt prevention and practical career readiness.",
          whyItWorks: "The strong answer turns a broad resolution into a specific, debatable case."
        },
        q("What is a case topic?", ["The specific issue debated from a resolution", "The speaker's name", "The judge report", "The timer"], "The specific issue debated from a resolution", "It narrows the broad prompt.", "A case topic is the actual issue the round will debate.", "Case topic"),
        [
          q("Why should definitions be clear?", ["To set fair boundaries", "To confuse opposition", "To avoid contentions", "To replace impacts"], "To set fair boundaries", "Definitions shape the debate.", "Clear definitions help both sides understand what is being debated.", "Definitions"),
          q("What is a contention?", ["A main reason for the case", "A random fact", "A speech order", "A side badge"], "A main reason for the case", "Contentions support the case.", "Contentions are the major arguments for the proposal.", "Contentions"),
          q("What makes a fair case topic?", ["It creates clear clash", "It hides the issue", "It depends on secret knowledge", "It has no definitions"], "It creates clear clash", "Fair topics can be debated by both sides.", "A fair case gives both sides a meaningful path to argue.", "Case topic")
        ],
        [
          q("A case topic is so narrow that opposition has no answer. What is the issue?", ["Unfair case design", "Strong signposting", "Good weighing", "A clear voter"], "Unfair case design", "A topic should invite clash.", "A case should be specific but still debatable.", "Case topic")
        ]
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Reading Scenarios",
    slug: "deca-reading-scenarios",
    description: "Quickly identify role, task, audience, and constraints in a DECA prompt.",
    category: "DECA roleplay",
    order: 1,
    lesson: {
      title: "Read a business scenario",
      slug: "deca-reading-scenarios-lesson",
      summary: "Find the job to be done before building your recommendation.",
      estimatedMinutes: 7,
      content: lesson(
        "Extract the role, problem, audience, and constraints from a scenario.",
        "Before solving, pause and mark four things: who you are, who you are speaking to, what problem matters most, and what limits your solution.",
        "DECA roleplays reward relevant solutions. If you miss the real scenario, even a polished presentation can score low.",
        ["Identify your role.", "Identify the decision-maker.", "Name the business problem.", "List constraints such as budget, time, staff, or brand."],
        {
          prompt: "You are a marketing assistant speaking to a store owner about low repeat visits.",
          weakAnswer: "I would make more ads.",
          strongAnswer: "My role is marketing assistant, the audience is the owner, the problem is low repeat visits, and the solution must improve loyalty without assuming a huge budget.",
          whyItWorks: "The strong answer reads the situation before solving it."
        },
        q("Which detail is the business problem?", ["Low repeat visits", "Marketing assistant", "Store owner", "The speech room"], "Low repeat visits", "The problem is what needs to improve.", "Low repeat visits is the challenge the recommendation must solve.", "Scenario reading"),
        [
          q("What should you identify first?", ["Role and audience", "Random slogan", "A price discount only", "Judge score"], "Role and audience", "Know who you are and who hears the answer.", "Role and audience shape tone and recommendation.", "Scenario reading"),
          q("Why list constraints?", ["To keep the solution realistic", "To avoid solving", "To make the answer longer", "To skip performance indicators"], "To keep the solution realistic", "Constraints test feasibility.", "Constraints help you recommend something the business can actually do.", "Feasibility"),
          q("Which is a constraint?", ["Limited staff", "The word roleplay", "A trophy", "A speaker rank"], "Limited staff", "Constraints limit implementation.", "Limited staff affects what solution is realistic.", "Scenario reading")
        ],
        [
          q("If the judge is a store owner, how should your tone sound?", ["Professional and practical", "Random and casual", "Medical", "Courtroom-like"], "Professional and practical", "Match the audience.", "A business owner expects concise, useful recommendations.", "Professional communication")
        ]
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Identifying the Problem",
    slug: "deca-identifying-problem",
    description: "Separate symptoms from the real business issue.",
    category: "DECA roleplay",
    order: 2,
    lesson: {
      title: "Find the root business problem",
      slug: "deca-identifying-problem-lesson",
      summary: "Choose a recommendation that solves the real issue.",
      estimatedMinutes: 7,
      content: lesson(
        "State the root problem before proposing a solution.",
        "A symptom is what you notice. The root problem is why it is happening. Strong DECA answers solve the root problem.",
        "Judges want business reasoning, not just activity. Identifying the real problem makes your solution more strategic.",
        ["Name the symptom.", "Ask what causes it.", "Choose the problem your solution can affect."],
        {
          prompt: "A cafe has many first-time customers but few return.",
          weakAnswer: "The problem is not enough customers.",
          strongAnswer: "The problem is weak customer retention, not awareness. The solution should focus on loyalty and post-visit engagement.",
          whyItWorks: "The strong answer separates awareness from retention."
        },
        q("A cafe has many first visits but few repeat visits. What is the root problem?", ["Customer retention", "No awareness", "Too many employees", "Medical accuracy"], "Customer retention", "Repeat visits are about coming back.", "The issue is retaining customers after the first visit.", "Problem identification"),
        [
          q("What is a symptom?", ["An observable sign of a deeper issue", "The final solution", "A judge question", "A performance score"], "An observable sign of a deeper issue", "Symptoms are clues.", "Symptoms help you infer the root problem.", "Problem identification"),
          q("Why state the problem first?", ["It makes the solution relevant", "It replaces the solution", "It hides constraints", "It lowers confidence"], "It makes the solution relevant", "Problem before solution.", "A clear problem frames the recommendation.", "Problem identification"),
          q("Which solution fits retention?", ["Loyalty program", "Random billboard only", "Ignore customers", "Cut all products"], "Loyalty program", "Retention means repeat behavior.", "A loyalty program directly targets repeat visits.", "Choosing response")
        ],
        [
          q("If sales are down because checkout is slow, what should you target?", ["Operations speed", "Only brand awareness", "Medical terms", "Definitions"], "Operations speed", "Find the cause.", "Slow checkout points to operations, not only promotion.", "Problem identification")
        ]
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Professional Communication",
    slug: "deca-professional-communication",
    description: "Present recommendations with executive clarity and confidence.",
    category: "DECA roleplay",
    order: 3,
    lesson: {
      title: "Sound like a business advisor",
      slug: "deca-professional-communication-lesson",
      summary: "Use concise structure, business vocabulary, and a confident close.",
      estimatedMinutes: 6,
      content: lesson(
        "Communicate with a clear opening, numbered points, and professional tone.",
        "Professional communication is not fancy language. It means the judge can trust you because your answer is clear, calm, and business-focused.",
        "DECA judges often score delivery and organization alongside the business idea.",
        ["Open with the problem and goal.", "Give two or three numbered recommendations.", "Close with the expected result and how to measure it."],
        {
          prompt: "Recommend a promotion plan.",
          weakAnswer: "I would do social media and stuff.",
          strongAnswer: "I recommend a two-part promotion plan: first, targeted short-form videos for local students; second, a referral offer measured by new customer sign-ups.",
          whyItWorks: "The strong answer is organized, specific, and measurable."
        },
        q("Which opening sounds most professional?", ["I have a two-part plan to improve repeat visits.", "This is easy.", "I guess maybe ads.", "Whatever works."], "I have a two-part plan to improve repeat visits.", "Professional means clear and credible.", "This opening frames the goal and structure.", "Professional communication"),
        [
          q("How many recommendation points are usually manageable?", ["Two or three", "Ten", "None", "Every idea possible"], "Two or three", "Clear beats crowded.", "Two or three points allow enough depth without overload.", "Organization"),
          q("What should the close include?", ["Expected result and measurement", "A new unrelated idea", "An apology only", "No conclusion"], "Expected result and measurement", "Business judges like outcomes.", "A measurable close shows business reasoning.", "Professional communication"),
          q("Which phrase is strongest?", ["Measured by referral sign-ups", "It will be good", "People like things", "Trust me"], "Measured by referral sign-ups", "Look for measurable business language.", "This phrase gives the judge a concrete metric.", "Evidence-based reasoning")
        ],
        [
          q("What does executive clarity mean?", ["Clear, organized, decision-ready communication", "Longer words only", "Speaking fast", "No structure"], "Clear, organized, decision-ready communication", "Think useful to a decision-maker.", "Executive clarity helps the judge understand and trust the recommendation.", "Professional communication")
        ]
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology Basics",
    slug: "hosa-medical-terminology-basics",
    description: "Break clinical words into roots, prefixes, and suffixes.",
    category: "Health science",
    order: 1,
    lesson: {
      title: "Decode medical terms",
      slug: "hosa-medical-terminology-basics-lesson",
      summary: "Use word parts to understand unfamiliar health terms.",
      estimatedMinutes: 7,
      content: lesson(
        "Break medical terms into word parts and explain them accurately.",
        "Many medical terms are built from prefixes, roots, and suffixes. If you can identify parts, you can understand unfamiliar terms more safely.",
        "HOSA events reward accurate health science language. Terminology also helps you communicate clearly with patients and judges.",
        ["Find the prefix.", "Find the root.", "Find the suffix.", "Put the meaning together and check context."],
        {
          prompt: "Tachycardia",
          weakAnswer: "A heart problem.",
          strongAnswer: "Tachy means fast and cardia relates to the heart, so tachycardia means a fast heart rate.",
          whyItWorks: "The strong answer uses word parts and avoids vague guessing."
        },
        q("In tachycardia, what does tachy mean?", ["Fast", "Slow", "Lung", "Skin"], "Fast", "Think of tachometer: speed.", "Tachy means fast.", "Medical terminology"),
        [
          q("What does cardi relate to?", ["Heart", "Liver", "Bone", "Skin"], "Heart", "Cardiology studies the heart.", "Cardi/cardio refers to the heart.", "Medical terminology"),
          q("Why use word parts?", ["To infer meaning safely", "To diagnose without context", "To avoid communication", "To skip definitions"], "To infer meaning safely", "Word parts are clues, not the whole clinical picture.", "Word parts help decode terms while still respecting context.", "Medical terminology"),
          q("Which is most precise?", ["Tachycardia means fast heart rate", "Tachycardia is bad stuff", "Tachycardia is always fatal", "Tachycardia means slow breathing"], "Tachycardia means fast heart rate", "Avoid exaggeration.", "This answer is accurate and appropriately limited.", "Medical accuracy")
        ],
        [
          q("What does hypo usually mean?", ["Low or under", "High", "Heart", "Bone"], "Low or under", "Hypo means below.", "Hypo often means low, under, or deficient.", "Medical terminology")
        ]
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Patient Communication",
    slug: "hosa-patient-communication",
    description: "Explain health information clearly, respectfully, and safely.",
    category: "Health communication",
    order: 2,
    lesson: {
      title: "Communicate with patients clearly",
      slug: "hosa-patient-communication-lesson",
      summary: "Use empathy, plain language, and confirmation checks.",
      estimatedMinutes: 7,
      content: lesson(
        "Explain health information in plain language and confirm understanding.",
        "Patient communication combines accuracy and empathy. A strong response avoids jargon, listens to concerns, and checks understanding.",
        "In healthcare, communication affects safety. Patients need to understand next steps, risks, and when to ask for help.",
        ["Acknowledge the concern.", "Explain in plain language.", "Give the next step.", "Ask a teach-back question."],
        {
          prompt: "A patient is nervous about a blood pressure reading.",
          weakAnswer: "Your systolic is elevated; just calm down.",
          strongAnswer: "I understand this number can feel stressful. Blood pressure can change for many reasons, so we will recheck it and share it with the provider. Can you tell me what step we are taking next?",
          whyItWorks: "The strong answer is empathetic, clear, and checks understanding."
        },
        q("Which response best uses plain language?", ["We will recheck your blood pressure and talk with the provider.", "Your systolic parameter requires clinical correlation.", "Do not worry about it.", "This is definitely a diagnosis."], "We will recheck your blood pressure and talk with the provider.", "Plain language is accurate and understandable.", "This response avoids jargon and gives a safe next step.", "Patient communication"),
        [
          q("What is teach-back?", ["Asking the patient to explain the next step in their own words", "Repeating jargon faster", "Ignoring questions", "Giving a diagnosis"], "Asking the patient to explain the next step in their own words", "It checks understanding.", "Teach-back helps confirm the patient understands.", "Patient communication"),
          q("Which tone is best?", ["Calm and respectful", "Dismissive", "Sarcastic", "Rushed"], "Calm and respectful", "Healthcare communication needs trust.", "A calm tone supports professionalism and patient safety.", "Professionalism"),
          q("Why avoid jargon?", ["Patients may not understand it", "It is always illegal", "It makes answers shorter", "It replaces accuracy"], "Patients may not understand it", "Communication is about understanding.", "Plain language improves comprehension without sacrificing accuracy.", "Patient communication")
        ],
        [
          q("A patient says they are confused. What should you do?", ["Pause and explain again in simpler language", "Move on immediately", "Use more abbreviations", "Ignore the concern"], "Pause and explain again in simpler language", "Respond to the concern.", "Clear communication includes adapting when the patient is confused.", "Patient communication")
        ]
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Healthcare Ethics",
    slug: "hosa-healthcare-ethics",
    description: "Make responsible choices using safety, privacy, and respect.",
    category: "Health communication",
    order: 3,
    lesson: {
      title: "Reason through healthcare ethics",
      slug: "hosa-healthcare-ethics-lesson",
      summary: "Use privacy, consent, safety, and fairness to evaluate scenarios.",
      estimatedMinutes: 7,
      content: lesson(
        "Use ethical principles to choose a safe and respectful response.",
        "Healthcare ethics often involves balancing values like privacy, patient choice, safety, and professional responsibility.",
        "HOSA scenarios may test what you do when the easy answer is not the most responsible answer.",
        ["Identify the people affected.", "Name the ethical issue.", "Choose the safest professional action.", "Explain why it respects the patient."],
        {
          prompt: "A friend asks about a patient's condition.",
          weakAnswer: "Tell them if they promise not to share.",
          strongAnswer: "I cannot share private patient information. I would direct them to the proper contact process and protect confidentiality.",
          whyItWorks: "The strong answer protects privacy and gives a professional next step."
        },
        q("Which principle is involved when protecting patient information?", ["Privacy", "Marketing", "Weighing", "Pricing"], "Privacy", "Think about information access.", "Patient information should be protected unless sharing is authorized.", "Healthcare ethics"),
        [
          q("What should you do with private patient information?", ["Share only through appropriate authorized channels", "Tell friends", "Post it", "Guess publicly"], "Share only through appropriate authorized channels", "Privacy rules matter.", "Professional ethics requires protecting patient information.", "Healthcare ethics"),
          q("Which is an ethical response?", ["Respect patient dignity", "Ignore consent", "Embarrass the patient", "Skip safety"], "Respect patient dignity", "Ethics centers people.", "Respecting dignity supports professional care.", "Professionalism"),
          q("Why explain your ethical choice?", ["To show reasoning and professionalism", "To make it longer only", "To avoid action", "To confuse the judge"], "To show reasoning and professionalism", "Judges need to see your decision process.", "Explaining the principle makes the answer stronger.", "Evidence-based reasoning")
        ],
        [
          q("A scenario involves risk of harm. What principle becomes urgent?", ["Safety", "Advertising", "Speaker rank", "Budget"], "Safety", "Health scenarios prioritize harm reduction.", "Safety is central when someone could be harmed.", "Healthcare ethics")
        ]
      )
    }
  },
  {
    organization: "PUBLIC_SPEAKING",
    track: "PUBLIC_SPEAKING",
    name: "Presentation Structure",
    slug: "public-speaking-presentation-structure",
    description: "Organize speeches with a clear opening, body, and close.",
    category: "Public speaking",
    order: 1,
    lesson: {
      title: "Structure a clear speech",
      slug: "public-speaking-presentation-structure-lesson",
      summary: "Build a speech listeners can follow from start to finish.",
      estimatedMinutes: 6,
      content: lesson(
        "Use a simple structure: hook, thesis, main points, and close.",
        "Strong speeches feel easy to follow because each part has a job. The opening earns attention, the thesis states the message, the body proves it, and the close makes it memorable.",
        "Structure lowers anxiety and helps audiences remember your message.",
        ["Start with a hook.", "State the thesis.", "Organize two or three main points.", "Close by returning to the main message."],
        {
          prompt: "Speech about why students should learn public speaking.",
          weakAnswer: "Public speaking is good and helps people.",
          strongAnswer: "Have you ever had a great idea but felt too nervous to say it? Public speaking helps students turn ideas into action. I will show how it builds confidence, clarity, and leadership.",
          whyItWorks: "The strong answer has a hook, thesis, and preview."
        },
        q("What does a thesis do?", ["States the main message", "Ends the timer", "Adds a random example", "Replaces the body"], "States the main message", "The thesis tells the audience what the speech argues.", "A thesis gives the speech direction.", "Presentation structure"),
        [
          q("What belongs in the opening?", ["Hook and thesis", "Only citations", "No topic", "A hidden conclusion"], "Hook and thesis", "Openings orient listeners.", "The opening should earn attention and state the message.", "Presentation structure"),
          q("Why use two or three main points?", ["They are easier to remember", "They make the speech endless", "They avoid structure", "They replace delivery"], "They are easier to remember", "Audiences remember organized chunks.", "A small number of main points improves clarity.", "Organization"),
          q("What should a close do?", ["Return to the main message", "Introduce five new topics", "Apologize for speaking", "Skip the thesis"], "Return to the main message", "The close should land the speech.", "A strong close reinforces the central idea.", "Presentation structure")
        ],
        [
          q("If an audience cannot tell your main point, what is likely missing?", ["Clear thesis", "More volume only", "A random joke", "A longer timer"], "Clear thesis", "The thesis is the main message.", "A clear thesis helps the audience understand the speech's purpose.", "Presentation structure")
        ]
      )
    }
  },
  {
    organization: "PUBLIC_SPEAKING",
    track: "PUBLIC_SPEAKING",
    name: "Evidence-Based Reasoning",
    slug: "public-speaking-evidence-reasoning",
    description: "Support claims with examples, reasoning, and responsible evidence.",
    category: "Public speaking",
    order: 2,
    lesson: {
      title: "Support your message with evidence",
      slug: "public-speaking-evidence-reasoning-lesson",
      summary: "Make speeches more credible with support and explanation.",
      estimatedMinutes: 7,
      content: lesson(
        "Use evidence and reasoning to support a public speaking claim.",
        "Evidence can be an example, data point, expert idea, or personal story. Reasoning explains how the evidence proves the claim.",
        "Audiences are more likely to trust a message when they can see why it is true.",
        ["State the claim.", "Give specific support.", "Explain the connection.", "Tie it back to the audience."],
        {
          prompt: "Claim: practice improves confidence.",
          weakAnswer: "Practice is obviously helpful.",
          strongAnswer: "Practice improves confidence because repeated rehearsal makes the speech feel familiar. For example, a student who practices the opening five times is less likely to freeze when starting.",
          whyItWorks: "The strong answer gives reasoning and a concrete example."
        },
        q("What does reasoning do?", ["Explains how evidence proves the claim", "Starts the timer", "Removes examples", "Changes the topic"], "Explains how evidence proves the claim", "Reasoning is the bridge.", "Reasoning connects support to the claim.", "Evidence-based reasoning"),
        [
          q("Which is evidence?", ["A specific example", "A vague feeling only", "No support", "A transition word"], "A specific example", "Evidence supports a claim.", "Examples can function as evidence when they prove a point.", "Evidence"),
          q("Why explain evidence?", ["So the audience understands its meaning", "To make it confusing", "To avoid claims", "To skip the conclusion"], "So the audience understands its meaning", "Do not make listeners infer everything.", "Explanation turns evidence into persuasion.", "Evidence-based reasoning"),
          q("Which is strongest?", ["Practice helps because familiarity reduces fear at the start.", "Practice good.", "I like practice.", "No one needs examples."], "Practice helps because familiarity reduces fear at the start.", "Look for claim plus why.", "This answer gives a reason that supports the claim.", "Evidence-based reasoning")
        ],
        [
          q("A story supports your point only if you also do what?", ["Explain the connection", "Hide the claim", "Skip the audience", "Use no structure"], "Explain the connection", "Evidence needs interpretation.", "The speaker must show how the story proves the message.", "Evidence-based reasoning")
        ]
      )
    }
  }
];

export function getLearningSkillByLessonSlug(slug: string) {
  return LEARNING_SKILL_CATALOG.find((skill) => skill.lesson.slug === slug || skill.slug === slug);
}
