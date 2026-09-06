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
  // --- OPTIONAL structured teaching, mirroring `ConceptEducationLessonContent` ---------------------
  // These exist so the AUTHORING surface can express what the concept renderer can now show. Without
  // them the capacity would be unreachable: every catalog entry is built by `lesson()` below, so a
  // field the helper cannot produce is a field no lesson can ever carry, however willing the type.
  //
  // Declaring them changes NO runtime object. `lesson()` spreads them only when an author passes
  // them, and no entry passes any today, so every content object still has exactly its eight keys.
  // That is deliberate: `scripts/learning-content-integrity-smoke.ts` asserts the exact RUNTIME key
  // set and fails closed on an unclassified key. The first lesson that actually authors one of these
  // will trip that guard until a human classifies the field and regenerates the reviewed baseline —
  // which is the guard working, not an obstacle to route around.
  teachingSections?: { heading: string; body: string }[];
  additionalExamples?: { setup: string; weak?: string; strong: string; explanation: string }[];
  revisionLadder?: { attempt: string; diagnosis: string; revision: string }[];
  misconception?: { wrongModel: string; whyItFails: string; betterModel: string };
  commonMistakes?: { mistake: string; whyItFails: string; fix: string }[];
  languageFrames?: { purpose: string; starters: string[] }[];
  scaffoldedTry?: { prompt: string; frame: string; slots: string[]; opponentClaim?: string; motion?: string };
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
  masteryCheck: LearningQuestion[],
  /**
   * Optional structured teaching. Spread only when supplied, so an entry that passes nothing produces
   * the exact eight-key object it produced before this parameter existed — byte-identical content, and
   * the runtime-key guard in `scripts/learning-content-integrity-smoke.ts` stays green on today's
   * catalog for that reason rather than by exemption.
   */
  teaching?: Pick<LearningLessonContent,
    "teachingSections" | "additionalExamples" | "revisionLadder" | "misconception" | "commonMistakes"
    | "languageFrames" | "scaffoldedTry">
): LearningLessonContent {
  return {
    objective,
    explanation,
    whyMatters,
    steps,
    workedExample,
    guidedQuestion,
    practiceQuestions,
    masteryCheck,
    ...(teaching ?? {})
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
      summary: "What a round is trying to accomplish, how the arguments in it change, and what to pay attention to while it happens.",
      estimatedMinutes: 9,
      content: lesson(
        "Understand what a debate round is trying to accomplish, what changes as it unfolds, and what to pay attention to while it happens.",
        "A debate round is a structured disagreement: two sides take turns giving reasons for different positions on a motion, the statement the round is about, and a judge decides which side argued more persuasively. The sides have different names in different formats, such as Pro and Con or Government and Opposition, but there are always two, and the judge decides on what was said in the round, not on their own view of the topic. So your job is not just to speak. It is to help the judge see what your side claims, why it is true, why the other side's answers do not defeat it, and what is still standing at the end.\n\nAn argument is a claim backed by a reason and a why-it-matters; the Claim, Warrant, Impact lesson teaches how to build one. Early speaking in a round is mostly constructive, introducing and building your side's case. Later speaking is mostly responsive, answering what has already been argued and comparing what remains. Formats differ in speech names, order and timing, but these jobs stay the same, and so does the idea underneath them: a round is a small set of arguments that change as it goes on, and the judge decides on what they have become.",
        "Beginners without this map list facts, repeat themselves, or treat each speech as a fresh start. Once you know the judge is deciding between reasons that were introduced, answered and defended in front of them, every sentence you say gets a purpose, and every sentence the other side says becomes something to notice rather than something to wait out.",
        [
          "Know your side's position and its two or three strongest reasons, so you know what is worth protecting when the round gets busy.",
          "While the other side speaks, listen for their claim and the reason under it, and note which of your arguments they answered and which they left alone.",
          "Keep a short record of every argument, yours and theirs, with two notes beside each: answered or not, and what state it is in now.",
          "As the round narrows, know which of your arguments are still standing, and make sure the judge knows too."
        ],
        {
          prompt: "Motion: the school canteen should stop selling sugary drinks. Read two versions of the same short exchange. In both, Side A opens with two arguments. Watch what happens to each argument as the exchange goes on.",
          weakAnswer: "Side A: Sugary drinks cause energy crashes, so students concentrate worse after lunch. Also, the canteen would not lose money, because sales would shift to water and juice. Side B: Students should be trusted to choose what they drink. Also, the canteen menu has not been changed in ten years. Side A: And sugary drinks are bad for teeth.",
          strongAnswer: "Side A: Sugary drinks cause energy crashes, so students concentrate worse after lunch. Also, the canteen would not lose money, because sales would shift to water and juice. Side B: On concentration: students who want a sugary drink will bring one from home, so a canteen ban changes where they buy it, not what they drink. Side A: On that: the canteen is where most students buy drinks at school, because a lunchbox is packed once in the morning and the canteen is open all day. Nothing was said about the money, so that argument stands as we made it.",
          whyItWorks: "Follow each argument, not each speech. In the weak version nobody answers anything: every argument is left where it was introduced, so the judge holds five points with no response and no reason to prefer one side's over the other's. In the strong version the concentration argument is introduced, answered, then defended, so at the end it is still unresolved and the judge knows exactly what the two sides disagree about. The money argument got no response, and Side A says so: Side A has not won it by Side B's silence, but Side B has given the judge less reason to reject it. Two questions about each argument, asked whenever a speech ends, are the whole map: was it answered, and what state is it in now?"
        },
        q(
          "A judge is about to decide a round. What are they choosing between?",
          [
            "Which side spoke with more confidence and fewer pauses",
            "Which side introduced the larger number of reasons overall",
            "Which side's reasons survived the other side's answers better",
            "Which side the judge personally agrees with on the motion"
          ],
          "Which side's reasons survived the other side's answers better",
          "Think about what the judge is allowed to decide on.",
          "The judge decides on what was said in the round, not on delivery or on their own opinion, and not by counting: a side can introduce more reasons and still lose if those reasons were answered while the other side's went unanswered. What is compared at the end is what each side's arguments have become after being answered, defended, or left alone.",
          "Orientation"
        ),
        [
          q(
            "Late in a round, Side A has made three arguments. Side B answered two of them and never mentioned the third. What should Side A do with its next speech?",
            [
              "Answer only what Side B said last and leave the earlier arguments, since each speech is judged alone",
              "Defend the two that were answered and note that the third was not, so all three stay live",
              "Repeat all three in the same words and add a source to each, so the judge remembers them",
              "Concede the two that were answered and spend the speech on the third, since it is unanswered"
            ],
            "Defend the two that were answered and note that the third was not, so all three stay live",
            "Ask what state each of the three arguments is in now.",
            "Two arguments have been answered, so the judge now needs Side A's reply to those answers, or they stay where Side B's answers put them. The third was left alone, so it stands as made, and pointing that out costs one sentence. Answering only the last speech treats the round as if it reset, and leaves the two answered arguments where Side B put them; repeating all three with a source attached still does not engage the answers; and conceding the two that were answered gives up the arguments that are actually in dispute to protect one nobody attacked.",
            "Orientation"
          )
        ],
        [
          q(
            "Side A says: 'Homework should be limited because students need sleep.' Side B answers: 'Students lose sleep to phones, not homework.' What does the judge most need from Side A next?",
            [
              "A new reason to limit homework that has nothing to do with sleep",
              "An agreement that phones matter, then a move to the next argument",
              "The same point about students needing sleep, repeated more firmly",
              "A reason homework still costs sleep, even if phones do as well"
            ],
            "A reason homework still costs sleep, even if phones do as well",
            "Which part of Side A's argument did Side B actually contest?",
            "Side B did not deny that students need sleep; they denied that homework is what costs it. That is the part now in dispute, so the judge needs Side A to engage it. Switching to a new reason abandons the contested one, agreeing and moving on concedes it, and repeating the sleep point more firmly restates the part nobody disputed.",
            "Orientation"
          )
        ],
        {
          teachingSections: [
            {
              heading: "A round is a set of arguments that change",
              body: "Picture the round from the judge's chair. What the judge is holding is not a list of speeches; it is a handful of arguments, and each one has a history. It was introduced. Then the other side answered it or left it alone. Then, if it was answered, its maker defended it or moved on. Every speech is doing one of those things to one of those arguments, and the judge is tracking the results.\n\nSo for every argument there are two separate questions, worth keeping separate. Was it answered: yes or no. And what state is it in now. An argument that was answered can still be very much alive, because the answer was weak or the defence held, so the issue is still unresolved between the two sides; it can be weakened, because it was answered and never defended; or it can sit exactly where it was introduced because it got no response at all.\n\nThat last case matters more than beginners expect. If the other side never addresses an argument, they have not beaten it, and they have given the judge less reason to reject it. It is still there at the end, in the shape its maker gave it. That is why the arguments you did not answer can decide a round you thought you were winning."
            },
            {
              heading: "What to listen for, and what to keep",
              body: "The hardest beginner habit is listening while the other side speaks instead of rehearsing what to say next. Two things are worth catching in every opposing speech. First, for each argument they make, the claim and the reason under it: not just that they are against your position, but why. The reason is the part you will need later, and the part beginners forget. Second, for each argument you made, whether they answered it or skipped it.\n\nYou cannot know that without keeping score, and keeping score means a written record, however rough: one line per argument, theirs and yours, with a note beside each saying answered or not, and how it stands. A record is not a transcript. You will not remember everything, and you are not supposed to. Hold the main claims and their current state, and let the details go."
            },
            {
              heading: "The round narrows, and the judge decides on what remains",
              body: "In the later speeches of a round, whatever the format calls them, the work shifts. Most of the arguments are already on the table and have been answered at least once, and the speeches are increasingly about which of them survive and which of the survivors should decide the result. That is the narrowing: the round shrinks from everything anyone said to the few disagreements still standing at the end.\n\nThe judge decides on that remainder: not which side had more to say, not which side sounded more certain, not what they themselves believe about the motion, but which of the surviving arguments should decide this round. Saying which disagreement matters most, and why, is a skill with its own lesson later. What you need now is to know the round is heading there, so that you protect the arguments that will still be standing when it arrives."
            }
          ],
          misconception: {
            wrongModel: "The round starts over every time a new speaker stands up, so each speech is judged on its own.",
            whyItFails: "Nothing resets. Every speech acts on the arguments already in the round, answering them, defending them, or leaving them alone, and the judge carries the results forward. A speech that ignores what came before has not started fresh; it has left every earlier argument exactly where the other side put it.",
            betterModel: "Think of the round as a small set of arguments changing state. Each speech should be able to say what it is doing to each argument it touches, and each speech you listen to should be scored the same way."
          },
          commonMistakes: [
            {
              mistake: "Trying to respond to every sentence the other side said.",
              whyItFails: "Arguments, not sentences, are the unit of a round. The judge is tracking two or three arguments per speech, not every remark, and a reply aimed at everything lands on none of them.",
              fix: "Listen for the two or three arguments inside their speech; those are what the judge is tracking, and what you are tracking too."
            },
            {
              mistake: "Thinking only about your own arguments while the other side speaks.",
              whyItFails: "You stand up not knowing which of your points were answered, and spend your time defending what nobody attacked.",
              fix: "Score their speech as it happens: claim and reason for each of theirs, answered or skipped for each of yours."
            },
            {
              mistake: "Assuming an argument you made once stays as strong as when you made it.",
              whyItFails: "An argument that was answered and never defended has been left where the other side's answer put it, however good it sounded the first time.",
              fix: "After every opposing speech, check the state of each of your arguments and defend the ones that were answered."
            },
            {
              mistake: "Believing the judge votes for the side that sounded more confident, or for the side they agree with.",
              whyItFails: "The judge decides on what was said in the round: which reasons were given, answered, and still standing at the end. Confidence is not a reason, and the judge's own opinion is not in the round.",
              fix: "Put your effort into the arguments' history: introduce them, answer theirs, defend yours, say what remains."
            }
          ],
          scaffoldedTry: {
            prompt: "Motion: the school should replace exam week with project assessments. Side A: Projects show what a student understands better than a timed test does. Also, exam week costs two weeks of lessons that go to revision. Side B: On projects: they are done with help at home, so they show what the family knows, not what the student knows. Side A: On that: the projects would be completed in class time with the teacher present, so the home does not come into it. Now score the exchange. Name the argument that was answered, the issue that is still unresolved between the two sides, and the argument that received no response at all.",
            frame: "Answered: ___. Still unresolved: ___. No response: ___.",
            slots: ["answered", "still unresolved", "no response"]
          }
        }
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
        q("Claim: the new crosswalk made the street safer. Evidence: accidents fell in the month after it was installed. What is the biggest weakness?", ["Accident counts come from the council, which wanted the crosswalk built", "One month with no comparison cannot show the crosswalk caused the drop", "A month is too short for drivers to have got used to the new crossing", "The evidence covers this street but not the junctions on either side"], "One month with no comparison cannot show the crosswalk caused the drop", "Think about what else could explain one short window.", "A short window with no comparison leaves the drop open to chance and to season. The other three name real caveats — who counted, how new the crossing is, what it covers — but each would still leave a like-for-like comparison missing, which is what the causal claim actually needs.", "Evidence"),
        [
          q("Claim: the gym renovation improved student fitness. Evidence: a survey shows students like the new gym. What is the problem?", ["The survey ran after the work, so there is no before figure to compare", "Students who disliked the old gym would answer more warmly about any change", "The renovation may have improved fitness by less than the survey suggests", "The evidence measures enjoyment, not fitness, so it does not fit the claim"], "The evidence measures enjoyment, not fitness, so it does not fit the claim", "Compare what was measured with what is claimed.", "Credible evidence can still fail to support the specific claim. Liking the gym is real information about enjoyment, and no missing baseline, response bias or smaller effect size would turn it into information about fitness — the mismatch is what was measured, not how well.", "Evidence"),
          q("Neighbourhoods with more streetlights have less litter. A speaker concludes streetlights prevent litter. What should a careful debater say?", ["Overall upkeep could produce both the lights and the lower litter, so compare first", "The pattern holds across many neighbourhoods, so the conclusion is supported", "Litter counts move with the season, so the figures need a longer window", "Streetlights may cut litter only where there was already less of it"], "Overall upkeep could produce both the lights and the lower litter, so compare first", "Two things appearing together is not yet cause.", "The association is real evidence, but well-kept neighbourhoods may get both the lights and the lower litter. Breadth does not fix that — a pattern repeated across many places is still a pattern, not a cause — and neither does a longer window. Only a comparison that separates upkeep from lighting does.", "Evidence"),
          q("Two reports on a teen curfew disagree. One, from a group campaigning for curfews, highlights a single town that improved. The other, an independent review of many towns with its method disclosed, found mixed results. Which deserves more weight and why?", ["The independent review — a mixed finding is more honest than a report that reaches a clear one", "The campaign report — a documented town-level success is more concrete than an averaged review", "The independent review — many towns, and its method is open; the campaign report shows one case", "Neither on its own — the improved town may well be one of the towns the review already covers"], "The independent review — many towns, and its method is open; the campaign report shows one case", "Compare breadth, method and incentives — do not just pick a side.", "Disagreement is where evaluation starts. Breadth and a disclosed method warrant more confidence; an incentive to persuade plus a single selected case warrants caution. Note that naming the right report is not enough — preferring it because a mixed finding sounds more honest is picking by tone, not comparing on method, and the overlap point is a fair observation that still does not say which deserves more weight.", "Evidence")
        ],
        [
          q("Claim: a reading app doubled students' reading skill. Evidence: the app company surveyed volunteer users, who reported big improvement. What is the strongest evaluation?", ["A larger sample of the same volunteers would settle whether reading skill doubled", "Volunteers self-reporting to the seller cannot support a claim as strong as 'doubled'", "The claim would stand if an independent group ran the same survey of users", "Users reporting big improvement does support 'doubled' once enough of them agree"], "Volunteers self-reporting to the seller cannot support a claim as strong as 'doubled'", "Stack the problems: who gathered it, who answered, what was measured, what is claimed.", "Each issue alone calls for caution; together — seller incentive, volunteers, self-report, and a precise 'doubled' claim — the evidence cannot carry the conclusion. More of the same volunteers, or the same self-report run by someone else, leaves self-selection and self-report untouched; and no number of people reporting improvement measures how much. Naming that gap is exactly the skill.", "Evidence")
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
      estimatedMinutes: 11,
      content: lesson(
        "Tell the judge where each answer belongs before you give it, so every response lands on the argument it is meant to answer.",
        "Judges take notes in columns — a record usually called the flow, with each argument tracked down its own column as the round goes on. Signposting is anything you say that tells the judge where you are in that record rather than arguing a point. It uses three tools — a roadmap, argument labels, and transitions — and mixing them up is what usually goes wrong. Throughout, your CASE means the set of arguments your own side is running, and their case means theirs. A roadmap comes first and says how many answers are coming and in what order, so the judge knows how many places to look and in what sequence. The count is doing real work: a judge told to expect three answers who receives two can see that one is missing, where a judge told nothing has no way to notice the gap. Naming the arguments in order does the same job as stating a number, since a judge can count a list. A preview that gives neither a count nor any names is not a roadmap at all, because it leaves nothing to expect and nothing to check against. A preview that gives a count but no argument names is still a roadmap, only a weak one: the judge learns how many answers to expect but not which column each belongs in, so it warns of a gap without helping place anything. What is not a roadmap at all is a sentence that states your position or your conclusion, however confident it sounds, because it describes what you intend to prove rather than the shape of the speech. A roadmap is therefore a promise about the shape of the speech. If you end up taking the arguments in a different order, say so as you move — an unannounced reordering leaves the judge holding a plan that no longer matches the speech, which is worse than never having given one. An argument label names the specific thing you are about to answer — an area, an argument, or an inner claim — before you answer it. A transition marks a move so the judge closes one column and opens another. Moving from one of their arguments straight to another of their arguments needs no separate transition: the next argument label already does it. A separate transition earns its place on a LARGER move — leaving their arguments to return to your own case and rebuild it, or crossing from one major section of the speech to another — where the next label alone would not tell the judge that the kind of work you are doing has changed. Rebuilding means answering what they said against your own argument and putting it back in place. Label by ARGUMENT, not by speaker and not by position in their speech: \"on their cost argument\" points at one column, while \"on their second point\" or \"responding to their first speaker\" only points at one if the judge happens to have numbered things the same way you did — and judges often do not. Compare \"on their second point, the plan is cheaper than they claim\" with \"on their cost argument, the plan is cheaper than they claim\": the answer is identical, but only the second tells a judge who numbered their notes differently where to put it. The same problem shows up with labels that name a whole area when you mean one part of it, or name your own case when you are answering theirs. What a side says is stacked in levels. At the top is an AREA, a broad heading such as fairness or student wellbeing, often called a contention. Inside it sit the separate ARGUMENTS that support it, and inside each of those sit the INNER CLAIMS it rests on. No topic word owns a level: cost can be an area in one round, with several arguments underneath it, and a single argument in the next. The level comes from how the other side actually built their case, not from how big the word sounds — so read their structure before you label it. One rule covers all three: CHOOSE THE LABEL FOR WHERE THE RESPONSE IS AIMED, not for how far it might ultimately reach. Aim at an inner claim, name that claim; aim at an argument, name the argument; aim at the whole area, name the area. This holds even when knocking out a lower claim happens to undermine everything above it — the signpost says where you struck, not how much fell. Naming a level above the one you aimed at sends the judge to a heading you did not speak to. Naming a level below it files a bigger answer in a smaller place than it belongs, and the judge records you as having answered less than you did. So the narrowest label is not automatically the best one: precision that undershoots the response is its own mistake. Match the label to the scope of the response, upward or downward. Neither judgement asks you to work out what your answer brought down with it. A label can also be perfectly precise and still wrong: naming their staffing argument when your answer is about their funding argument is exact, and exactly misplaced. When several of their arguments are live at once, the failure to watch for is not skipping one but attaching an answer to the wrong one: a response filed against an argument it does not actually address leaves the argument it WAS meant for standing, and the argument it landed on looks answered when it is not. Two answers given back to back with only one label between them are the usual way this happens, so name the argument each time you move. Signposting is not analysis and does not substitute for it: a labelled answer with no reason behind it is still a bad answer, and the label does not make it true. What the label buys you is that a good answer gets recorded in the right place instead of being lost. When you have lost track mid-speech, the repair is to name where you are going next rather than to keep talking and hope the judge follows — \"I am going back to their evidence argument\" costs two seconds and rebuilds the structure.",
        "A judge who cannot place your answer may not credit it at all. This is not a judge being unfair; it is what happens when several arguments move at once and the notes have to keep up in real time. Two speakers can give word-for-word identical analysis and have it recorded differently: the one whose answers arrive labelled gets them written under the arguments they refute, and the one whose answers arrive unlabelled gets a block of text the judge has to sort out afterwards from memory. Structure is also what lets the other side answer you, which is part of a fair round — an answer nobody can locate is an answer nobody can respond to.",
        ["Give a roadmap that says how many answers are coming, what they are on, and in what order.", "Name the specific argument before you answer it, using words that identify it rather than its number or its speaker.", "Moving to another of their arguments needs no separate transition — the next label does it; add one only for a larger move, such as returning to your own case.", "If you lose the thread, say where you are going next instead of pressing on."],
        {
          prompt: "You have three answers to make: one on cost, one on the safety evidence, and one on the timeline. Here are two deliveries of exactly the same three answers.",
          weakAnswer: "The budget impact is small because the plan uses advisory time that is already scheduled. The study they cited surveyed one district in a single year, so it cannot support a general claim. The rollout is staged over three years, so schools are not absorbing all of it at once.",
          strongAnswer: "Three answers, on cost, on their safety evidence, and on the timeline. On cost: the budget impact is small because the plan uses advisory time that is already scheduled. On their safety evidence: the study they cited surveyed one district in a single year, so it cannot support a general claim. On the timeline: the rollout is staged over three years, so schools are not absorbing all of it at once.",
          whyItWorks: "Delete the roadmap and the three labels from the strong version and what is left is the weak version, word for word — the same three claims, the same three reasons behind them, the same quality of analysis. Nothing was added to the argument. What the labels change is where each answer gets written down: the judge hears \"on cost\" and moves to the cost column before the reason arrives. In the weak version the judge has to work out, after the fact, which of three unlabelled sentences belonged to which argument — and a sentence assigned to the wrong column is answering nothing. This is also why signposting cannot rescue a weak answer: it decides where the answer lands, not whether it was any good."
        },
        q(
          "You are about to answer the opponent's claim that the policy is too expensive. Which opening locates that answer for the judge?",
          ["On their cost argument", "They are wrong about this, and here is the reason why", "Moving on to my next point", "As I said in my first speech"],
          "On their cost argument",
          "A signpost names the argument the answer belongs to.",
          "Only this names the specific argument, so the judge knows which column to write in before the reason arrives. \"They are wrong\" says an answer is coming but not to what; \"moving on\" marks a transition without naming a destination; \"as I said\" points backwards at your own speech rather than at their argument.",
          "Signposting"
        ),
        [
          q("Which roadmap is most useful to a judge at the start of a speech?", ["I will be responding to most of what the other side said in their speech, roughly in order", "I have several points to make and I will get through as many as I can", "I have three answers: on cost, on the safety evidence, and on enforcement", "I am going to explain why our side is winning this debate overall"], "I have three answers: on cost, on the safety evidence, and on enforcement", "A roadmap tells the judge how many places to look, and which.", "This names the number and the destinations, so the judge can set up the columns before the content starts. The others announce that a speech is happening without telling the judge where anything will go.", "Speech organization"),
          q("The other side made an argument about teacher workload. Which label points at one identifiable argument?", ["On their workload argument", "On what their first speaker was saying earlier", "On their second point", "On the part of their case I disagree with most"], "On their workload argument", "A label has to identify the argument even if the judge numbered things differently than you did.", "Naming the subject identifies the column no matter how the judge ordered their notes. Numbers and speakers only work if the judge's notes happen to match yours, and \"the part I disagree with\" names nothing at all.", "Signposting"),
          q("Which of these is signposting rather than substantive analysis?", ["The study covered a single district, so it cannot support a national claim", "Their impact is unlikely because enforcement almost never happens", "Costs fall on the same families who already have the least", "Turning to their evidence argument"], "Turning to their evidence argument", "One of these tells the judge where to write; the rest tell the judge what to think.", "Signposting is locating, not arguing. The other three make claims with reasons attached — they are the analysis that a signpost points to. Confusing the two leads speakers to think a well-labelled speech is automatically a well-argued one.", "Signposting"),
          q("A speaker labels every answer clearly but gives no reasons for any of them. What has the signposting achieved?", ["The answers are now well warranted because they have been clearly organized", "The judge should credit the speech overall because it was so easy to follow", "The signposting substitutes for the missing reasoning in each of the answers", "The judge can locate each answer, but the answers are still unsupported"], "The judge can locate each answer, but the answers are still unsupported", "Ask what the label does and what it cannot do.", "A label decides where an answer is recorded, not whether it is any good. An unsupported answer filed in the right column is still unsupported. Signposting makes good analysis findable; it does not manufacture analysis.", "Signposting"),
          q("You are answering one specific sub-point inside a larger contention about school funding. Which signpost is at the right level?", ["On funding, which is the area their entire second contention was about", "On their funding claim that reserves are already committed", "On their case, taking their contentions in the order they presented them", "On everything they said about money in the second half of their speech"], "On their funding claim that reserves are already committed", "Match the label to the size of the thing you are actually answering.", "The answer addresses one claim inside a contention, so the label should name that claim. The others point at a whole area, at their case as a whole, or at a half of their speech — each leaves the judge to guess which part of it the response lands on.", "Speech organization"),
          q("Halfway through your speech you realise you have skipped an argument and the judge looks lost. What is the best repair?", ["Say you are going back to their evidence argument, then answer it", "Keep going and cover the skipped argument at the end without mentioning it", "Apologise for the confusion and restate your entire roadmap from the start", "Speak more slowly for the rest of the speech so the judge can keep up"], "Say you are going back to their evidence argument, then answer it", "Naming where you are going costs a few seconds and rebuilds the structure.", "A short, explicit relocation tells the judge which column to reopen. Covering it silently leaves the judge to work out where it went, restating the whole roadmap spends time you do not have, and speaking slowly does not tell anyone where the answer belongs.", "Signposting"),
          q("Two speakers give identical analysis on three arguments. Speaker A labels each answer before giving it; Speaker B gives all three unlabelled. What is the difference on the flow?", ["A's analysis is stronger, because labelling an answer adds to its reasoning", "There is no difference, because the judge hears exactly the same words either way", "A's answers land in the right columns; B's must be sorted out afterwards", "B's speech is better, because it spends all of its time on substance instead of labels"], "A's answers land in the right columns; B's must be sorted out afterwards", "The analysis is identical by construction — so the difference cannot be in the analysis.", "Because the content is the same in both, the only thing that changes is placement. A's answers arrive already located. B's arrive as a block the judge has to assign from memory after the fact, and an answer assigned to the wrong argument does not refute it. The words are the same, but the record is not.", "Signposting"),
          q("Which transition most clearly closes one argument and opens another?", ["That is my second answer, and there is more to say about all of this", "Also, another thing worth mentioning about this whole area is that", "That answers their cost argument; next, on their enforcement argument", "So as you can see, the other side is not winning any of these arguments"], "That answers their cost argument; next, on their enforcement argument", "A transition should end one column and name the next.", "This marks the previous argument as finished and names where the speech is going, so the judge closes one column and opens a specific other one. The others trail off, announce a vague continuation, or summarise without moving anywhere.", "Signposting")
        ],
        [
          q("The other side ran two separate arguments about cost: one that the programme is expensive to start, and one that it is expensive to maintain. You have an answer only to the second. Which signpost is accurate?", ["On their cost arguments", "On cost, which the other side raised more than once in their speech", "On the second cost point their speaker made after the first one", "On their argument that the programme is expensive to maintain"], "On their argument that the programme is expensive to maintain", "You are answering one of two arguments — the label should say which.", "Naming the maintenance claim tells the judge exactly which of the two columns the answer belongs in, and leaves visible that the start-up argument is unanswered. A plural label implies you answered both, a general \"on cost\" leaves the judge to guess, and ordering by their speech only works if the judge numbered it as you did.", "Signposting"),
          q("A judge says after the round that they could not tell which of your answers went with which argument, though they agreed with your reasoning. What most likely went wrong?", ["The reasoning was too complex for the judge to follow at speaking speed", "The judge was not paying close enough attention to the speech as it was delivered", "The answers were not labelled with the arguments they were responding to", "The speech contained too few arguments for the judge to keep track of"], "The answers were not labelled with the arguments they were responding to", "The judge accepted the reasoning — so the problem is not the reasoning.", "The judge understood the substance and still could not place it, which points at missing labels rather than weak analysis. That is the exact failure signposting prevents: good answers that never get recorded against the arguments they defeat.", "Signposting")
        ]
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Clash",
    slug: "debate-clash",
    description: "Find the real disagreement and state the question the round must resolve.",
    category: "Debate foundations",
    order: 3,
    lesson: {
      title: "Find the real clash",
      slug: "debate-clash-lesson",
      summary: "Find what the two sides actually disagree about, and state it so the judge can decide it.",
      estimatedMinutes: 12,
      content: lesson(
        "Identify the real disagreement between two sides, explain the competing positions fairly, and state the question the round must resolve.",
        "Two sides are not in clash just because they say different things. Clash is the point where competing arguments answer the same question in different ways, so that only one of them can be right about it. Most beginner rounds are full of arguments that sound opposed and never actually meet: one side says uniforms reduce the pressure to wear the right clothes, the other says uniforms are cheap, and both can be true at once.\n\nFinding clash means finding the question both sides are already answering, sometimes without noticing, and stating it in words that do not decide it in advance. Judges use the word more loosely than this, writing “not enough clash” on a ballot to mean the two teams never engaged each other at all. This lesson teaches the specific skill underneath that complaint, because you cannot engage a disagreement you have not found.\n\nIt is a different job from answering the other side, which is refutation, and from arguing which side's answer should count for more, which is weighing. Both are covered in their own lessons. Clash comes first: until you can say what the round is actually about, the judge cannot tell what you have won.",
        "Judges decide rounds by resolving disagreements, not by counting arguments. A speaker who names the disputed question tells the judge where to look, connects the arguments that belong together, and stops both sides talking past each other for a whole speech. It is the move behind every rebuttal or summary that begins “this round comes down to”. Without it, even a strong speech is a list.",
        [
          "Say what Side A is trying to prove, in one sentence they would accept.",
          "Say what Side B is trying to prove, in one sentence they would accept.",
          "Ask whether both sentences can be true at the same time. If they can, the two sides are not in direct clash yet.",
          "Find the underlying question that would make one side's point matter against the other. If there is none, say so: those two arguments are independent, and comparing them is a different, later job.",
          "State that question neutrally, so that either side could still win it."
        ],
        {
          prompt: "Motion: this city should make its buses free to ride. Side A argues that free buses will cut car traffic, because people who currently drive short trips across town will switch to the bus once it costs nothing. Side B makes two arguments: first, that free buses will cost the city about eleven million a year in lost fares; second, that the extra journeys will come from people who already ride taking more trips, not from drivers giving up their cars. You are asked to identify the clash.",
          weakAnswer: "The clash in this round is traffic against cost. Side A says free buses reduce traffic, and Side B says they cost eleven million, so the judge has to decide between less traffic and the money.",
          strongAnswer: "Side A's traffic claim needs the new riders to be former drivers. Side B's second argument says the new riders will be today's passengers riding more often. Those two cannot both be right, and both conclusions turn on the same question: who the extra riders are. The clash is whether free fares actually move people out of cars, or mostly add trips for the people already on the bus. The eleven-million cost sits outside that clash: it can be true whichever way the question goes.",
          whyItWorks: "The weak version pairs two relevant arguments that can both be true at once, so choosing between them settles no disagreement. The repaired version looks through Side B's arguments for the one that actually meets Side A, finds the proposition both are taking a position on, states it as a question neither side has won yet, and says plainly which argument stays outside the clash."
        },
        q(
          "Motion: this school should start the day an hour later. Side A argues that students would arrive more rested. Which of Side B's replies is actually in clash with that?",
          [
            "Better-rested students would still be sitting the same exams under the same timetable pressure.",
            "After-school sports would finish in the dark for most of the winter term.",
            "Students would push their bedtime back an hour and gain no extra sleep.",
            "Teachers would lose the planning hour they currently use before the first lesson."
          ],
          "Students would push their bedtime back an hour and gain no extra sleep.",
          "Ask whether Side A's statement and the reply can both be true at the same time.",
          "Only one reply takes the opposite position on the thing Side A's argument depends on: that a later bell actually buys students more sleep. Each of the other replies can be true at the same time as Side A's statement — students can be better rested and still face the same exams, and the sports and staffing costs do not touch how rested anyone is — so choosing between them resolves nothing about it. Note that the first reply talks about rest as well: sharing a subject with the claim is not the same as contesting it.",
          "Clash"
        ),
        [
          q(
            "Side A says a ban on phones during the school day reduces distraction in class. Side B says students will hide their phones and be distracted by that instead. Which question states their clash neutrally?",
            [
              "Would a ban cut distraction, or would students just find a worse way to lose focus?",
              "Would a ban reduce distraction overall, or only change what students are distracted by?",
              "Is banning phones during the school day the right policy for this school?",
              "How much less distracted will students be once their phones are banned?"
            ],
            "Would a ban reduce distraction overall, or only change what students are distracted by?",
            "A clash question is one that either side could still win.",
            "Two of the questions decide the answer before the debate starts. One asks whether students would find a worse way to lose focus, which is stronger than anything Side B said — Side B claimed the distraction moves, not that it grows — so it hands Side B a verdict they did not argue for. One presumes the ban reduces distraction at all, which is Side A's conclusion. One is the motion in different clothes, which every argument in the round fits under. Only the remaining question names the thing the two sides take opposite positions on and leaves it open — note that it and the loaded first option have the same shape, so the shape is not what makes it neutral.",
            "Clash"
          )
        ],
        [
          q(
            "Motion: the council should close the high street to cars on Saturdays. Side A argues that shops will gain customers, because people browse when they can walk without traffic. Side B argues that shops will lose customers, because the people who spend the most drive in from outside town and park behind the shops. Which question do both of these arguments turn on?",
            [
              "Should the high street be closed to cars on Saturdays, or left open?",
              "Why would these shops lose the customers who drive in from outside town?",
              "Would the high street be quieter on a Saturday morning once it is closed?",
              "Do the shoppers these shops rely on arrive on foot or by car?"
            ],
            "Do the shoppers these shops rely on arrive on foot or by car?",
            "Ask what each argument needs to be true in order to reach its conclusion.",
            "Side A's gain needs the shops' best customers to be people on foot; Side B's loss needs them to be people who drive. One option is the motion, which every argument in the round fits under. One asks why the shops would lose those customers, which assumes Side B's conclusion before it is argued. One is a real question, but both sides would answer it the same way — yes, it would be quieter — and neither conclusion changes with the answer, so settling it settles nothing. Only the remaining question is the one both arguments stand or fall on.",
            "Clash"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Different is not the same as opposed",
              body: "Put two arguments from opposite sides next to each other and they will usually sound like a disagreement, because they were written by people who want different outcomes. Sounding opposed is not the test. The test is whether the two arguments can both be true at the same time.\n\nSide A says school uniforms reduce the pressure to wear the right clothes. Side B says uniforms are expensive for large families. Both of those can be completely true on the same morning in the same school, and a judge who believed every word of both would still not know who had won the disagreement, because there is no disagreement there: neither statement touches the other. Now change Side B to: uniforms do not reduce clothing pressure, because students find other ways to signal who has money, from shoes to bags to phones. That one cannot be true at the same time as Side A. Both sides are now taking positions on one question, whether uniforms actually reduce the pressure, and whatever the judge decides about that question decides something in the round.\n\nThat is clash: two arguments answering the same question in ways that cannot both stand. Run the both-true test on any pair you think is a clash. If both statements survive together, you have found two arguments, not a disagreement, and the round is still waiting for you to say what it is about.\n\nMost real disagreements are about how much, not about yes or no, and the test still works — you just have to put the amount into the question. Almost nobody argues that uniforms do nothing whatsoever; the other side argues that they do far less than you claim. “Do uniforms reduce clothing pressure?” is answered yes by both teams. Add the amount the round actually turns on — “do uniforms meaningfully reduce clothing pressure?”, “do they reduce it for the students who feel it most?” — and the two sides separate again. Keep the amount inside the question the two sides are answering. “Do they reduce it enough to be worth the cost?” looks like the same move and is not: it asks the judge to trade one thing off against another, which is weighing, and it belongs to a later lesson. When both statements look partly true, sharpen the question with a word like meaningfully, mostly, or enough, and check that the two sides still land on opposite sides of it."
            },
            {
              heading: "Find the question both sides are already answering",
              body: "Real clash is rarely lying on the surface. Speakers write their arguments separately, so even when the two sides are genuinely in dispute, the dispute is usually buried one step below what each of them said. The way to dig it out is to ask, for each argument, what it is trying to prove and what has to be true for it to prove that. Side A wants free buses to reduce traffic, and that needs the new riders to be people who used to drive. Side B says the new riders will be today's passengers making extra trips. Neither speaker said the words “who rides”, and both of their arguments stand or fall on it.\n\nThat shared dependency is the clash, and it has three properties you can check. One side needs the answer to go one way and the other side needs it to go the other way. Each side's conclusion actually changes depending on the answer, so it is not a side issue that both could concede without losing anything. And it is specific enough that evidence and reasoning could settle it, rather than being the motion restated. The shared question is not always about facts, either: two sides can disagree about a principle, such as whether a school may decide what its students wear at all, and the same three checks apply.\n\nWhen you find it, you have also found which arguments belong together. Most opponents make several arguments, and usually only one of them meets yours; two contentions that looked unrelated turn out to be answering the same question, and you can put them in front of the judge as a pair instead of a list. The hardest part is usually that the two sides used different words for the same issue. Cutting traffic and adding trips do not sound like the same subject, and they are, because both rest on who rides. Translate each argument into the question it depends on, and the disagreements that matter appear.\n\nSometimes the honest result of digging is that there is no shared question. Free buses can cut traffic and cost eleven million at the same time; those arguments are independent, and the round will have to compare them rather than resolve them. Say so. Do not invent a dependency the other side's argument does not have just to manufacture a clash, because the judge will see the words you put in their mouth. Comparing independent arguments is weighing, which you will learn later; finding out that they are independent is part of this skill."
            },
            {
              heading: "State the clash so either side could still win it",
              body: "Once you have found the disputed question, you have to say it out loud, and the way you say it decides whether the judge trusts it. A clash question phrased from inside your own case is not a clash question; it is your conclusion with a question mark on the end. “Why do uniforms fail to reduce pressure?” has already decided that they fail. “Why is our side obviously right on cost?” is not a question anyone could answer against you. Judges notice this, and it costs more than it gains: a loaded question tells the judge that you cannot describe the disagreement fairly, which makes everything you then say about it less believable.\n\nThe neutral version names the proposition and leaves the answer open. “Do uniforms meaningfully reduce clothing pressure?” can be won by either side, and that is exactly the point, because it forces you to say what must actually be resolved. A good check is to imagine your opponent reading the question aloud. If they would accept it as a fair description of what you both disagree about, it is a clash question. If they would object to a word in it, that word is doing your arguing for you, and it should come out.\n\nThe same check applies to the two positions you state on the way to the question. “Side A says uniforms magically fix bullying” is not what Side A said, and a clash built on a weakened version of their argument is a clash they never joined; the judge will hand it straight back. Restate each side at the strength they gave it, in words they would recognise as their own, and then find where those two honest sentences meet.\n\nNeutral does not mean vague. “Are uniforms a good idea?” is neutral and useless, because it is the motion. The clash question sits between the motion and your conclusion: narrower than the whole debate, and open in a way your conclusion is not."
            },
            {
              heading: "Clash is not refutation, and it is not weighing",
              body: "Three different moves get called clash in beginner rounds, and keeping them apart is most of the skill. Identifying the clash answers one question: what are the sides actually disagreeing about? Refutation answers a different one: why does their reasoning on that point fail? Weighing answers a third, later in the round: once both sides have answered, or when the arguments turn out to be independent, which should count for more?\n\nYou can do the first without the second. Saying “both sides are really arguing about whether the new riders come out of cars” is a complete and useful move even before you have shown that the other side is wrong about it, and a judge who hears it knows where the round will be decided. The confusion runs the other way too. A speaker who answers an argument has not necessarily found the clash: they may have answered a point that was never in dispute, or one the round does not turn on, and they will sound responsive while the real disagreement sits untouched.\n\nTwo more traps look like clash and are not. Naming the motion as the disagreement, “the clash is whether we should have free buses,” tells the judge nothing, because every argument in the room fits under it. And picking a disagreement that is real but changes neither side's conclusion produces a genuine dispute the round does not need: the two sides may argue hard about whether the lost fares come to eleven million or nine, and if both conclusions survive either number, the judge who settles it has settled nothing. The clash worth naming is the one both conclusions depend on."
            }
          ],
          additionalExamples: [
            {
              setup: "Motion: primary schools should stop setting homework. Side A argues that homework builds the habit of working without a teacher in the room. Side B argues that at that age homework mostly measures whether a parent is free to sit with the child. A speaker on Side B tries to name the clash.",
              weak: "The real clash is whether homework unfairly punishes children whose parents cannot help them.",
              strong: "Both sides are answering the same question: who is actually doing the work when a seven-year-old does homework. Side A says the child, and that is where the habit comes from. Side B says the parent, whenever there is one free. The clash is whether primary-age homework builds a habit in the child or depends on the adult at home.",
              explanation: "This fails differently from the worked example. The weak version has found the right issue and then states it from inside Side B's case: “unfairly punishes” has already decided that homework is unfair and that it is a punishment, so Side A could never accept the question as a description of the debate. The strong version keeps the same issue and takes the verdict out of it. Either side could win the question as stated, which is what lets the judge treat it as the thing to resolve rather than as one side's slogan."
            }
          ],
          revisionLadder: [
            {
              attempt: "Side A says opening the library on Saturdays would give students somewhere quiet to study. Side B says the council cannot afford weekend staff, and that the students who want somewhere quiet already use the public library in town. So the clash is quiet study versus staffing costs.",
              diagnosis: "Both of the paired statements can be true on the same Saturday: the library can be badly needed and expensive to staff at once, so choosing between them resolves nothing. The speaker has paired Side A with the wrong one of Side B's two arguments. “X versus Y” is the sound of two arguments being placed side by side rather than a disagreement being found.",
              revision: "Side B's second argument is the one that meets Side A. Side A's benefit needs students who have nowhere quiet to go; Side B says those students already have somewhere. The clash is whether the students Side A describes lack a quiet place now, or already have one in town. The staffing cost stays outside it, and can be true either way."
            },
            {
              attempt: "Side A says a skatepark would give teenagers somewhere to go. Side B says the teenagers already gather in the leisure-centre car park and a park will not move them. Side A answers: they are claiming teenagers do not want anywhere better, which is obviously false. The real clash is whether teenagers would prefer a skatepark to a car park.",
              diagnosis: "The clash question is well phrased and it is built on a position Side B never took. Side B said the teenagers would not move, not that they would not prefer to; the speaker has swapped a claim about behaviour for a claim about taste, because the second is easier to beat. A judge who heard Side B speak will hand this straight back, and the disagreement that was actually on the table is now unanswered.",
              revision: "Side B says the teenagers already have a place and would not move to a new one. Side A says they have nowhere to go. Taking Side B at their strongest, the clash is whether the car park those teenagers use now already does what a skatepark would do for them."
            }
          ],
          misconception: {
            wrongModel: "Clash means taking one argument from each side and setting them against each other.",
            whyItFails: "Two arguments can come from opposite sides, be about the same motion, and still answer different questions. Cutting traffic and costing eleven million are both about free buses, and both can be true at once, so choosing between them settles no disagreement; it compares two independent things, which is a later and different job. Opposite sides is where you look for clash; it is not what clash is.",
            betterModel: "Clash exists when competing arguments answer the same question in ways that cannot both be right. Find the question first, then the arguments that answer it, and state the question so that either side could still win it."
          },
          commonMistakes: [
            {
              mistake: "Pairing two arguments only because they come from opposite sides.",
              whyItFails: "Opposite sides tell you where to look, not what you have found. Arguments written separately usually answer different questions, and a pair that does not share a question is a list, not a clash.",
              fix: "Before you call a pair a clash, write down the one question both arguments are answering. If you cannot write it, look at the other side's other arguments; the one that meets yours is usually there."
            },
            {
              mistake: "Choosing two claims that can both be true at the same time.",
              whyItFails: "If the judge can believe both statements together, deciding between them settles no disagreement, and the round has not moved.",
              fix: "Run the both-true test. If both statements survive, go one level down to what each argument depends on. If there is still no shared question, say the arguments are independent rather than inventing a link."
            },
            {
              mistake: "Writing a clash question that assumes your own side is right.",
              whyItFails: "“Why does their plan fail?” is your conclusion with a question mark on it, and a judge who hears it stops trusting your description of the round.",
              fix: "Phrase the question so that your opponent could read it aloud and accept it. Remove any word that presumes the answer."
            },
            {
              mistake: "Naming the motion instead of the actual disagreement.",
              whyItFails: "The motion is the question the whole round answers, so every argument fits under it and it points the judge nowhere in particular.",
              fix: "Narrow it. The clash sits between the motion and your conclusion: the specific proposition the two sides take opposite positions on."
            },
            {
              mistake: "Confusing identifying the clash with refuting it.",
              whyItFails: "Naming the disagreement does not say why the other side is wrong about it, and answering an argument does not prove it was the disagreement the round turns on.",
              fix: "Do the two jobs in order. Say what the sides disagree about first; then, separately, argue why your side of that question holds."
            },
            {
              mistake: "Restating the other side more weakly than they put it.",
              whyItFails: "A clash built on a version of their argument they never made is a clash they never joined. The judge heard what they actually said, so the disagreement you named is not the one on the table, and their real argument goes unanswered.",
              fix: "Write each side's position in words they would recognise as their own, at the strength they gave it. If they would object to a word in your restatement, that word is yours, not theirs."
            },
            {
              mistake: "Naming a real disagreement that the round does not turn on.",
              whyItFails: "Two sides can genuinely disagree about a detail that changes neither conclusion. A judge who resolves it has resolved nothing.",
              fix: "Ask what each side's conclusion would lose if the question went against them. Name the disagreement whose answer changes the outcome for both."
            }
          ],
          languageFrames: [
            {
              purpose: "Identify the disagreement",
              starters: [
                "The real disagreement is whether ___",
                "Both sides are answering the question of whether ___",
                "Side A says ___, while Side B says ___"
              ]
            },
            {
              purpose: "State the clash neutrally",
              starters: [
                "The judge needs to decide whether ___",
                "The key question in this round is whether ___",
                "Neither side has yet shown whether ___"
              ]
            },
            {
              purpose: "Connect the two sides",
              starters: [
                "This matters to both arguments, because each depends on whether ___",
                "Their point and ours meet on the question of whether ___",
                "The two cases about {topic} meet on whether ___"
              ]
            }
          ],
          scaffoldedTry: {
            prompt: "Motion: this school should move to a four-day week. Side A argues that attendance would improve, because families could book medical and dental appointments on the free weekday instead of pulling students out of lessons. Side B makes two arguments: first, that the four remaining days would each run an hour longer, and younger students lose focus in the final hour; second, that clinics hand families whatever appointment slot is free, and most of those will still fall on school days whichever day is off. Only ONE of Side B's arguments meets Side A. Find it, say what each of those two sides is trying to prove in words they would accept, and state the question both of them depend on, so that either side could still win it.",
            frame: "Side A argues ___. Side B argues ___. The real clash is whether ___.",
            slots: ["side a", "side b", "the real clash"],
            motion: "this school should move to a four-day week"
          }
        }
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
      summary: "Pick the part of an argument that is both load-bearing and worth attacking, give a real reason it fails, and say what stops being established.",
      estimatedMinutes: 12,
      content: lesson(
        "Build a direct refutation by picking the part of an opposing argument that is both load-bearing and open to attack, explaining why that part fails, and stating what their argument can no longer establish.",
        "Refutation is answering one argument in a way that changes what the judge can still accept from it. That is a higher bar than disagreeing. \u201cThat is wrong,\u201d \u201cwe do not accept that,\u201d and \u201cour argument is better\u201d are all aimed at the other side, and none of them touches the reasoning that holds their conclusion up. An argument is a conclusion resting on supports. A refutation reaches into that structure, takes hold of one support, gives a reason it does not hold, and reports what the conclusion has lost. If your answer could be true and their argument could still work exactly as before, you have contradicted them without refuting anything.",
        "A judge decides what survived. An answer that only signals disagreement leaves them holding the argument you objected to, because nothing you said gave them permission to stop believing it. A finished refutation has four parts \u2014 they say, but, because, therefore \u2014 and most beginner answers have the first two. The steps below are how you build all four, and they are also how you hear the gap in your own answer while there is still time to fix it.",
        [
          "Restate their argument as a conclusion plus the supports it rests on: what do they want the judge to accept, and what has to be true for that to follow?",
          "Find the steps the conclusion cannot survive losing: if the judge stopped believing this one, would the conclusion still stand? Then pick from those the one you could actually give the judge a reason to doubt \u2014 necessary is only half of it, and a step nobody disputes is not a target.",
          "State your objection to that support in one sentence, so it is clear what you are denying.",
          "Give the reason \u2014 the because. It has to say why the support fails, in terms someone could check or dispute, not restate that it fails.",
          "Say what changed for their argument: what is now unproven, weaker, or no longer following. Stop there; do not switch to your own case."
        ],
        {
          prompt: "They argue: requiring parking in every new apartment building protects existing residents, because without required parking the new tenants will park on the residential streets, and streets that fill with parked cars are worse to live on.",
          weakAnswer: "They say required parking protects residents, but the street-parking worry is overstated, because residents would not actually end up facing the problem they are describing. Therefore you should prefer our side \u2014 this city needs housing, and the parking rule is standing in the way of building it.",
          strongAnswer: "They say required parking protects residents, but the street-parking worry is overstated, because these buildings sit within a few minutes\u2019 walk of the rail line, and in comparable buildings near transit a large share of tenants own no car at all. Therefore the number of new cars competing for street space is much smaller than their argument needs, so \u201cthe streets fill up\u201d is no longer established.",
          whyItWorks: "Both answers pick the same support \u2014 the step from new tenants to full streets \u2014 and that choice was right. Note what makes it right, because it is not that the other steps are unnecessary: \u201cfull streets are worse to live on\u201d is necessary too, and their conclusion needs it. It is simply not open to attack \u2014 nobody in the room is going to be talked out of it. The step from new tenants to full streets is the one that is both necessary and contestable, so it is the only place an answer can actually take something. What separates them is the last two moves. The weak version\u2019s because says the problem would not happen, which is what the objection already said, so a judge who did not believe the objection has been given no new reason to. And its therefore leaves their argument entirely and starts arguing for housing, so their support is still standing when the answer ends. The strong version replaces the restatement with a mechanism \u2014 near transit, fewer tenants own cars \u2014 which is specific enough that the other side could contest it, and that is exactly what makes it worth something. Then it reports the damage inside their argument and stops there."
        },
        q(
          "Their argument: \u201cThe city should not make Third Street one-way. Delivery trucks make about 400 stops a week on that block, and a one-way conversion would force them to circle the block to reach the loading docks, so deliveries would take longer and the shops that depend on them would lose business.\u201d Which part is worth attacking?",
          [
            "That delivery trucks make about 400 stops a week on that particular block",
            "That the shops along that block depend on those deliveries to stay open",
            "That trucks would have to circle the block to reach the loading docks",
            "That shops losing business would be a bad outcome for the neighbourhood"
          ],
          "That trucks would have to circle the block to reach the loading docks",
          "Reread the section on finding the part that has to fall, and run both of its tests on each option.",
          "Both halves have to pass. Take away the circling step and the argument reaches no delay and no lost business, however true everything else is \u2014 so it is necessary \u2014 and whether trucks would actually have to circle depends on which side of the block the docks sit on, which is a claim you can give the judge a reason to doubt. The 400-stops figure is the trap, and it is the most tempting option on the page: it is a specific number, so it looks checkable and beatable, and you may well be able to show it is wrong. Their argument does not need it. Circling costs time at 400 stops a week and at 150, so correcting the figure leaves the chain running and the conclusion standing \u2014 the same error as attacking an out-of-date cost figure in an argument about whether a service is worth its cost. That the shops depend on deliveries is necessary but undisputed, and that losing business would be bad is not in dispute either. Necessary is only half the test, and a beatable number is not the same as a load-bearing one.",
          "Refutation"
        ),
        [
          q(
            "An opponent argues that a new bike lane will slow emergency vehicles. Which response\u2019s because actually explains something?",
            [
              "But emergency response will not get slower, because the delay they describe would not actually materialise on a corridor with this traffic pattern and this street layout.",
              "But emergency response will not get slower, because the modelling they are relying on does not reflect the conditions this corridor actually has today.",
              "But emergency response will not get slower, because the lane replaces on-street parking rather than a driving lane, so the road keeps the same number of through lanes.",
              "But emergency response will not get slower, because the concerns they have raised about response times, while understandable, do not hold up under closer examination."
            ],
            "But emergency response will not get slower, because the lane replaces on-street parking rather than a driving lane, so the road keeps the same number of through lanes.",
            "The section on making the because do work has a test for exactly this.",
            "Cover the words after because in each one. Three of the four survive the cut with their meaning intact, which means those clauses explained nothing. \u201cIt would not materialise\u201d and \u201cit does not hold up under closer examination\u201d are the objection said twice, and the modelling answer is the same move wearing more vocabulary \u2014 \u201cdoes not reflect the conditions this corridor actually has\u201d asserts the estimate is wrong without ever saying WHICH condition it gets wrong or what the right one is, so there is still nothing for the other side to argue with. Naming a source of evidence is not the same as naming a mismatch in it: \u201ctheir study measured a different population than this plan affects\u201d would be a real because, because it says what the mismatch IS. Only the parking answer loses something when you cut it: parking removed rather than a driving lane, so the through-lane count is unchanged. That is a mechanism \u2014 specific, checkable against the street plans, and something the other side can come back at.",
            "Refutation"
          )
        ],
        [
          q(
            "You have shown that an opponent\u2019s cost figure came from a much larger project than the one being proposed. What does the last move of your refutation have to do?",
            [
              "Explain how your own side arrived at a more accurate figure for a project of this size",
              "Say what their argument can no longer establish now that the figure does not apply",
              "Say that their whole cost case has collapsed now that this figure has been answered",
              "Restate the objection in stronger terms so the judge registers how serious the error is"
            ],
            "Say what their argument can no longer establish now that the figure does not apply",
            "Reread \u201cSay what changed, and only that\u201d, including both habits it warns about.",
            "Report the damage: with the figure gone, their argument no longer establishes that the proposal is unaffordable. That is the sentence a judge can write down and check. The closest wrong answer is the one that sounds strongest \u2014 saying their whole cost case has collapsed. Notice the scope: you answered one figure inside one argument, and their case for cost can rest on more than that one argument. Announcing the collapse of the case claims ground you did not take, and the first person who checks will find the rest of it standing and trust the rest of your speech less. Report the argument you actually damaged, not the case. Supplying your own better figure is useful work, but it is your case, and it leaves their support standing while you build yours. Restating the objection more forcefully adds volume, not reasoning \u2014 the objection had already landed; what was missing was what it did.",
            "Refutation"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Disagreeing and refuting are not the same move",
              body: "Almost every beginner answer is a disagreement wearing the clothes of a refutation. It faces the right way \u2014 it is about their argument, it sounds firm, it may even be true \u2014 and it leaves their reasoning exactly where it was. The test is simple and worth running on your own answers: suppose everything you just said is granted. Can the other side\u2019s argument still be made, in the same words, and still reach the same conclusion? If it can, you have registered an objection rather than refuted anything. \u201cWe disagree,\u201d \u201cthat is not true,\u201d and \u201cour side is stronger on this\u201d all fail that test every time, because none of them says anything about why their conclusion followed in the first place."
            },
            {
              heading: "Find the part that has to fall",
              body: "Arguments are not flat. A conclusion sits on several supports, and they are not equally important: some are doing the work, and some are scenery the other side would happily concede. Your answer needs a support that is doing the work AND that you could argue them out of \u2014 both halves, and the second is the one people forget. To find the first half, restate the argument as a short chain \u2014 this, therefore this, therefore that matters \u2014 and go through the steps asking one question: if the judge stopped believing this step, would the conclusion still follow? Where the answer is no, that step is NECESSARY \u2014 the argument cannot reach its conclusion without it. That narrows the field, and it does not finish the job, because most arguments have several necessary steps and some of them nobody would dispute. \u201cStreets full of parked cars are worse to live on\u201d is necessary to an argument about parking, and you will not win a room by denying it. So apply a second test to the necessary steps: which of them could you actually give the judge a reason to doubt? The step worth attacking is the one that is both necessary to their conclusion AND open to attack. Watch the strength of what you attack, too. An argument that needs SOME of something is not damaged by proving it does not hold for MOST. If their case runs on the shops that would lose parking, showing that most shops on the street have their own lot leaves the argument standing for exactly the shops they were talking about. An over-strong version of a premise is a tempting target precisely because it is easy to find figures against, and beating it takes nothing down. Advice like \u201cattack their weakest argument\u201d points you the same wrong way: the weakest-sounding part is often a step the argument does not need at all, or does not need in the strength you attacked. Beating it feels like progress and costs the other side nothing."
            },
            {
              heading: "Make the because do work",
              body: "The because is where a refutation is won or lost, and it fails in a specific way: it repeats the objection instead of explaining it. \u201cTheir evidence does not apply, because it is not relevant here\u201d has the shape of a reason and the content of an echo. Use the delete test. Cover the words after because and read what is left. If the answer means the same thing without them, the clause explained nothing. A real because names something \u2014 a mechanism, a condition, a mismatch, a step that does not follow \u2014 and one useful sign that you have one is that the other side could argue with it. \u201cTheir study measured a different population than the one this plan affects\u201d can be checked and disputed. \u201cTheir study is weak\u201d cannot be, because it says nothing to disagree with."
            },
            {
              heading: "Say what changed, and only that",
              body: "An answer that stops after the reason leaves the judge to work out what it did, and judges are not obliged to do that work. Finish by saying what their argument can no longer establish: which step no longer connects, what is now unproven, what has become smaller or less certain. Two habits ruin this last move. The first is drifting home \u2014 ending with why your own proposal is good, which is a different speech and leaves their support untouched. The second is overclaiming: announcing that their case has collapsed when you have taken out one support. Say what you actually took, and it will survive scrutiny; say more, and the first person to check will find the rest of their argument standing."
            }
          ],
          additionalExamples: [
            {
              setup: "An opponent argues that a proposed late-night bus route will be a waste of money, because ridership after midnight is low, the fare revenue will not cover the drivers\u2019 overtime, and the buses will often run nearly empty. Your researcher finds that the overtime figure they used is out of date \u2014 the current contract pays a lower night rate.",
              weak: "They say the route wastes money, but their overtime number is wrong, because the union contract was renegotiated last year and the night rate is lower now. Therefore their cost estimate is inaccurate.",
              strong: "They say the route wastes money, but the argument does not rest on the exact overtime rate \u2014 it rests on the claim that ridership after midnight is too low to justify the service. On that step: the three hospitals and the airport on this corridor run shift changes at one in the morning, so the post-midnight riders are shift workers with no alternative, not the empty buses they are picturing. Therefore the \u201cnearly empty\u201d premise is the one that does not hold, and without it their waste conclusion has nothing left to rest on.",
              explanation: "This one is different from the worked example on purpose. There, the response picked the right support and then failed at the because and the therefore. Here the response has a perfectly good because from the start \u2014 the contract really was renegotiated, and the correction is checkable \u2014 and it still refutes nothing, because it lands on a support the argument does not need. Their conclusion is that the route wastes money; a lower overtime rate makes the service cheaper, and an argument that the service is not worth its cost survives the cost going down. True is not the same as load-bearing. The strong version says out loud which support it is going after and why that is the one that matters, then attacks the ridership premise the whole argument stands on."
            }
          ],
          revisionLadder: [
            {
              attempt: "They say the new stadium will strain city services, but that is not going to be a problem for the surrounding neighbourhoods.",
              diagnosis: "This is responsive \u2014 it is aimed at the right claim \u2014 and it is still only a denial. The judge is being asked to take the speaker\u2019s word over the other side\u2019s, with nothing offered to decide between them. Nothing after the objection explains anything, because there is nothing after the objection.",
              revision: "They say the new stadium will strain city services, but that strain lands almost entirely on event days, because the stadium sits in a commercial district that is nearly empty on evenings and weekends, which is exactly when events run. Therefore the year-round burden their argument describes does not arise, and what is left is a handful of scheduled evenings."
            },
            {
              attempt: "They say later school start times will hurt after-school jobs, but the shift is too small to reach the hours students actually work, because most student shifts in this district begin after five and the dismissal bell would still be well before four. This shows our side has thought carefully about students who work, and it is one more reason the later start is the right policy for this community.",
              diagnosis: "The reason is doing real work here \u2014 shift start times against dismissal times is checkable, and the other side could contest the numbers. Then the answer walks away. The closing sentences are about the speaker\u2019s own case, so the judge is never told what happened to the argument they were answering, and \u201churts after-school jobs\u201d is left on the flow untouched.",
              revision: "They say later school start times will hurt after-school jobs, but the shift is too small to reach the hours students actually work, because most student shifts in this district begin after five and the dismissal bell would still be well before four. Therefore the conflict their argument depends on does not arise for most working students, and the harm they described shrinks to a small number of unusually early shifts."
            }
          ],
          misconception: {
            wrongModel: "Refutation means saying something against what the other side said. If your answer is aimed at their argument and you sound confident, you have refuted it.",
            whyItFails: "Opposing them is a direction, not a reason. An answer can point straight at the other side, be entirely true, and leave every support of their argument standing \u2014 in which case the judge still has their argument at the end of your speech. Confidence changes nothing about that: a judge cannot write down that an argument failed unless someone told them why it failed.",
            betterModel: "A refutation is a repair to what the judge is allowed to believe. It names one support the other side\u2019s conclusion rests on and could be argued out of, gives a reason that support does not hold, and states what their argument can no longer establish without it. If you cannot point to the support you took away, you have not refuted \u2014 you have objected."
          },
          commonMistakes: [
            {
              mistake: "Objecting with no because at all",
              whyItFails: "\u201cThat will not happen\u201d and \u201ctheir evidence does not prove that\u201d ask the judge to choose between two bare assertions, and the other side made theirs first with reasoning attached. An objection with no reason is a preference.",
              fix: "Never let an objection end at the objection. Immediately ask yourself \u201cbecause what?\u201d and answer it out loud before moving to the next argument."
            },
            {
              mistake: "A because that just restates the but",
              whyItFails: "\u201cThe risk is overstated, because it is not as big as they claim\u201d has a reason-shaped clause carrying no reason. A judge who was not convinced by the objection has been given nothing new to be convinced by, so the answer sounds complete while doing the work of a denial.",
              fix: "Run the delete test: cover everything after because. If the answer still means the same thing, that clause is decoration \u2014 replace it with something the other side could dispute."
            },
            {
              mistake: "Attacking a part the argument does not need",
              whyItFails: "You can be completely correct and still change nothing. If the conclusion still follows once the judge grants your point, the other side can simply concede it, and the time you spent is gone. Correcting a detail is not the same as removing a support.",
              fix: "Before answering, test the support twice: assume the judge accepts your objection in full and reread their argument \u2014 if it still reaches its conclusion, aim somewhere else. Then ask whether the step is one anyone would actually dispute; a necessary step nobody argues with is not a target either."
            },
            {
              mistake: "Stopping before you say what changed",
              whyItFails: "You have identified the support and given the reason, and then left the last step to the judge. Judges write down what they were told; an answer that never states what the argument lost often gets recorded as an exchange rather than as a response.",
              fix: "End inside their argument with one sentence naming what is now unproven, no longer connected, or smaller than they needed."
            },
            {
              mistake: "Finishing by restarting your own case",
              whyItFails: "This is the most common way a good answer is wasted. The objection and the reason are sound, and then the final sentence turns to why your proposal is better \u2014 so the answer never reports what happened to the argument it was answering, and their support goes unmentioned at the moment it was supposed to fall.",
              fix: "Keep the last sentence pointed at their argument. Your own case has its own place in the speech; the end of a refutation is not it."
            }
          ],
          languageFrames: [
            {
              purpose: "Answer their argument",
              starters: [
                "They argue that {their claim}, but ___",
                "The step their argument depends on is ___, but ___",
                "That does not establish ___, because ___"
              ]
            },
            {
              purpose: "Give the reason",
              starters: [
                "The problem with that reasoning is ___",
                "That step fails because ___",
                "The mechanism they are assuming is ___, and it does not hold because ___"
              ]
            },
            {
              purpose: "Say what changed",
              starters: [
                "Therefore their argument no longer establishes ___",
                "Without that step, what is left of their argument is ___",
                "So the harm they described shrinks to ___"
              ]
            }
          ],
          scaffoldedTry: {
            prompt: "Their argument: \u201cThe school should replace its printed newspaper with an online edition. Printing costs the paper most of its budget, and once that money is freed up the staff can afford to send reporters to away games, so coverage gets better.\u201d Answer it. Pick the step their conclusion cannot survive losing and that you can give the judge a reason to doubt \u2014 then fill every blank yourself.",
            frame: "They say ___, but ___ because ___. Therefore ___.",
            slots: ["they say", "but", "because", "therefore"],
            opponentClaim: "replacing the printed newspaper with an online edition will improve coverage"
          }
        }
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
      summary: "Give the judge a rule for comparing impacts, then apply it to both sides.",
      estimatedMinutes: 11,
      content: lesson(
        "Give the judge a rule for comparing impacts, argue for that rule, then apply it to both sides.",
        "Weighing explains why one argument matters more than another. Magnitude, probability, timeframe, and reversibility are useful names for common comparison moves — the skill is making the comparison clear, not saying the lens words. Underneath any comparison sits a weighing standard, also called a weighing framework: a rule for deciding, stated so that it could be applied to either side's impact and not only to your own. \"A harm that is more likely should count for more\" is a standard, because the other side's impact can be tested against it too. \"Our harm is huge\" is not — there is nothing there for the other side to be measured by. A standard is something you argue for, not something you announce and assume, and the other side can argue for a different one; that disagreement is part of the debate. Putting yours on the table early matters for two reasons: the judge hears it while there are still speeches left in which it can be answered, and the comparison that comes later has something to be measured against instead of two sides asserting that their own impact is bigger. Stating the rule is not the comparison — you still have to show what each impact looks like under it.",
        "Judges often believe both sides have some truth. Weighing tells them which truth should decide the round. Without a rule for deciding, the last speeches turn into both sides insisting their own impact is bigger, and the judge falls back on whichever rule they personally happen to prefer. A rule you offered early and defended gives the judge something to apply — and gives the other side time to contest it, which is what makes it fair for the judge to use.",
        ["Say what rule you want the judge to decide by, in a form that could be applied to either side.", "Give a reason that rule fits this debate, and expect the other side to contest it.", "Identify both impacts and show what each one looks like under the rule.", "State the comparison the rule produces."],
        {
          prompt: "Side A argues an AI-literacy requirement improves student preparedness. Side B argues it costs class time. Here are two ways Side A could run the same comparison across a round.",
          weakAnswer: "[Final speech, and nowhere earlier] Decide this on what cannot be undone, because a mistake an institution can repair later is a smaller thing than one a person carries out the door. Lost class time is recoverable — the district adjusts the schedule once — while a student who leaves school unable to check what an AI system tells them carries that gap into work they do not get to redo. Under that rule, preparedness decides.",
          strongAnswer: "[First speech] Decide this on what cannot be undone, because a mistake an institution can repair later is a smaller thing than one a person carries out the door. [Final speech] Lost class time is recoverable — the district adjusts the schedule once — while a student who leaves school unable to check what an AI system tells them carries that gap into work they do not get to redo. Under that rule, preparedness decides.",
          whyItWorks: "Strip the speech labels and the two versions are word for word the same: the same rule, the same reason for it, and the same comparison. What moves is which speech the rule arrives in. In the strong version it is on the table from the first speech, so the other side still had speeches in which to argue for a different rule, and the judge is applying a rule that was open to challenge. In the weak version the rule appears for the first time beside the conclusion it is meant to justify, when nobody can answer it. The fix for the weak version is not to reorder this speech — it is to have given the rule in an earlier one."
        },
        q("Which phrase is weighing?", ["Our impact is supported by three separate studies", "Their impact would be serious if it ever happened", "Our impact is bigger and happens sooner", "We answered every argument they made today"], "Our impact is bigger and happens sooner", "Weighing compares importance.", "This phrase compares magnitude and timeframe. The others describe how well an impact is evidenced, concede a harm without comparing it, or claim coverage — none puts the two impacts side by side.", "Weighing"),
        [
          q("Aff wins a jobs impact; Neg wins a housing-cost impact. Which response weighs them?", ["Housing costs are a serious and well-documented burden, and the other side described that harm accurately", "Jobs matter more here because lost income reaches more families and cannot be recovered quickly", "Our jobs evidence comes from a more recent source than their housing evidence does", "Both harms are real, so the judge should treat them as equal and decide on something else"], "Jobs matter more here because lost income reaches more families and cannot be recovered quickly", "Weighing compares the two impacts against each other.", "Only this answer compares the two impacts and says why one should matter more. That comparison is weighing, whatever words it uses. The others concede a harm without comparing, compare the evidence rather than the impacts, or refuse to choose at all.", "Weighing"),
          q("Their impact is huge but very unlikely; yours is smaller but nearly certain. Which comparison resolves that honestly?", ["The huge impact wins automatically because it is bigger, whatever the chance of it happening", "Likelihood is too uncertain to be part of an honest comparison, so set it aside here", "Prefer the huge impact, because a harm on that scale would outweigh anything else in the round if it ever actually arrived", "Prefer the near-certain impact, because a harm that will almost surely happen should beat one that probably never does"], "Prefer the near-certain impact, because a harm that will almost surely happen should beat one that probably never does", "Compare how likely each impact is, not only its size.", "This weighs likelihood against size and tells the judge why likelihood should decide here. A speaker can make this move without ever saying the word probability. The others treat size as automatically decisive, drop likelihood from the comparison, or argue for size without answering how unlikely the harm is.", "Weighing"),
          q("Why weigh arguments?", ["To show the judge that you covered every argument in the round", "To help the judge decide between impacts", "To repeat your strongest impact so the judge remembers it", "To signal which part of the flow you are speaking on"], "To help the judge decide between impacts", "Think about decision-making.", "Weighing turns competing impacts into a clear decision. Covering arguments, repeating an impact and signposting are all useful, but none of them tells the judge which impact should decide the round.", "Weighing"),
          q("A round on a town curfew: it might reduce late-night injuries, but it is unlikely to be enforced. Which sentence gives the judge a rule that could be applied to either side's impact?", ["Late-night injuries are a serious and well-documented harm for teenagers here.", "A harm that only lands if a policy is enforced should count for less than one that does not.", "Our side has produced more evidence on injuries than the other side has produced.", "The curfew is going to reduce injuries by a measurable and meaningful amount."], "A harm that only lands if a policy is enforced should count for less than one that does not.", "A rule has to be usable on the other side's impact too, not only on yours.", "Only one of these could be turned on either side's impact. The others describe a harm, compare how much evidence each side has, or assert a result — none of them tells the judge how to choose once both harms are real.", "Weighing"),
          q("Which of these is a weighing standard rather than an impact claim?", ["Thousands of families in the county would lose their only transit access.", "Their study on transit ridership was published more than six years ago.", "Transit access is the strongest argument our side has made this round.", "Harms falling on people with no way to avoid them should count for more."], "Harms falling on people with no way to avoid them should count for more.", "One of these could be applied to the other side's harm as easily as your own.", "A standard is a rule either side's impact can be tested against. The other three name a harm, attack a source, or rank your own arguments — none would help a judge choose between two real harms.", "Weighing"),
          q("Side A asks the judge to decide on which harm is more likely. Side B thinks reversibility is the better rule. What should Side B do?", ["Accept Side A's rule, since it was stated first and cannot be changed now.", "Ignore rules entirely and simply describe its own impact in more detail.", "Argue for reversibility and say why it fits this debate better than likelihood.", "Wait until the final speech so Side A has no chance to respond to the rule."], "Argue for reversibility and say why it fits this debate better than likelihood.", "A standard is argued for, not just announced — and either side can argue for one.", "A weighing standard is a claim like any other: the other side can contest it and offer a better one, with a reason. Accepting a rule you disagree with concedes the comparison, ignoring rules leaves the judge to pick their own, and holding a rule back until nobody can answer it makes it weaker, not stronger.", "Weighing"),
          q("Two speakers both end up arguing that irreversibility should decide the round. Speaker A gave that rule in her first speech and returned to it at the end. Speaker B first raised it in her last thirty seconds. Why is A's version stronger?", ["A's rule was open to answer while speeches remained; B's arrived too late to contest.", "A used more of the standard debate vocabulary than B used in her speeches.", "A spent more total speaking time on irreversibility than B managed to spend.", "B's rule is the one the judge heard most recently, so it should count for more."], "A's rule was open to answer while speeches remained; B's arrived too late to contest.", "Think about what the other side could do with the rule in each case.", "A's rule was on the table while the round was still live, so it could be contested and the final comparison applied a rule that had survived that test. B's rule arrives after the conclusion it is meant to justify, with no time left to answer it. The comparison itself belongs in the last speeches; the rule it runs on should not be new there.", "Weighing"),
          q("You established early that harms already happening should count for more than harms that might happen later. The other side's harm is a projected budget shortfall in five years; yours is students going without meals now. Which sentence applies the rule you set?", ["Our impact is far more emotionally compelling than any budget projection is.", "A shortfall five years out may never arrive; students are missing meals now.", "Budget shortfalls like theirs are almost always exaggerated by the other side.", "We should win because we established a weighing rule and the other side did not."], "A shortfall five years out may never arrive; students are missing meals now.", "Run both harms through the rule, not only your own.", "The correct answer tests both impacts against the standard already established and lets that standard produce the conclusion. The others appeal to emotion, dismiss the other side's harm without using the rule, or treat having a rule as a win by itself — a rule tells the judge how to decide, it does not decide for them.", "Weighing")
        ],
        [
          q("Your harm begins now; theirs arrives years away. Which sentence weighs that difference?", ["Their harm is years away, which gives everyone involved plenty of time to prepare for it before it lands", "Our harm and their harm are both real, so a difference in timing does not change much", "Our harm is already starting, so the judge should act on it before their distant harm can even begin", "Our harm is happening now and theirs is speculative, so ours is the stronger argument here"], "Our harm is already starting, so the judge should act on it before their distant harm can even begin", "Explain why sooner should matter to the decision.", "This uses the time difference to tell the judge why one impact should decide the round — timeframe weighing, whether or not the word is said. The others assume distance solves the harm, dismiss timing as irrelevant, or stack claims without saying why sooner should decide.", "Weighing"),
          q("A round on rewilding farmland. Side A's harm is species loss that cannot be reversed; Side B's harm is a temporary drop in local farm income. Early on, Side B asked the judge to decide on which harm affects more people day to day, and gave a reason. You speak for Side A, and from your first speech you asked the judge to decide on what cannot be undone. Which final-speech line is strongest?", ["The number of species that are at stake here is far larger than the number of farms that would be affected by this policy, so we should simply win this round on sheer scale.", "You should ignore their rule entirely, judge, because any rule that happens to favour the side that proposed it can never be a fair one to use.", "Both harms here are serious ones, so we would ask you to set the standards aside and decide this round on which team has spoken more clearly.", "Under everyday reach their harm wins — but in our first speech we asked for a different rule: a harm that ends leaves the county its choices, a permanent one does not."], "Under everyday reach their harm wins — but in our first speech we asked for a different rule: a harm that ends leaves the county its choices, a permanent one does not.", "Ask which line does the most work for a judge who still has to choose between two real harms.", "This is the hard case: the other side's rule does not favour you. Simply accepting it loses the comparison, and rejecting it because it is inconvenient is not an argument. The strongest line admits what their rule yields, then holds the judge to the rule you put up in your first speech and gives the reason for preferring it — which is what a weighing standard is, a claim either side can contest. The scale option reaches for a rule neither side ever argued for, the ignore-their-rule option rejects a standard for being convenient rather than for being wrong, and the spoke-more-clearly option abandons weighing altogether.", "Weighing")
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
      estimatedMinutes: 11,
      content: lesson(
        "Compose a whole constructive speech: order the contentions, develop each one, and build your own side's case rather than answering theirs.",
        "A constructive is a speech, not a pile of arguments, and composing one is a different skill from writing a single good argument. For this lesson, three words carry their usual meanings from earlier in the course: your CASE is the set of arguments your own side is running, and a CONTENTION is a broad heading inside it — fairness or student wellbeing, say — with separate arguments underneath it. A complete argument has three parts: the claim says what you believe, the warrant explains why it is true, and the impact explains why it matters in the round. Its job is to put your side's case on the table in a form the rest of the round can be run against. Three things follow from that. First, order is a choice with consequences: a contention that other contentions depend on has to come before them, so if your second contention only matters once the judge accepts a definition or a mechanism established in the first, that dependency sets the sequence. Second, a constructive establishes rather than responds. The move that makes a rebuttal good — taking their claim and answering it — is out of place here, because in the first constructive there is often nothing yet to answer, and a speech that spends its time pre-empting arguments nobody has made gives the judge your opponent's case instead of yours. Third, the internal parts do their work in a place. A claim with a warrant and an impact is one argument; a constructive is several of those arranged so the judge can hold them at once, which is why each one needs a label and a boundary — where it starts, where it ends, and how it connects to the case as a whole. Evidence follows the same rule: citing a source is not using it. A study named and left there tells the judge you have support without telling them what it supports; saying what it found and why that makes your warrant more believable is what turns it into a reason. Finish by saying what your case establishes, not by claiming you have already beaten a case you have not heard — the comparison belongs in later speeches, and asserting it early does not make it true. Two more things follow from composing a speech rather than an argument. Contentions have to work as one case: two that do substantially the same job give the case the look of breadth without a second part to it, and a contention developed carefully but never tied to what the case is arguing leaves the judge holding something without knowing what it was for. And a contention is not established because its heading was announced or its parts were named — mentioning a claim, a warrant and a source somewhere in that stretch of speech is not the same as developing the reasoning that establishes it. Speech attention is limited, so spending most of it on one contention while another is only named does not leave you with a shorter second contention; it leaves that second contention unestablished.",
        "The constructive sets what the rest of the round can be about. Arguments you never establish are hard to revive later, and a case the judge could not follow the first time does not become clearer when it is referenced again at speed in a rebuttal. It also matters for fairness: the other side can only engage with a case they can identify. A constructive that arrives as an undifferentiated block gives them nothing specific to answer, which sounds like an advantage and is not — the judge sees arguments that were never really tested, and any of them can be attacked later without your having pinned it down.",
        ["Set out what your case will contain and in what order before you argue any of it.", "Order the contentions so that anything the later ones depend on comes first.", "Give each contention a boundary — label it, develop it, and close it before starting the next.", "Use evidence by saying what it found and why that supports the warrant, not by naming it.", "Close on what your case establishes, without claiming a comparison the round has not had yet.", "Before you finish, check that each contention does a distinct job in the case and has actually been developed rather than named."],
        {
          prompt: "A first constructive on a school AI-literacy requirement. Both versions contain the same two contentions and the same supporting material.",
          weakAnswer: "The other side is going to say this costs class time, but schools already waste time elsewhere, and they will probably argue teachers are not trained, though districts run professional development every year anyway. Integrity matters, and there is a study on citation habits. Careers matter too.",
          strongAnswer: "Two contentions: first that the requirement improves academic integrity, second that it improves career readiness. On integrity: students who are taught what these tools can and cannot do cite them instead of concealing them, and a district that ran the training saw fewer unattributed submissions the following year — which is what you would expect if concealment is driven by not knowing what counts as allowed. On career readiness: the same habits transfer, because entry-level work increasingly involves checking machine-generated output, and a student who has practised verifying a source is doing the thing the job asks for.",
          whyItWorks: "The weak version is not missing content — it is a rebuttal delivered in a constructive slot. It spends the speech answering arguments the other side has not made yet, so the judge hears the opposition's case first and your two contentions arrive as fragments: integrity gets a study with no finding attached, careers gets a sentence with no warrant. The strong version establishes the same two contentions instead of defending them prematurely, gives each a boundary, and uses the study by saying what it found and why that supports the warrant. Neither version compares itself to a case that has not been heard yet — that work belongs in later speeches."
        },
        q(
          "What makes the first constructive different from a rebuttal speech?",
          ["It is the speech in which evidence is first allowed to be introduced into the round", "It is delivered more slowly so the judge has time to take notes", "It is the only speech where a speaker may define terms at all", "It establishes your own case rather than answering arguments already made"],
          "It establishes your own case rather than answering arguments already made",
          "Ask what work the speech is doing, not what is permitted in it.",
          "The constructive's job is to put your case on the table; responding is what later speeches are for. The other options describe format or permissions rather than the speech's function, and none of them is what separates constructing from responding.",
          "Constructive"
        ),
        [
          q("Your second contention only makes sense if the judge has accepted the mechanism you explain in your first. What follows for the order of the speech?", ["Order does not matter as long as both contentions are eventually explained", "Put the second contention first, so the strongest material is heard earliest", "Keep the dependent contention after the one it relies on", "Merge them into a single contention so the dependency never comes up"], "Keep the dependent contention after the one it relies on", "One contention needs something the other supplies.", "If a contention depends on a mechanism established elsewhere, it has to come after that mechanism or it arrives unsupported. Reordering for impact breaks the dependency, and merging two distinct arguments hides one of them rather than solving the sequencing.", "Speech organization"),
          q("A speaker's constructive spends most of its time answering arguments the other side has not made yet. What is the main cost?", ["The speech will run over time, because pre-empting an argument always takes longer", "The judge is not permitted to consider pre-emptive arguments in a constructive", "The arguments become unusable later because they were raised too early", "The speech introduces the opponent's case while leaving its own underdeveloped"], "The speech introduces the opponent's case while leaving its own underdeveloped", "Ask what the judge ends up with at the end of the speech.", "Pre-empting spends your speech on their case and leaves yours thin. The cost is what the judge has at the end, not a timing problem or a rule against it — nothing forbids pre-empting, it just trades your own development for theirs.", "Constructive"),
          q("Which use of a source actually supports the contention it sits in?", ["A 2024 district study is directly relevant to what this contention argues", "There is strong published evidence supporting this contention from several sources", "A district that ran the training saw fewer unattributed submissions the next year", "This contention is supported by a study, which the other side has not disputed"], "A district that ran the training saw fewer unattributed submissions the next year", "One of these tells the judge what the source found.", "Only this states a finding the warrant can rest on. The others name a study, assert that evidence exists, or point out that it went unanswered — all of which tell the judge support has been claimed without telling them what it is.", "Evidence"),
          q("Which closing sentence is appropriate at the end of a first constructive?", ["Our case therefore outweighs anything at all that the other side is going to be able to say", "We have shown that the requirement improves both integrity and career readiness", "The other side has no response to either of the contentions we have presented", "This case is now proven, so the rest of the round cannot change the outcome"], "We have shown that the requirement improves both integrity and career readiness", "The other side has not spoken yet.", "A constructive can honestly state what it established. The others compare against, dismiss, or declare victory over a case that has not been heard — claims the speech has no basis for and which later speeches exist to test.", "Constructive"),
          q("A constructive presents three contentions with no labels and no breaks between them. What is the specific problem for the round?", ["Neither the judge nor the other side can tell where one contention ends", "The speech is too long for a judge to follow at competitive speaking speed", "Three contentions is more than a constructive speech is permitted to contain", "The contentions cannot be given impacts unless they are separated by labels"], "Neither the judge nor the other side can tell where one contention ends", "Think about what boundaries do for both the judge and the opponent.", "Without boundaries the arguments blur, so the judge cannot track them separately and the opponent cannot identify what to answer. It is not about length or a rule, and impacts can technically be stated either way — the loss is that nothing is separable.", "Speech organization"),
          q("Which of these is a job the constructive does that a later speech cannot easily do for it?", ["Comparing your impacts against the other side's impacts once both are in the round", "Answering the strongest argument the opposition has actually made", "Deciding which single argument the judge should vote on at the end", "Putting your own contentions on the table so the round can run against them"], "Putting your own contentions on the table so the round can run against them", "Which of these has to happen first for the others to be possible?", "Establishing the case is the constructive's distinctive job — the other three all depend on material that is already in the round. Comparison, refutation and collapsing are later work, and each needs a case that a constructive has already built.", "Constructive"),
          q("Your case has one contention about cost savings and one about access. They are independent — neither relies on the other. What does that mean for sequencing?", ["They must be delivered in the order the resolution mentions their subjects", "Independent contentions cannot both appear in a single constructive speech", "The order is a genuine choice, so pick one and make the boundary clear", "They should be merged, because independent contentions weaken each other"], "The order is a genuine choice, so pick one and make the boundary clear", "The dependency rule tells you what order is forced — here nothing is.", "Sequencing is only constrained when one argument needs another. With independent contentions there is no forced order, so the thing that matters is that the judge can tell where one stops and the next begins. The other options invent constraints that do not exist.", "Speech organization"),
          q("A speaker delivers two well-warranted contentions but never says what the case as a whole establishes. What has the speech left undone?", ["Nothing, because two well-warranted contentions are a complete constructive", "It has not told the judge what the contentions add up to for the case", "It has failed to provide the evidence that both contentions required", "It has not pre-empted the responses the other side is most likely to give"], "It has not told the judge what the contentions add up to for the case", "Two good arguments are not automatically one case.", "Contentions support a case, and the speech should say what they establish together — otherwise the judge has two arguments and has to assemble the case themselves. The warrants were fine, evidence is a separate question, and pre-empting is not the constructive's job.", "Constructive")
        ],
        [
          q("You are writing a first constructive. Which plan best matches what that speech is for?", ["Open by answering the two arguments the other side used in their previous round", "Order the contentions by what depends on what, develop each, then say what they establish", "Present every argument your side has, briefly, so that nothing is left out of the round", "Lead with the comparison you want the judge to make at the very end of the debate"], "Order the contentions by what depends on what, develop each, then say what they establish", "Match the plan to the speech's job: establishing your case.", "This plan establishes the case, orders it around real dependencies, gives each contention development, and closes on what was shown. Answering last round's arguments responds to nothing in this one, listing everything trades depth for coverage, and leading with the final comparison asserts a conclusion the round has not earned.", "Constructive"),
          q("A judge says your constructive contained good arguments but they could not tell what your case was. Which change addresses that directly?", ["Add more evidence to each contention so the arguments carry more weight", "Speak more slowly so the judge has more time to write the arguments down", "Give each contention a boundary and state what they establish together", "Move the strongest contention to the start so it makes a better impression"], "Give each contention a boundary and state what they establish together", "The arguments were good — so the gap is in the composition, not the content.", "The judge accepted the arguments and still could not see a case, which points at composition: separable contentions and a statement of what they add up to. More evidence, slower delivery and reordering all leave the same gap, because none of them tells the judge how the pieces form one case.", "Constructive")
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
    description: "Read the topic, clarify what needs clarifying, and frame distinct reasons.",
    category: "Parliamentary debate",
    order: 9,
    lesson: {
      title: "Read the topic and frame your reasons",
      slug: "debate-case-topic-definitions-lesson",
      summary: "Read a topic accurately, clarify only what needs it, and frame reasons that answer it.",
      estimatedMinutes: 8,
      content: lesson(
        "Read the debate topic you are given, clarify only the wording that would otherwise send the two sides in different directions, and frame distinct reasons that answer it.",
        "Every debate starts from a topic, and both sides are arguing about the same one. Before you write anything, read it as it stands and say it back in your own words — not what you assume it means, not the version you would rather argue, the words that are actually there. Some of those words do more work than others. A word needs clarifying when two reasonable readers could take it in materially different ways AND that difference would change what the debate is about. That is a narrower test than it sounds, because important is not the same as ambiguous in a way that matters. In a topic about banning single-use plastics, ban carries the weight of the topic, but its ordinary meaning is stable enough to argue from; single-use plastics has no agreed membership, and one reader pictures bags and straws while another pictures every piece of packaging in the shop. Those are two different debates, and the two sides will argue past each other unless someone settles it. Clarify that one. Leave the rest alone: clarifying a word nobody was going to misread spends time and hands the other side something to fight about for no gain. A clarification is doing its job when it makes the topic easier to argue about, and it fails in two ways worth knowing by name. The first is that it DRIFTS — it quietly describes something the topic did not say, so the debate that follows is not the debate that was set. Clarify single-use plastics as all plastic packaging, and single-use has gone: the words you were given covered cups and cutlery, and the debate is now about the wrapping on everything in the shop. Drift is easy to miss because a drifting clarification can be perfectly clear. Being precise is not the same as being faithful to the words you were given. The second is that it DECIDES — it is built so extreme, or so convenient, that the answer falls out of the wording rather than out of anyone's reasons. Here is the part that is easy to miss. Whether a clarification is good is a separate question from whether the thing it describes is a good idea. If someone clarifies ban as a total worldwide prohibition, immediately, with no exceptions, the natural reply is that such a ban would be unworkable — and that reply has already accepted the clarification and started arguing on the ground it chose. The fault is in the clarification, not in the policy, and saying so is a different move from arguing against it. Then come your reasons. A contention is a reason your side should win on this topic, and a reason has to say something. Student wellbeing is a heading, not a reason; requiring the course leaves students less likely to fall into avoidable debt is a reason, because someone can disagree with it. Two of them are worth having only if they are genuinely two: they are distinct when the objection that defeats one leaves the other standing. And any reason, however true, has to answer this topic — ask what part of the topic it helps establish, and if there is no answer, it is a change of subject rather than a contention.",
        "A topic that was never read carefully produces two speeches that never meet: each side argues its own version, and the judge is left choosing between them with no shared question. Getting this right is cheap at the start and expensive later, because every reason you write afterwards is attached to a topic you might not actually be arguing.",
        ["Read the topic and say it back in your own words, adding nothing that is not there.", "Clarify only the wording whose reasonable readings would change what the debate is about.", "Write each reason as a claim someone could disagree with, not as a heading.", "Check each reason: does it answer this topic, and would a different objection be needed to defeat it?"],
        {
          prompt: "Topic: schools should be required to teach a personal finance course. Work through it — which word needs clarifying, which does not, and what reasons follow?",
          weakAnswer: "Key term: schools means places of education. Contentions: money skills, and career readiness.",
          strongAnswer: "Read it back: schools would have to teach a course in personal finance — required, not merely offered. Words considered: schools is ordinary and nobody will misread it, so leave it alone; personal finance could mean anything from a budgeting unit to trading shares, and those are different debates, so that is the one to clarify. A clarification that decides rather than describes: personal finance means the money skills every adult obviously needs — that makes the case true by wording and names nothing anyone could check. Better: personal finance means budgeting, credit, and basic tax. Reasons that follow: first, students taught how credit works take on less debt they did not understand; second, a required course reaches the students whose families never covered it, which an optional one does not. Now run the distinctness check on that pair, and it fails: the objection that this teaching does not change what anyone actually does defeats the first, and it defeats the second too, because reaching students with teaching that changes nothing is worth nothing. So the second is replaced by one the same objection leaves standing: a required course puts a teacher in front of every student, which is how a school notices the ones already in trouble. A third that failed and was repaired: financial skills matter was a heading, not a reason, and became the course changes what students do with money after leaving, not only what they know. One dropped: school buildings need repair is true and is about schools, but it helps establish no part of this topic.",
          whyItWorks: "The weak answer clarifies the one word nobody would have misread, leaves the one that could send the two sides in different directions, and then offers two headings instead of two reasons. The strong answer shows the choosing rather than the result: a word rejected for clarification and why, a clarification rejected for deciding the debate instead of describing it, a pair of reasons that failed the distinctness check and the replacement that passes it, one reason repaired from a heading, and one dropped for answering a different question. Note what the distinctness check is not: the first pair was not wrong, and both halves were real reasons. They were one reason twice over, because a single objection took both down."
        },
        q("What makes a word in the topic worth clarifying?", ["Two reasonable readers would take it differently, and that changes what the debate is about", "It is the most important word in the topic, and the whole case depends on how it lands", "It has more than one entry in the dictionary, so its meaning is not fixed in advance", "The other side is likely to attack it, so it is safer to settle the wording first"], "Two reasonable readers would take it differently, and that changes what the debate is about", "Both halves of the test have to hold.", "Importance is not the test, and neither is having several dictionary entries: a word can carry the weight of the topic and still be read the same way by everyone. Clarify where the readings diverge AND the divergence changes what is being argued.", "Clarify what matters"),
        [
          q("Topic: employers should be required to publish salary ranges in job adverts. Which wording most needs clarifying?", ["Employers — the topic does not say whether it means the company or the hiring manager who writes the advert", "Job adverts — some are posted online and some are pinned up in a window", "Required — the topic does not say which year the requirement would begin", "Salary ranges — a published pay band and a total package including bonuses are different things to publish"], "Salary ranges — a published pay band and a total package including bonuses are different things to publish", "Which difference changes what the two sides are arguing about?", "Every option names a real vagueness, which is the point: vagueness alone is not the test. Who writes the advert, where it appears and when the rule starts all leave the argument in much the same place. What counts as a salary range changes what employers would actually have to publish, so it changes the debate itself.", "Term selection"),
          q("Topic: the council should ban e-scooters from pavements. A speaker clarifies: \"By pavements we mean all public places where people walk, including parks and shopping centres.\" What is wrong with it?", ["It decides — the wording settles the argument before either side has given a reason", "It drifts — the topic said pavements, and parks and shopping centres are not pavements", "It is too detailed to argue about, and that level of detail narrows a debate too far", "Nothing is wrong: naming the exact places is what a clarification is for"], "It drifts — the topic said pavements, and parks and shopping centres are not pavements", "Compare it with the words the topic actually used.", "It is perfectly clear, which is what makes it easy to miss. Clear is not the same as faithful. The topic covered pavements; this covers places nobody was arguing about, so the debate that follows is a different one. Nothing in the wording makes either side automatically right, so it has not decided anything — it has drifted.", "Drift"),
          q("Topic: the council should fund free swimming lessons for primary schools. Which of these is a reason rather than a heading?", ["Child safety is what this really comes down to", "Public health and wellbeing are at stake here", "The cost to the council has to be considered", "Children who have had lessons are less likely to drown in open water later"], "Children who have had lessons are less likely to drown in open water later", "Which one could somebody disagree with?", "A reason says something that could be false. Child safety, public health and cost are subjects dressed up as sentences — each could be used by either side, which is the giveaway, and none of them states anything to disagree with. The drowning claim names what the lessons do and invites the disagreement a debate runs on.", "Reasons, not headings"),
          q("Same topic. Which reason is true but does not answer it?", ["Lessons in school hours reach children whose families never take them swimming", "Children taught to swim young keep the skill for the rest of their lives", "The council's swimming instructors are paid less than instructors in neighbouring towns", "A council that pays for lessons can require properly qualified instructors"], "The council's swimming instructors are paid less than instructors in neighbouring towns", "Ask what part of the topic each one helps establish.", "Instructor pay may well be too low, and the claim is about council swimming instructors, so it looks close enough to belong — another option mentions instructors too. Ask what part of the topic it helps establish and there is no answer: it says nothing about whether funding lessons for primary schools is worth doing. Sharing a subject is not the same as bearing on the question.", "Relevance")
        ],
        [
          q("Topic: the town should require restaurants to show calorie counts on menus. Which pair of reasons is genuinely two reasons?", ["Diners order fewer calories when the number is in front of them, and people make better choices once they can see what is actually in the food", "Diners order fewer calories when the number is in front of them, and kitchens quietly reformulate dishes once the number has to be printed", "Calorie labelling is good for public health, and it is good for consumers too", "Diners order fewer calories when the number is in front of them, and families spend less on eating out once they can compare dishes"], "Diners order fewer calories when the number is in front of them, and kitchens quietly reformulate dishes once the number has to be printed", "Find an objection that defeats one of the pair and see whether the other survives it.", "Take the objection that diners ignore the numbers. It defeats the ordering claim, and in three of these pairs it defeats the partner too. One of those is the hard case: spending less on eating out sounds like a different job from ordering fewer calories, but both need someone to read the number, so one objection takes both down. The reformulation claim is still standing afterwards — a kitchen changes the recipe whether or not anyone reads the number — which is what makes that pair two reasons rather than one said twice. All four pairs argue the same side: distinctness is about whether two reasons do different jobs, not about disagreeing with each other.", "Distinctness"),
          q("Topic: the city should ban cars from the town centre. A speaker clarifies the ban as \"no car may enter at any hour, with no exception for deliveries, residents or emergencies\". Their opponent answers: \"That would be unworkable — the shops could not be supplied.\" What has gone wrong?", ["The clarification drifts from the topic, and the answer is right to call the plan unworkable as written", "The clarification is too narrow to cover the topic, and the answer widens it back out again", "The clarification decides the debate by its wording, and the answer argues the plan instead of the wording", "The clarification names a word that needed no clarifying, and the answer simply repeats it back"], "The clarification decides the debate by its wording, and the answer argues the plan instead of the wording", "Look at what the answer has already accepted.", "No exception for deliveries or emergencies is built so extreme that the case falls out of the wording rather than out of anyone's reasons — that is deciding, and not drifting, because nothing has been swapped for something the topic did not say. The answer then treats that wording as settled and argues that the plan is bad, which concedes the ground it was handed. Whether a clarification is good is a separate question from whether the thing it describes is a good idea, and objecting to the wording is a different move from arguing against the plan.", "Clarification versus merit")
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
