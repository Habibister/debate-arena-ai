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
        "Clash happens when two arguments meet. Instead of repeating your case, explain why your answer beats the other side's claim.",
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
          q("What is the first step in clash?", ["Name the opposing claim", "Start a new contention", "Ignore the flow", "Ask for prep time"], "Name the opposing claim", "You cannot answer what you have not identified.", "Naming the claim helps both you and the judge see the point of disagreement.", "Clash"),
          q("Which is weakest?", ["They say cost, we answer with existing time.", "They say safety, we answer with training.", "Our first contention is still true.", "They say delay, we answer with phase-in."], "Our first contention is still true.", "Repeating your case is not direct clash.", "This does not answer a specific opposing argument.", "Clash"),
          q("Why is clash important?", ["It resolves disagreement", "It hides weak evidence", "It makes speeches shorter only", "It avoids comparison"], "It resolves disagreement", "Debate needs direct comparison.", "Clash helps the judge decide between competing claims.", "Clash")
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
        "Weighing explains why one argument matters more than another. Common weighing tools are magnitude, probability, timeframe, and reversibility.",
        "Judges often believe both sides have some truth. Weighing tells them which truth should decide the round.",
        ["Identify both impacts.", "Pick a weighing lens.", "Explain why your impact wins under that lens."],
        {
          prompt: "Aff says preparedness; Neg says class time.",
          weakAnswer: "Preparedness is more important.",
          strongAnswer: "Preparedness outweighs class time on timeframe and reversibility. Lost class time is small and adjustable, but students using AI irresponsibly can create immediate academic and career consequences.",
          whyItWorks: "The strong answer names weighing lenses and compares both impacts."
        },
        q("Which phrase is weighing?", ["Our impact is bigger and happens sooner", "We have an impact", "They are wrong", "I have two points"], "Our impact is bigger and happens sooner", "Weighing compares importance.", "This phrase compares magnitude and timeframe.", "Weighing"),
        [
          q("Which is a weighing lens?", ["Magnitude", "Font size", "Ballot color", "Email address"], "Magnitude", "It asks how large the impact is.", "Magnitude is a standard way to compare impacts.", "Weighing"),
          q("What does probability compare?", ["How likely impacts are", "How loud speakers are", "How many cards exist", "How long the room is"], "How likely impacts are", "Probability is about chance.", "Probability tells the judge which impact is more likely to happen.", "Weighing"),
          q("Why weigh arguments?", ["To help the judge decide between impacts", "To avoid rebuttal", "To skip definitions", "To make speeches confusing"], "To help the judge decide between impacts", "Think about decision-making.", "Weighing turns competing impacts into a clear decision.", "Weighing")
        ],
        [
          q("If your impact happens sooner, which lens are you using?", ["Timeframe", "Magnitude", "Vocabulary", "Definition"], "Timeframe", "Sooner means when.", "Timeframe compares when impacts happen.", "Weighing")
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
