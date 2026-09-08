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
    description: "Judge what a piece of evidence actually supports, and what it leaves unproven.",
    category: "Debate foundations",
    order: 10,
    lesson: {
      title: "Judge the evidence",
      slug: "debate-evidence-evaluation-lesson",
      summary: "Say exactly what a piece of evidence establishes, what it does not, and use the same questions when two pieces conflict.",
      estimatedMinutes: 11,
      content: lesson(
        "Evaluate what a piece of evidence actually supports, identify what it leaves unproven, and use the same questions to compare competing evidence.",
        "In a round, evidence is anything offered in support of a claim that is not simply the claim said again: a number, a study, an expert's statement, an example, an event. A claim with evidence behind it is not automatically proved. What evidence does is give the judge a reason, and the size of that reason is what you are judging.\n\nThe judgment has one shape, and it starts from the claim rather than from the evidence. Ask what would have to be shown for the claim to hold. Then say what the evidence actually shows: what was measured or observed, in whom, over what period, compared with what. Then ask whether that connects to what the claim needed, and how much of the claim it covers. That connection is the warrant, the reasoning that says why this evidence supports this claim; the evidence itself never states it. Whatever is left over is unproven, and saying so, in plain words, is the move.\n\nYou judge evidence as it is described in the round, taking it as true, and you show how far it reaches: you do not have to prove it false, and you do not have to look anything up. How to say the reasoning that connects evidence to a claim is the Claim, Warrant, Impact lesson's job; this lesson is about judging how much support the evidence actually gives.",
        "Rounds are full of confident citations, from both sides. The debater who can say exactly what a piece of evidence establishes, and exactly what it does not, is the one the judge can follow. When the other side's conclusion goes further than their evidence, you can name the gap; when your own evidence is smaller than your claim, you can size the claim to fit before anyone else does it for you.",
        [
          "Restate the claim in one sentence, and say what would have to be shown for it to hold.",
          "Say what the evidence actually shows: what was measured or observed, in whom, over what period, compared with what.",
          "Check the connection: is it about what the claim needed, or about something nearby?",
          "Check the size: how much of the claim does it cover, and is the claim broader than the evidence?",
          "Say what remains unproven: grant what the evidence establishes, name the gap, and say what would close it."
        ],
        {
          prompt: "Claim: removing library late fees gets more books returned on time. Evidence offered: return rates were tracked for a year at two similar libraries; the one that removed its fees saw on-time returns rise from 71 to 78 percent, while the other, which kept fees, stayed at 72. Evaluate the evidence.",
          weakAnswer: "This is strong evidence. It is real data, not opinion, it has a comparison, and returns went up. The claim is proved.",
          strongAnswer: "What it shows: at one library, over one year, on-time returns rose seven points after fees were removed, while a similar library that kept its fees did not move. The comparison rules out a year in which everyone happened to return books more promptly; it does not rule out something else changing at that library in the same year, so the fee change is the likeliest explanation, not a proven one. What it does not show: that the same would happen at other libraries, because this is one pair; whether the rise lasts beyond a year; anything about libraries unlike these two. What is still needed: a reason to think the libraries in the claim are like this one. So the evidence supports the claim for libraries like this one, and the claim as stated, about libraries in general, is still bigger than its evidence.",
          whyItWorks: "The first impression stops at real data with a comparison, which is the right first thing to notice and the wrong place to stop. The evaluation says what was measured, in whom, over what period, against what; grants exactly that; and names what is left. The same questions settle a comparison. Set this evidence beside a survey in which members say they would return books on time without fees: that survey is about intentions, not returns, so it fits the topic and not the claim, and the tracked returns deserve more confidence for a reason you can state."
        },
        q(
          "Claim: the gym renovation improved student fitness. Evidence: a survey shows students like the new gym. What is the problem with this evidence?",
          [
            "It was taken after the renovation, not before it, so the fitness baseline is missing",
            "It asks students who disliked the old gym, not neutral ones, and they praise any change",
            "It surveyed the students who use the gym most, not everyone, so the sample is skewed",
            "It measures enjoyment of the facility, not fitness itself, so the wrong thing is measured"
          ],
          "It measures enjoyment of the facility, not fitness itself, so the wrong thing is measured",
          "Compare what was measured with what is claimed.",
          "Credible evidence can still fail to support the specific claim. Liking the gym is real information about enjoyment, and adding a baseline, correcting for warmer answers, or choosing the sample better would not turn it into information about fitness. The mismatch is in what was measured, not in how well it was measured.",
          "Evidence"
        ),
        [
          q(
            "Neighbourhoods with more streetlights have less litter. A speaker concludes that streetlights prevent litter. What should a careful debater say?",
            [
              "Well-kept areas may get both lights and low litter, so the cause is not yet shown",
              "The same pattern holds across many neighbourhoods at once, so the conclusion is well supported",
              "Litter counts may move with the season, so the figures are not yet conclusive either way",
              "The link is probably a real cause, provided litter was counted the same way in each neighbourhood"
            ],
            "Well-kept areas may get both lights and low litter, so the cause is not yet shown",
            "Two things appearing together is not yet one causing the other.",
            "The association is real evidence, but well-kept neighbourhoods may get both the lights and the lower litter. Breadth does not fix that: a pattern repeated across many places is still a pattern, not a cause. Neither does a longer window, and consistent counting would only confirm the pattern, not explain it. A comparison that separates upkeep from lighting would deal with that explanation; nothing else offered here does.",
            "Evidence"
          ),
          q(
            "Two reports on a teen curfew disagree. A group campaigning for curfews describes one town where things improved. A body with no stake in the outcome looked at forty towns, set out how it counted, and found mixed results. Which deserves more confidence, and why?",
            [
              "The review, because a mixed finding sounds honest and a confident one sounds like selling",
              "The campaign report, because one documented success is more concrete than an averaged review",
              "The review, because its method is on record and the campaign report\u2019s is not",
              "Neither on its own, because that town is probably among the forty, which came out mixed"
            ],
            "The review, because its method is on record and the campaign report\u2019s is not",
            "Ask the same questions of both, rather than picking a side or a tone.",
            "Disagreement is where evaluation starts. A method that is set out can be examined; the campaign report gave no method, so from what was said its case cannot be, and one case is one case however concrete it feels, so concreteness is not the answer to an averaged review. Preferring the review because a mixed finding sounds honest is choosing by tone, not by method. Whether the improved town is among the forty is a guess the stem gives no basis for, and it would not change which report can be examined.",
            "Evidence"
          )
        ],
        [
          q(
            "Claim: a reading app doubled students' reading skill. Evidence: the app company surveyed volunteer users, who reported big improvement. What is the strongest evaluation?",
            [
              "It is not worth much, because the app company is judging its very own product",
              "It only shows that some volunteers felt better, not that their skill has truly doubled",
              "It is weak mainly because far too few users were surveyed to say very much",
              "It would prove the doubling rather than felt gains if outsiders repeated the same survey"
            ],
            "It only shows that some volunteers felt better, not that their skill has truly doubled",
            "Grant what it establishes, then name what it does not reach.",
            "Take the evidence as true: some volunteers told the seller they felt they improved. That establishes something, so throwing it out because of who gathered it is rejection by source rather than evaluation. Nothing in the stem gives a sample size, so smallness is a guess. An independent group running the same survey would still be collecting self-report from volunteers. The gap is between felt improvement and a measured doubling, and naming that gap is the evaluation.",
            "Evidence"
          )
        ],
        {
          teachingSections: [
            {
              heading: "What evidence proves, and how big a claim it can carry",
              body: "A piece of evidence proves what it observed, about the people or things it observed, over the period it observed them, compared with whatever it compared them to, and nothing broader. That one rule does most of the work. A study that measured how many people signed up for a programme tells you about sign-ups, not about whether the programme worked. A survey that asked people what they would do tells you about intentions, and intentions and behaviour often part company.\n\nThe second question is size. Evidence from one case can support a claim about that case; it usually cannot, by itself, justify a broad claim about many cases. One town that improved after a curfew is evidence about that town. A claim about curfews in general needs many towns, or a group of towns chosen to stand for the rest, and a vivid story about one place is not many places however memorable it is. The same applies to who was asked: fifty thousand people recruited at one university are a great deal of information about one university.\n\nA few patterns recur often enough to know by sight. A result taken from a flattering start or end date shows less than the same measure over the whole period. Two things moving together is not one causing the other until the other explanations are dealt with; a comparison group is the usual tool, and it rules out only the explanations both groups share. Recency matters only relative to the claim: a figure is out of date when the claim is about now and the relevant facts have changed since, and not otherwise."
            },
            {
              heading: "Where it came from, and how far you can check it",
              body: "You are not a researcher, and the round does not need you to be one. You judge the evidence as it is described, from the speaker's own account of it and from what you can ask them. Three questions are enough. Does the person quoted know about this? Expertise is specific: a physicist on the minimum wage is a citizen with an opinion. Does anyone involved have a reason to want this result? An interest is a reason for extra scrutiny of how the result was produced, not a reason to throw the result away; industry-funded studies are sometimes right. And can the method be examined? When the speaker cannot say who was studied or how the result was reached, you cannot evaluate how it was produced, and that limits how much confidence the evidence deserves next to a result whose method is open. The commonest case is the barest: \u201cstudies show\u201d with nothing behind it. That is a claim still waiting for its evidence, and the right move is to ask what the studies measured, in whom, and compared with what.\n\nOne more thing to know by sight: repeating the same underlying source does not create independent corroboration. Three articles that all cite one survey are one survey, reported three times. A single source can still contain several distinct findings relevant to different claims; what it cannot do is agree with itself."
            },
            {
              heading: "What it does not prove, and how to say so",
              body: "Most evidence in a round is partly good. The useful verdict is rarely accept or reject; it is how far this reaches. Keep the source's finding and the debater's claim separate: what the study found is one sentence, what the debater claims is another, and the gap between them is the evaluation.\n\nSo the move is grant and gap. Take the evidence as true. Say what it establishes, and concede that much out loud. Then name what remains unproven: even if that is right, it shows this, not that. And size the claim to fit: a claim that outruns its evidence is rescued by shrinking it, so \u201cremoving fees gets more books returned on time\u201d becomes \u201clibraries like this one can expect more on-time returns after removing fees\u201d, which the evidence supports.\n\nThe same questions settle a comparison between two pieces of evidence that disagree. Ask each what it measured, in whom, over what period, against what, and how it was reached; do not decide by which is newer, by which is a number and which a story, by which sounds more official, or by whose finding you like. Evidence can be relevant and weak, strong-looking and about the wrong thing, or good as far as it goes and not far enough. Say which, and why."
            }
          ],
          misconception: {
            wrongModel: "If the evidence is true, the argument is proved.",
            whyItFails: "True and supports-this-claim are two different questions. A true fact about something nearby proves nothing about the claim in front of you, and a true fact about the right thing can be far smaller than the claim built on it. Evidence that is entirely true can still leave most of a claim unproven.",
            betterModel: "Take the evidence as true and ask how far it reaches. The argument is proved as far as the evidence reaches, and no further; the rest is still a claim."
          },
          commonMistakes: [
            {
              mistake: "Citing evidence that is about the topic but not about the claim.",
              whyItFails: "A survey about how safe people feel, offered for a claim about the crime rate, is true, relevant to the subject, and proves nothing about the claim. Nearby is not on target.",
              fix: "Before you use or accept evidence, say in one sentence what the claim needs shown, and check the evidence against that sentence."
            },
            {
              mistake: "Treating evidence that supports part of a claim as if it supported all of it.",
              whyItFails: "Some improvement is not doubled, and one street is not the network. The unsupported part is still a claim.",
              fix: "Grant the part the evidence establishes, and name the part it does not reach."
            },
            {
              mistake: "Treating one example as proof of a general claim.",
              whyItFails: "A single case can support a claim about that case. A vivid story feels like proof of a pattern and is evidence of one instance.",
              fix: "Match the evidence to the size of the claim: a claim about many needs many, or a group chosen to stand for the rest."
            },
            {
              mistake: "Using a strong-sounding number without saying what it measured.",
              whyItFails: "A figure carries only what was counted. Sign-ups are not results, intentions are not behaviour, and a percentage of volunteers is a percentage of volunteers.",
              fix: "Say what the number counts, in whom, over what period, before saying what it proves."
            },
            {
              mistake: "Confusing an impressive source with support for the claim.",
              whyItFails: "A credible, independent, expert source can still be quoted on the wrong question, or for a conclusion its finding does not reach. Who said it and whether it supports the claim are separate questions.",
              fix: "Ask the source questions and the fit questions separately, and give the evidence credit on each for its own reasons."
            }
          ],
          scaffoldedTry: {
            prompt: "Claim: this city's free bus fares have cut car traffic. Evidence offered: on the first Saturday of free fares, traffic on the main shopping street was about a third lighter than on the Saturday before. Evaluate the evidence. Say what it shows, what it does not yet establish, and what would be needed to carry the claim as stated. Take it as true; you are judging how far it reaches.",
            frame: "The evidence shows ___. It does not yet establish ___. To carry the claim we would need ___.",
            slots: ["shows", "does not yet establish", "would need"]
          }
        }
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Signposting",
    slug: "debate-signposting",
    description: "Say where each answer belongs, so the judge can follow the speech and record it.",
    category: "Debate foundations",
    order: 2,
    lesson: {
      title: "Guide the judge through your speech",
      slug: "debate-signposting-lesson",
      summary: "Name the argument each answer is aimed at, so the judge records it where it belongs.",
      estimatedMinutes: 11,
      content: lesson(
        "Tell the judge which argument you are on before you answer it, so every answer lands where it belongs.",
        "Signposting means telling the judge where you are in your speech. Before you answer an argument, you say which one.\n\nHere is what it sounds like in a real speech:\n\n\"On their cost argument: the plan uses time that is already in the timetable. On their safety evidence: their study looked at one school in one year. Now back to our own attendance point.\"\n\nEach of those openings does one job. It tells the judge which argument you are about to talk about, before the reason arrives.\n\nWhy does that matter? A judge is holding several arguments in their head at once, and most keep separate notes for each one. The judge writes your answer wherever you point it. A judge who keeps no notes still has to work out which argument you mean.\n\nSo before every answer, say the argument it is answering. Say it again each time you move to a new one.\n\nName the argument itself, not its number and not the speaker. \"On their cost argument\" works. \"On their second point\" only works if the judge numbered things the way you did, and you cannot know that.\n\nAny words will do, as long as they name the argument. Then keep using the same name for it every time you come back.\n\n\"Moving on\" or \"another thing\" tells the judge that something changed, but not where you went.\n\nIn a speech that answers the other side, you usually start with a ROADMAP: a quick opening that tells the judge what is coming and in what order. \"Three answers: on cost, on their safety evidence, and on the timeline.\" Now the judge knows how many places to look.\n\nWhat a side says comes in sizes. At the top is an AREA, a big heading like school safety. In this lesson, an area is what debaters often call a contention. Inside an area sit the ARGUMENTS that hold it up, and inside each argument sit the INNER CLAIMS it rests on.\n\nName the piece your answer is really about. If you are answering one claim inside their lighting argument, say that claim, not the whole area.\n\nNo word owns a size: cost can be a whole area in one debate and a single argument in the next. Look at how the other side built their case before you label it.",
        "A judge who cannot place your answer may not count it at all. Two speakers can give the very same reasons, and the one who said where each answer belongs is the one whose answers get written down in the right place.",
        ["In a speech that answers the other side, open with a roadmap: say what your answers are on, in the order you will give them.", "Before each answer, name the argument it is on — the argument itself, not its number or its speaker.", "Use the same name for an argument every time you come back to it.", "Name the size you are aiming at: the whole area, one argument inside it, or one claim inside that argument."],
        {
          prompt: "You have three answers to give: one on cost, one on their safety evidence, and one on the timeline. Here is the same speech two ways.",
          weakAnswer: "The budget impact is small because the plan uses advisory time that is already scheduled. The study they cited surveyed one district in a single year, so it cannot support a general claim. The rollout is staged over three years, so schools are not absorbing all of it at once.",
          strongAnswer: "Three answers, on cost, on their safety evidence, and on the timeline. On cost: the budget impact is small because the plan uses advisory time that is already scheduled. On their safety evidence: the study they cited surveyed one district in a single year, so it cannot support a general claim. On the timeline: the rollout is staged over three years, so schools are not absorbing all of it at once.",
          whyItWorks: "Take the roadmap and the three labels out of the strong version and you get the weak version, word for word. The reasons did not change at all.\n\nWhat changed is where each answer gets written down. The judge hears \"on cost\" and is already on the cost argument before the reason arrives. The roadmap does one more thing: it tells the judge to expect three answers, so a missing one shows up as a gap.\n\nNotice what the labels do not do. They give no reason, and they do not say whether the answer is right. Signposting is not the argument. It only decides where the answer lands, not whether it was any good."
        },
        q(
          "The other side argued that the new bus route is unaffordable, and your next answer is aimed at that argument. Which opening tells the judge where the answer belongs?",
          ["Moving on to the next thing I want to say about the buses", "On their affordability argument, the one about the four-year cost figure", "Their affordability argument, the one about the four-year cost, is wrong", "That is enough about affordability, and there is more to come"],
          "On their affordability argument, the one about the four-year cost figure",
          "Your answer is aimed at their affordability argument, so the judge needs to know that before your reason arrives. Read each opening and ask where it leaves the judge.",
          "This one names the argument the answer is aimed at, so the judge knows where to put it before the reason arrives. Announcing a move names no destination; naming the argument and then ruling on it does the locating and adds a verdict a signpost is not there to give; and closing affordability opens nothing in its place.",
          "Signposting"
        ),
        [
          q(
            "Which of these openings is not a roadmap at all?",
            ["I have three answers before I come back to our own case", "I will take their funding argument, then their staffing argument", "Two answers on their evidence, then back to our own access argument", "I am going to show that funding is what decides this round"],
            "I am going to show that funding is what decides this round",
            "A roadmap describes the shape of the speech, not its conclusion.",
            "However confident it sounds, this states what the speaker intends to prove, and tells the judge nothing about how many places to look or in what order. A count with the answers themselves unnamed is a weak roadmap but still one, names in order do the same job as a count, and a count with names does both.",
            "Signposting"
          ),
          q(
            "You have just finished answering their cost argument. Your next answer is on their parking argument. Which line best tells the judge where you are moving to?",
            ["Moving on to my next point, which is a good one", "Now, secondly, there is another thing they said", "Now on their parking argument, about the school car park", "That deals with cost, so now for the rest of what they said"],
            "Now on their parking argument, about the school car park",
            "The judge needs a name, not just a signal that something changed.",
            "Only this one names the argument you are moving to, so the judge knows where to put what comes next. \"Moving on\" and \"secondly\" say that something changed but not where you went, and closing the cost answer without naming the next one leaves the judge waiting to find out.",
            "Signposting"
          ),
          q(
            "A speaker labels every answer clearly and gives no reason for any of them. What have the labels achieved?",
            ["Each answer is easier to follow, and being easy to follow is part of persuading a judge", "Each answer is written down under the right argument, and it is left unsupported", "Each answer is left unsupported, so the labels have achieved nothing at all", "Each answer reaches the judge, who writes it down once the speech has finished"],
            "Each answer is written down under the right argument, and it is left unsupported",
            "A label decides where an answer lands, and only that.",
            "The labels did their whole job: every answer is in the right place, and every answer is still a bare assertion. Being easy to follow is not what makes an answer good, the labels did achieve the placement, and placing answers after the speech is what happens when the labels are missing.",
            "Signposting"
          )
        ],
        [
        q(
          "They ran two arguments: that the fee puts families off, and that the refund scheme is hard to use. Your answer is that the refund form takes two minutes. You label it \"on their argument that the fee puts families off\". What is the result?",
          ["Your answer goes under the wrong argument, one it never touches, so the refund argument keeps none of it", "The judge works out from what the answer says that it belongs with the refund scheme, and files it there", "The label is too broad, because the answer is aimed at one claim rather than a whole argument", "The answer is wasted, because a two-minute form is never a big enough point to count"],
          "Your answer goes under the wrong argument, one it never touches, so the refund argument keeps none of it",
          "The label was exact. Ask which argument it pointed the judge to.",
          "A label can be exact and still point at the wrong argument. The judge puts your answer where you point, so it lands under the fee argument, where it answers nothing, and the refund argument gets none of it. It is not wasted: the same answer under the right label would have counted. The judge does not re-sort answers for you; the label was not too broad, it was aimed at the wrong argument; and how big the point is has nothing to do with it — a label decides where an answer lands, not whether it counts.",
          "Signposting"
        ),
        q(
          "In your roadmap you called it their enforcement argument. Coming back to it later you say you are now on the policing issue. What follows?",
          ["The judge hears the second name and writes that answer down under the first argument", "You lose the seconds it takes to explain that the two names mean the same thing", "The judge is left to work out for themselves that both names are one argument", "The roadmap you gave was inaccurate, and that is where the mismatch started"],
          "The judge is left to work out for themselves that both names are one argument",
          "The judge matches what you say against the name they already wrote down.",
          "A label works by matching the argument the judge already has, so a second name for one argument hands the judge the matching to do. Nothing in the label itself tells the judge that the two names are one argument, and the cost is not the two seconds of explaining \u2014 it is that the matching is now theirs to do. The roadmap was accurate when you gave it; what drifted is the name, which is exactly what a consistent one would have held.",
          "Signposting"
        )
        ],
        {
          scaffoldedTry: {
            prompt: "They ran one heading, school safety. Under it sit two arguments: that the crossings are dangerous, and that the lighting is poor. Their lighting argument rests on two claims — that the lamps sit too far apart, and that half of them are broken. Your answer is that the council replaced every broken lamp last month.",
            frame: "My answer is aimed at the ___ level. I would say: ___",
            slots: ["the level your answer is aimed at", "the label you would say"]
          }
        }
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
      summary: "Pick the reason their argument rests on, say why it fails, and tell the judge what their argument can no longer show.",
      estimatedMinutes: 12,
      content: lesson(
        "Answer one of the other side's arguments by picking the reason it rests on, saying why that reason fails, and telling the judge what their argument can no longer show.",
        "Refutation is how you answer an argument the other side made. Here is one, in four parts:\n\nThey say: school uniforms reduce bullying.\n\nBut: most bullying is about behaviour, not clothes.\n\nBecause: changing what students wear does not remove the arguments that start the bullying.\n\nTherefore: their uniform argument does not show the policy fixes the real problem.\n\nThat is a refutation. You said what they claimed, you answered it, you explained your answer, and you told the judge what changed.\n\nAn argument is a conclusion held up by reasons. Debaters call each of those reasons a SUPPORT. Refuting means taking one support away and saying what the conclusion has lost. Just saying you disagree takes nothing away.\n\nQuick test: imagine the judge accepts everything you are about to say. Could the other side still make their argument, word for word? If yes, you have not refuted anything yet.",
        "A judge decides what is left standing at the end. If all you did was disagree, their argument is still standing, because nobody gave the judge a reason to drop it.",
        ["Say what they claimed, in their words.", "Pick the support that their conclusion cannot do without, and that you can actually argue against.", "Give your answer to it, then give the reason your answer works.", "Say what their argument can no longer show. Then stop."],
        {
          prompt: "They argue: new apartment buildings must include parking, because otherwise new tenants will park on the residential streets, and streets full of parked cars are worse to live on.",
          weakAnswer: "They say required parking protects residents, but the street-parking worry is overstated, because residents would not really face the problem they describe. Therefore you should prefer our side: this city needs housing, and the parking rule stands in the way.",
          strongAnswer: "They say required parking protects residents, but the street-parking worry is overstated, because these buildings are a short walk from the rail line, and in buildings like that most tenants own no car. Therefore far fewer new cars compete for street space than their argument needs, so \"the streets fill up\" is no longer shown.",
          whyItWorks: "Both answers attack the same support, the step from new tenants to full streets, and that is the right one. Their other support, that full streets are worse to live on, is true and nobody will be argued out of it.\n\nThe weak because just repeats the but, so the judge has no new reason to believe it. Then its therefore walks off to talk about housing, and their support is still standing.\n\nThe strong because gives a reason the other side could argue with: near transit, fewer tenants own cars. Then it says what their argument has lost, and stops."
        },
        q(
          "Their argument: \u201cThe city should not make Third Street one-way. Delivery trucks make about 400 stops a week on that block. A one-way street would make them circle the block to reach the loading docks. So deliveries would take longer, and the shops that depend on them would lose business.\u201d Which support is worth attacking?",
          [
            "That delivery trucks make about 400 stops a week on that block of the street",
            "That the shops along that block depend on those deliveries to stay open",
            "That trucks would need to go right round the block before reaching the docks",
            "That shops losing business would be a bad thing to happen to the neighbourhood"
          ],
          "That trucks would need to go right round the block before reaching the docks",
          "Run both tests: does their conclusion need this support, and could you give the judge a reason to doubt it?",
          "Both halves have to pass. Take away the circling step and the argument reaches no delay and no lost business, however true everything else is \u2014 so it is necessary \u2014 and whether trucks would actually have to circle depends on which side of the block the docks sit on, which is a claim you can give the judge a reason to doubt. The 400-stops figure is the trap, and it is the most tempting option on the page: it is a specific number, so it looks checkable and beatable, and you may well be able to show it is wrong. Their argument does not need it. Circling costs time at 400 stops a week and at 150, so correcting the figure leaves the chain running and the conclusion standing \u2014 the same error as attacking an out-of-date cost figure in an argument about whether a service is worth its cost. That the shops depend on deliveries is necessary but undisputed, and that losing business would be bad is not in dispute either. Necessary is only half the test, and a number you can beat is not the same as a support their argument needs.",
          "Refutation"
        ),
        [
          q(
            "An opponent argues that a new bike lane will slow emergency vehicles. Which response\u2019s because actually explains something?",
            [
              "But emergency response will not get slower, because the delay they describe would not actually happen at all on a road with this much traffic and this kind of layout.",
              "But emergency response will not get slower, because the slowdown they are predicting is just not going to happen on this road, whatever they claim.",
              "But emergency response will not get slower, because the lane replaces on-street parking rather than a driving lane, so the road keeps the same number of through lanes.",
              "But emergency response will not get slower, because the worries they have raised about response times, while understandable, do not hold up when you look closely."
            ],
            "But emergency response will not get slower, because the lane replaces on-street parking rather than a driving lane, so the road keeps the same number of through lanes.",
            "Cover the words after because. Does the answer still mean the same thing?",
            "Cover the words after because in each one. Three of the four survive the cut with their meaning intact, which means those clauses explained nothing. \u201cIt would not actually happen\u201d and \u201cit does not hold up when you look closely\u201d are the objection said twice, and \u201cthe slowdown they are predicting is just not going to happen\u201d is the objection a third time with a confident tone on it, so there is still nothing for the other side to argue with. Naming a source of evidence is not the same as naming a mismatch in it: \u201ctheir study measured a different population than this plan affects\u201d would be a real because, because it says what the mismatch IS. Only the parking answer loses something when you cut it: parking removed rather than a driving lane, so the through-lane count is unchanged. That is a real reason \u2014 specific, checkable against the street plans, and something the other side can come back at.",
            "Refutation"
          )
        ],
        [
          q(
            "You have shown that their cost figure came from a much bigger project than this one. What does the last part of your refutation have to do?",
            [
              "Explain how your own side arrived at a more accurate figure for a project of this size",
              "Say what their argument can no longer show now that the figure does not apply",
              "Say that their whole cost case has collapsed now that this figure has been answered",
              "Restate the objection in stronger terms so the judge registers how serious the error is"
            ],
            "Say what their argument can no longer show now that the figure does not apply",
            "Think about the two ways the last part goes wrong.",
            "Report the damage: with the figure gone, their argument no longer shows that the proposal is unaffordable. That is the sentence a judge can write down and check. The closest wrong answer is the one that sounds strongest \u2014 saying their whole cost case has collapsed. Notice the scope: you answered one figure inside one argument, and their case for cost can rest on more than that one argument. Announcing the collapse of the case claims ground you did not take, and the first person who checks will find the rest of it standing and trust the rest of your speech less. Report the argument you actually damaged, not the case. Supplying your own better figure is useful work, but it is your case, and it leaves their support standing while you build yours. Restating the objection more forcefully adds volume, not reasoning \u2014 the objection had already landed; what was missing was what it did.",
            "Refutation"
          )
        ],
        {
          teachingSections: [
            { heading: "The four-part answer", body: "Every refutation has the same four parts.\n\nTHEY SAY: what they claimed. BUT: your answer. BECAUSE: why your answer works. THEREFORE: what that changes for their argument.\n\nMost beginners stop after BUT. The last two parts are where the answer earns anything." },
            { heading: "Why the because matters", body: "The because has to explain something. If it only repeats the but in different words, the judge has been given nothing new.\n\nTry the delete test. Cover the words after \"because\" and read what is left. If the answer means the same thing, the because did no work.\n\n\"Their evidence does not apply, because it is not relevant here\" fails the test. \"Their study measured a different group of people than this plan affects\" passes it, because the other side could argue back." },
            { heading: "Answer the real support", body: "An argument usually rests on several supports, and they are not all equal. Some hold the conclusion up. Some the other side would happily give away.\n\nAim at a support that does two things. First, their conclusion cannot survive without it. Second, you can actually give the judge a reason to doubt it.\n\nBeing right about a detail their argument does not need changes nothing. They can agree with you and lose nothing." },
            { heading: "Tell the judge what changed", body: "Finish by saying what their argument can no longer show. Which step no longer connects? What is now unproven, or smaller than they needed?\n\nSay what you actually took, not more. Taking out one support inside one argument is not the collapse of their whole case.\n\nThen stop. Do not turn to your own case. That is a different job, and it leaves their support standing." }
          ],
          revisionLadder: [
            { attempt: "They say the new stadium will strain city services, but that is not going to be a problem for the surrounding neighbourhoods.", diagnosis: "Right target, but it is only a denial. There is no because, so the judge is asked to take your word over theirs.", revision: "They say the new stadium will strain city services, but that strain only lands on event days, because the stadium sits in a business district that empties out on evenings and weekends, which is when events run. Therefore the year-round burden they describe does not arise." },
            { attempt: "They say later start times will hurt after-school jobs, but the change is too small to reach the hours students work, because most student shifts start after five and the bell would still ring before four. And that is one more reason our side is right.", diagnosis: "The because is real; the other side could check it. Then the answer walks off to your own case, and the judge never hears what happened to theirs.", revision: "They say later start times will hurt after-school jobs, but the change is too small to reach the hours students work, because most student shifts start after five and the bell would still ring before four. Therefore the clash their argument depends on does not happen for most working students." }
          ],
          misconception: { wrongModel: "Refutation means saying something against what the other side said. Sound confident, stay on their argument, and you have refuted it.", whyItFails: "Opposing them is a direction, not a reason. You can say something true about their argument and leave every support standing. The judge cannot drop an argument until someone says why it fails.", betterModel: "A refutation names one support, gives a reason it does not hold, and says what their argument can no longer show. If you cannot point to the support you took away, you objected. You did not refute." },
          commonMistakes: [
            { mistake: "An objection with no because.", whyItFails: "\"That will not happen\" is a bare claim against a reasoned one.", fix: "Ask \"because what?\" and say the answer out loud." },
            { mistake: "A because that just repeats the but.", whyItFails: "\"The risk is overstated, because it is not as big as they say\" is a reason-shaped sentence with no reason in it.", fix: "Run the delete test. If the because can go, replace it with something the other side could argue with." },
            { mistake: "Ending on your own case.", whyItFails: "Their support is still standing when you finish, because you never said what happened to it.", fix: "Keep the last sentence pointed at their argument: what is now unproven, or no longer follows?" }
          ],
          languageFrames: [
            { purpose: "Answer their argument", starters: ["They argue that {their claim}, but ___", "The step their argument depends on is ___, but ___", "That does not show ___, because ___"] },
            { purpose: "Give the reason", starters: ["The problem with that reasoning is ___", "That step fails because ___", "What they are assuming is ___, and it does not hold because ___"] },
            { purpose: "Say what changed", starters: ["Therefore their argument no longer shows ___", "Without that step, what is left of their argument is ___", "So the harm they described shrinks to ___"] }
          ],
          scaffoldedTry: {
            prompt: "Their argument: \"The school should replace its printed newspaper with an online edition. Printing costs the paper most of its budget, and once that money is freed up the staff can afford to send reporters to away games, so coverage gets better.\" Answer it. Pick the support their conclusion cannot do without, and that you can give the judge a reason to doubt. Then fill every blank yourself.",
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
        "Give the judge a rule for comparing impacts, built on a difference the two sides actually have — argue for that rule, then apply it to both.",
        "Weighing explains why one argument matters more than another. Magnitude, probability, timeframe, and reversibility are useful names for common comparison moves — the skill is making the comparison clear, not saying the lens words. Underneath any comparison sits a weighing standard, also called a weighing framework: a rule for deciding, stated so that it could be applied to either side's impact and not only to your own. \"A harm that is more likely should count for more\" is a standard, because the other side's impact can be tested against it too. \"Our harm is huge\" is not — there is nothing there for the other side to be measured by. A standard is something you argue for, not something you announce and assume, and the other side can argue for a different one; that disagreement is part of the debate. Putting yours on the table early matters for two reasons: the judge hears it while there are still speeches left in which it can be answered, and the comparison that comes later has something to be measured against instead of two sides asserting that their own impact is bigger. Stating the rule is not the comparison — you still have to show what each impact looks like under it.\n\nA rule only does work where the two impacts come out differently under it. \"A harm that is more likely should count for more\" is a perfectly good rule, and between two harms the round has agreed are about equally likely it decides nothing: the judge applies it, both sides come out the same, and the choice is still open. So the first move is not reaching for a comparison you like — it is finding a difference these two cases actually have, then building the rule on that difference and saying why that difference should control the decision. Both halves carry weight. A difference with no reason attached is a fact, not a rule; and a rule built on ground the round has made level hands the judge something to apply and nothing to conclude. There is no ranking to memorise here and no comparison that is always the right one — which difference should decide is itself something you argue for, out of what these two cases look like. The difference that separates your round may not have a familiar name at all.\n\nOften more than one difference is real, and they do not all run your way: theirs is the larger harm while ours is the one that is certain; ours lands first while theirs lasts longer. Do not present the round as though every comparison favours you — a judge who can see the difference you skipped trusts the ones you made less. Name what they win, then argue why the difference you are standing on should outrank it, and give the reason, because \"ours matters more\" is the claim and not yet the argument for it. Naming both differences and stopping is not weighing either: that leaves the judge holding two live comparisons and no basis for choosing between them, which is the position weighing exists to get out of.",
        "Judges often believe both sides have some truth. Weighing tells them which truth should decide the round. Without a rule for deciding, the last speeches turn into both sides insisting their own impact is bigger, and the judge falls back on whichever rule they personally happen to prefer. A rule you offered early and defended gives the judge something to apply — and gives the other side time to contest it, which is what makes it fair for the judge to use.",
        ["Find a difference the two impacts actually have — a comparison the two sides come out on differently.", "Say what rule you want the judge to decide by, in a form that could be applied to either side.", "Give a reason that rule fits this debate, and expect the other side to contest it.", "Identify both impacts and show what each one looks like under the rule.", "Where a second real difference runs their way, say so and argue why yours should still control.", "State the comparison the rule produces, and what it decides."],
        {
          prompt: "Side A argues an AI-literacy requirement improves student preparedness. Side B argues it costs class time. Here are two ways Side A could run the same comparison across a round.",
          weakAnswer: "[Final speech, and nowhere earlier] Decide this on what cannot be undone, because a mistake an institution can repair later is a smaller thing than one a person carries out the door. Lost class time is recoverable — the district adjusts the schedule once — while a student who leaves school unable to check what an AI system tells them carries that gap into work they do not get to redo. Under that rule, preparedness decides.",
          strongAnswer: "[First speech] Decide this on what cannot be undone, because a mistake an institution can repair later is a smaller thing than one a person carries out the door. [Final speech] Lost class time is recoverable — the district adjusts the schedule once — while a student who leaves school unable to check what an AI system tells them carries that gap into work they do not get to redo. Under that rule, preparedness decides.",
          whyItWorks: "Strip the speech labels and the two versions are word for word the same: the same rule, the same reason for it, and the same comparison. What moves is which speech the rule arrives in. In the strong version it is on the table from the first speech, so the other side still had speeches in which to argue for a different rule, and the judge is applying a rule that was open to challenge. In the weak version the rule appears for the first time beside the conclusion it is meant to justify, when nobody can answer it. The fix for the weak version is not to reorder this speech — it is to have given the rule in an earlier one."
        },
        q(
          "Which phrase is weighing?",
          ["Our impact is backed by three separate studies, and theirs by a single one", "Their impact would be serious for the families involved if it ever happened", "Ours reaches more people than theirs does, so ours is what should decide", "We answered every argument they made today, point by point"],
          "Ours reaches more people than theirs does, so ours is what should decide",
          "Weighing puts the two impacts side by side and says which one should settle the round.",
          "Only one of these puts the two impacts next to each other and says which should settle the round. Comparing whose evidence is stronger is a comparison, but of sources rather than of harms. Granting that their harm would be serious concedes without choosing. Reporting that you answered everything says nothing about which harm matters more. A comparison with a decision attached is where weighing starts; the rule behind the comparison, and the reason for that rule, are what the rest of this lesson adds.",
          "Weighing"
        ),
        [
          q(
            "A round on a town curfew: it might reduce late-night injuries, but it is unlikely to be enforced. Which sentence gives the judge a rule that could be applied to either side's impact?",
            ["Late-night injuries are a serious and well-documented harm for teenagers here.", "A harm that only lands if a policy is enforced should count for less than one that does not.", "Our side has produced more evidence on late-night injuries than the other side has managed to produce on enforcement.", "The curfew is going to reduce injuries by a measurable and meaningful amount."],
            "A harm that only lands if a policy is enforced should count for less than one that does not.",
            "A rule has to be usable on the other side's impact too, not only on yours.",
            "Only one of these could be turned on either side's impact. The others describe a harm, compare how much evidence each side has, or assert a result — none of them tells the judge how to choose once both harms are real.",
            "Weighing"
          ),
          q(
            "A city is deciding whether to close its late-night bus route. Both sides accept that the two harms are about equally likely and that neither arrives before the other, and nothing in the round establishes which harm is the larger of the two. Where the sides do differ: the people carrying their harm can arrange around it, and the people carrying ours cannot. Which line gives the judge a comparison that can actually separate the two sides?",
            ["Decide this on which harm is more likely to actually happen, because a judge should not hand the round to a harm that probably never arrives.", "Decide this on which harm arrives first, because a judge should act on the harm that is landing now rather than one still on its way.", "Decide this on which harm is larger, because size is what settles a comparison when the other differences between the sides are level.", "Decide this on whether the people carrying a harm can arrange around it, because a harm you can work around is a smaller thing than one you cannot."],
            "Decide this on whether the people carrying a harm can arrange around it, because a harm you can work around is a smaller thing than one you cannot.",
            "A rule only helps if the two sides come out differently under it.",
            "All four are real rules — either side's impact could be tested against each one, and each comes with a reason — and only one of them decides anything here. This round has already settled that the two harms are about equally likely and that neither arrives before the other, so the likelihood rule and the arrives-first rule leave the judge exactly where they started. The rule about which harm is larger cannot be applied at all, because nothing in this round establishes a difference in size; the failure there is not that size is a poor comparison, since size decides plenty of rounds, but that a ranking held whatever the round shows is a habit rather than an argument. Only the rule about whether the people carrying a harm can arrange around it rests on a difference this round has actually established, and it says why that difference should control. Notice where that difference came from: it has no familiar name, and it does not need one.",
            "Weighing"
          ),
          q(
            "Side A asks the judge to decide on which harm is more likely. Side B thinks reversibility is the better rule. What should Side B do?",
            ["Accept Side A's rule, since it was stated first and cannot be changed now.", "Ignore rules entirely and simply describe its own impact in more detail.", "Argue for reversibility and say why it fits this debate better than likelihood.", "Wait until the final speech so Side A has no chance to respond to the rule."],
            "Argue for reversibility and say why it fits this debate better than likelihood.",
            "A standard is argued for, not just announced — and either side can argue for one.",
            "A weighing standard is a claim like any other: the other side can contest it and offer a better one, with a reason. Accepting a rule you disagree with concedes the comparison, ignoring rules leaves the judge to pick their own, and holding a rule back until nobody can answer it makes it weaker, not stronger.",
            "Weighing"
          ),
          q(
            "You established early that harms already happening should count for more than harms that might happen later. The other side's harm is a projected budget shortfall in five years; yours is students going without meals now. Which sentence applies the rule you set?",
            ["Our impact is far more emotionally compelling than any budget projection is.", "A shortfall five years out may never arrive; students are missing meals now.", "Their budget projection is the kind that is almost always exaggerated; theirs is no exception.", "We should win because we established a weighing rule and the other side did not."],
            "A shortfall five years out may never arrive; students are missing meals now.",
            "Run both harms through the rule, not only your own.",
            "The correct answer tests both impacts against the standard already established and lets that standard produce the conclusion. The others appeal to emotion, dismiss the other side's harm without using the rule, or treat having a rule as a win by itself — a rule tells the judge how to decide, it does not decide for them.",
            "Weighing"
          )
        ],
        [
          q(
            "A state grant will pay either to clear an invasive weed out of a lake or to repair the lake's boat ramps, not both. Two things are settled by the end of the round: the harm the other side runs — boaters who cannot launch — reaches more people than yours does, and the harm you run — the weed spreading — is the one that grows every season it is left alone, while theirs is the same size whenever it is fixed. Which line does the most for a judge who still has to choose?",
            ["Ours is the harm that grows every season it is left alone, so the comparison goes to us, and the judge should decide this round on the spread of the weed rather than on the condition of the ramps.", "Their harm reaches more people and we grant it. Ours is the one that grows every season it is left alone, and that should decide, because a ramp costs the same to repair next year, and the weed does not.", "Every comparison here runs our way: ours is the harm that grows if it is left alone, ours is the one that reaches more people, and ours is the one that started first, so there is nothing for the judge to trade off.", "One difference favours each side, so the two cancel out and the impacts finish level; with the comparison a wash, the judge should decide this round on which side handled the other's arguments better."],
            "Their harm reaches more people and we grant it. Ours is the one that grows every season it is left alone, and that should decide, because a ramp costs the same to repair next year, and the weed does not.",
            "Both differences are real. The work is saying which one should control, and why.",
            "Real differences often point in different directions, and the judge still has to choose between them. The line that grants what the other side wins and then gives a reason the remaining difference should control is doing the weighing — that reason is the whole of it. The line that claims every comparison here runs the same way contradicts what this round settled, and a judge who can see the difference you skipped trusts the rest of your comparison less. The line that names its own advantage and stops leaves the judge holding two real differences and no reason to prefer either. The line that calls the split a wash hands the decision to something that is not an impact at all.",
            "Weighing"
          ),
          q(
            "A round on rewilding farmland. Side A's harm is species loss that cannot be reversed; Side B's harm is a temporary drop in local farm income. Early on, Side B asked the judge to decide on which harm affects more people day to day, and gave a reason. You speak for Side A, and from your first speech you asked the judge to decide on what cannot be undone. Which final-speech line is strongest?",
            ["The number of species that are at stake here is far larger than the number of farms that would be affected by this policy, so we should simply win this round on sheer scale.", "You should ignore their rule entirely, judge, because any rule that happens to favour the side that proposed it can never be a fair one to use.", "Both harms here are serious ones — so we would ask you to set the standards aside and decide this round on which team has spoken more clearly.", "Under everyday reach their harm wins — but in our first speech we asked for a different rule: a harm that ends leaves the county its choices, a permanent one does not."],
            "Under everyday reach their harm wins — but in our first speech we asked for a different rule: a harm that ends leaves the county its choices, a permanent one does not.",
            "Ask which line does the most work for a judge who still has to choose between two real harms.",
            "This is the hard case: the other side's rule does not favour you. Simply accepting it loses the comparison, and rejecting it because it is inconvenient is not an argument. The strongest line admits what their rule yields, then holds the judge to the rule you put up in your first speech and gives the reason for preferring it — which is what a weighing standard is, a claim either side can contest. The scale option reaches for a rule neither side ever argued for, the ignore-their-rule option rejects a standard for being convenient rather than for being wrong, and the spoke-more-clearly option abandons weighing altogether.",
            "Weighing"
          )
        ],
        {
          revisionLadder: [
            { attempt: "People come to that desk with forms they cannot finish on their own, and a staff member sits with them until it is done.", diagnosis: "This describes one impact and stops. The other side's harm — people who work days and cannot get through the door before closing — is not in the sentence at all, so a judge who already believes both sides has nothing here to choose with. A description of your own harm can be entirely true and change nothing. WHAT THE REVISION ADDS: both harms in the sentence, with one of them claimed to matter more — a comparison instead of a description.", revision: "The people who cannot finish those forms matter more in this round than the people who cannot get through the door before closing." },
            { attempt: "The people who cannot finish those forms matter more in this round than the people who cannot get through the door before closing.", diagnosis: "The two impacts are now side by side, but the comparison is only announced. The other side can say the mirror-image sentence with exactly as much behind it, and there is nothing here that could be run over their harm — only over ours. What the rule gets built on matters too: neither side disputes that either harm will happen, so a rule about which harm is more likely would have left the judge exactly where they started. WHAT THE REVISION ADDS: a rule stated so either side's harm could be tested against it, resting on a difference these two cases actually have, with a reason attached — and offered while speeches remain, so the other side can still argue for a different rule.", revision: "Decide this on whether the thing the harm blocks is something the person is required to do, because keeping someone from a task they have to complete is a bigger thing than keeping them from one they would have liked to." },
            { attempt: "Decide this on whether the thing the harm blocks is something the person is required to do, because keeping someone from a task they have to complete is a bigger thing than keeping them from one they would have liked to.", diagnosis: "The rule is doing no work yet. The judge has been handed a standard and still has to run it over the two harms unaided, which leaves the comparison exactly where it was. A rule that is never applied is one more thing said. WHAT THE REVISION ADDS: both impacts measured against the rule, so the rule produces the conclusion instead of the speaker asserting it.", revision: "Decide this on whether the thing the harm blocks is something the person is required to do, because keeping someone from a task they have to complete is a bigger thing than keeping them from one they would have liked to. A renewal form has a date on it and a penalty behind it; an evening hour at the shelves has neither." },
            { attempt: "Decide this on whether the thing the harm blocks is something the person is required to do, because keeping someone from a task they have to complete is a bigger thing than keeping them from one they would have liked to. A renewal form has a date on it and a penalty behind it; an evening hour at the shelves has neither.", diagnosis: "It works, and it goes quiet on the one difference the other side wins. Their harm lands the week the hours shrink; ours shows up months later, as deadlines pass. Skipping a difference the judge can see reads as having no answer for it, and the line also stops before telling the judge what to do with the comparison. WHAT THE REVISION ADDS: the difference that runs the other way is named instead of hidden, the reason one difference should outrank the other is argued rather than assumed, and the comparison ends in a decision.", revision: "On when the harms land they are ahead, and we will not pretend otherwise: shorter hours bite the week they start, and ours shows up months later as deadlines pass. But the rule we asked you for at the start of this round was whether the thing the harm blocks is something the person is required to do — a renewal form has a date on it and a penalty behind it, and an evening hour at the shelves has neither. On that rule the desk stays, late as our harm arrives." }
          ],
          languageFrames: [
            { purpose: "Set aside ground the round has made level, name the difference that actually separates the two harms, and turn it into a rule with a reason attached. This is an optional structure, not required wording — say it any way you like or not this way at all. The blank after \"because\" is the whole argument, and no pattern can fill it for you; nothing becomes true because a blank got filled in, and naming a kind of comparison is not the same as making one.", starters: ["Both harms are ___, so that cannot separate them. What does separate them is ___.", "Decide this on ___, because ___.", "We are asking you to choose on ___ rather than ___, because on ___ the two sides come out the same."] },
            { purpose: "Run both impacts through the rule so the rule produces the conclusion, and say what it decides. Optional structure only. The pattern is a container: what each impact actually looks like under the rule is work the frame does not do, and a filled-in container is not evidence that the comparison inside it is correct.", starters: ["Under that rule, their harm ___ while ours ___.", "Theirs ___. Ours ___. That is the difference the rule was asking about.", "If ___ is what decides, then ___."] },
            { purpose: "Concede the difference that genuinely runs the other way, then argue why the one you are standing on should outrank it. Optional again — the concession has to be true and the reason has to be argued, and the frame supplies neither. A filled-in frame with a weak reason inside it loses to a plain sentence with a strong one, whatever words either of them uses.", starters: ["On ___ they are ahead, and we grant it. It still should not decide, because ___.", "We lose the comparison on ___. We win it on ___, and that is the one that should decide, because ___."] }
          ],
          scaffoldedTry: {
            prompt: "Everything you need is below. Nothing here is yours to invent.\n\nTHE ROUND: a university is deciding whether to require all first-year students to live on campus. You are arguing against the requirement.\n\nOUR IMPACT: students who would have commuted from home cannot pay the housing charge, and do not enrol at all.\n\nTHEIR IMPACT: first-years who commute take part in less of the first year and are likelier to leave before finishing it.\n\nESTABLISHED IN THE ROUND, DISPUTED BY NEITHER SIDE:\n- The requirement either applies or it does not; the two harms cannot both be avoided.\n- Ours is certain: the university's own figures show the charge is more than those students can pay, and there is no waiver. Theirs needs a chain — a commuter has to disengage, then fall behind, then leave — and most commuters do none of that.\n- Both harms begin with the same entering class; neither arrives before the other.\n- Both fall on first-year students.\n- Both stop if the requirement is lifted; neither outlasts the policy.\n- Their harm would reach several hundred students; ours would reach a few dozen.\n\nTHE FIVE COMPARISONS AVAILABLE TO YOU: how likely each harm is / when each harm starts / who each harm falls on / how long each harm lasts / how many students each harm reaches.\n\nYOUR TASK: fill the four slots. Three of those five comparisons are settled as level by the facts above — a judge can apply them and still not know what to do. Of the two that are left, one runs your way and one runs theirs, and you have to handle both.",
            frame: "Decide this on ___, because it is where these two harms come out differently. The difference is ___. On ___ they are ahead, and we grant it. ___ \u2014 The frame is optional: a shape, not a script. Say it in your own words, or not in this shape at all. Filling in the blanks does not make what you put in them true, and no pattern can supply the reason \u2014 that has to come from the facts of this round.",
            slots: ["THE COMPARISON I AM ASKING THE JUDGE TO DECIDE ON", "THE DIFFERENCE IN THESE FACTS THAT MAKES THE TWO SIDES COME OUT DIFFERENTLY ON IT", "THE COMPARISON THEY WIN", "MY COMPARATIVE STATEMENT — both harms under my rule, ending in what the judge should do"]
          }
        }
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Answer Types",
    slug: "debate-answer-types",
    description: "Classify answers as defense, indict, turn, or offense, and choose the direction an answer needs to point.",
    category: "Debate responses",
    order: 11,
    lesson: {
      title: "Know what your answer does",
      slug: "debate-answer-types-lesson",
      summary: "Tell defense, indicts, turns and offense apart by what each accomplishes, and choose the direction your answer should point.",
      estimatedMinutes: 10,
      content: lesson(
        "Classify answers by what they do — defense or offense, and the named moves inside them, indict and turn — and choose a response direction that fits what needs to change about their argument.",
        "Before you ask whether an answer is good, ask what it would accomplish if it worked.\n\nEvery answer is classed one of two ways, by what it creates. A DEFENSIVE answer makes their argument count for less: if it succeeds, their argument is smaller, shakier, or gone, and nothing new counts for your side. An OFFENSIVE answer does a different job: if it succeeds, the judge has a reason to prefer your side that was not there before. That is the whole distinction, and it is about what the answer creates, not force. One answer can do more than one thing at once — a reversal usually stops their argument helping them as well as giving you a reason — and it is classed by the reason it creates.\n\nTwo of the four names sit inside those directions: an INDICT is a kind of defense, a TURN is a kind of offense. The refutation structure — they say, but, because, therefore — still tells you HOW to state any of them; this lesson is about WHAT KIND of answer you are making inside that structure. Turns also come in named varieties, which are the next lesson’s subject; here the skill is spotting the reversal.",
        "Judges vote for reasons. Defense is not the poor relation — a clean defensive answer is often exactly what a moment needs, and against an argument the other side has to win, taking it apart can be enough. What goes wrong is not choosing defense; it is choosing it without noticing. If every answer you make is defense and their argument is still standing, the judge is left holding their reason and none of yours.",
        ["Restate their argument in one sentence: what do they want the judge to accept?", "Suppose your answer works completely, and say what is then true about their argument.", "Read the direction: does their argument only count for less, or does something now count for your side?", "Name it — defense if only for less (an indict if you went after their evidence), offense if something counts for you (a turn if their own argument is what supplies it).", "Then run it the other way: what does the argument in front of you need, to count for less or to start counting for you?"],
        {
          prompt: "Topic: the city should turn a downtown parking lot into a public park. The opponent argues: shoppers will lose parking, so nearby businesses will lose customers. Two answers are on the table. A: their claim rests on a survey of what shop owners fear, not on any figures for what the shops actually took. B: in comparable projects the park brought shops more foot traffic than the parking spaces ever did. Say what each answer would accomplish, name it, and say what is still missing.",
          weakAnswer: "Both answers beat the business argument, so both are offense for our side. A goes hardest at their evidence, so A is the turn.",
          strongAnswer: "Start with what is open to attack: their claim runs on what owners fear, and fear is not takings. Answer A goes after that evidence — what it measured and what it did not. If A succeeds, the judge trusts the business claim less and the argument gets smaller; nothing about the park counts for us yet. That is defense, and because it is aimed at the evidence, an indict. Answer B takes the same worry — business — and shows it running the other way: if B succeeds, their own concern is a reason for the park. That is offense, and because their argument is what reversed, a turn. Calling A a turn is the misapplication to avoid: doubting a survey never made anyone prefer the park, and the word does not put a reason on our side.",
          whyItWorks: "The directions here came from one question — what is true in the round if this answer succeeds — and the names came from what each answer ran on, never from how forceful either sounds. What is still missing is the part this lesson does not do. Either answer can fail: B only wins that reversal if the foot-traffic comparison holds, and neither is finished until the reason is said out loud and their argument’s loss is stated. The names tell you what you are trying to accomplish; refutation is where you make it land."
        },
        q("The opponent argues your school recycling plan is too expensive. You answer: an existing county grant pays for the whole plan, so no school money is spent. Suppose that answer works completely. What kind of answer was it?", ["Defense \u2014 their cost reason is gone, and still nothing about recycling counts for your side", "Offense \u2014 the answer worked completely, so the judge now holds a reason to prefer recycling", "Turn \u2014 their own cost reason has been made to argue in favour of the recycling plan", "Indict \u2014 they never showed where their cost figures came from, so nothing counts for your side"], "Defense \u2014 their cost reason is gone, and still nothing about recycling counts for your side", "Say what is true once the answer succeeds, then read the direction.", "A completely successful answer can still be defense. Their reason for opposing the plan is gone, which is real work, but the judge has been given nothing to vote FOR: removing their reason is not supplying yours. Nothing was said about where their figures came from or how they were reached, so it is not an indict, and their cost reason is not made to argue for recycling, so it is not a turn.", "Answer Types"),
        [
          q("The opponent argues the new stadium will boost the local economy, citing a report. You answer: that report was paid for by the stadium\u2019s developer, and it counts spending that would have happened in town anyway. Suppose that answer succeeds. What has it done?", ["Indict \u2014 the report is trusted less and their economy reason counts for less than before", "Turn \u2014 showing who paid for the report makes their economy reason argue for your side", "Offense \u2014 the developer\u2019s stake in the outcome is itself a reason to reject the stadium", "Defense \u2014 the promised boost is smaller than claimed and their own figures are not questioned"], "Indict \u2014 the report is trusted less and their economy reason counts for less than before", "Two questions: which direction, and which part of their argument you went after.", "Their economy reason counts for less and nothing yet counts for your side, so the direction is defense; and because the answer goes after the evidence \u2014 who paid for it and what it counted \u2014 the named move is an indict. Doubting a report does not make the economy argue for you, so it is not a turn. The developer\u2019s stake is a reason to doubt the report, not a reason of your own to reject the stadium. And the answer does question their figures, so the last description is not what happened.", "Answer Types"),
          q("The opponent says school uniforms cut bullying, citing a small survey. You read a larger, better-designed study finding that uniforms slightly increase bullying. A teammate says: that is only defense, our study just cancels theirs. Is the teammate right?", ["No \u2014 bullying now argues for your side, so the answer counts for you and not only against them", "Yes \u2014 a study that answers their study can take their reason away but never build one for you", "No \u2014 the answer goes after how their survey was run, so it weakens the reason rather than cancels", "Yes \u2014 the better study makes their reason count for less, and that is the whole of what it does"], "No \u2014 bullying now argues for your side, so the answer counts for you and not only against them", "A finding that cancels and a finding that reverses are different outcomes.", "Direction is set by what the finding says. A study finding no effect would cancel their reason and leave bullying counting for nobody \u2014 defense. This study finds the effect runs the other way, so bullying is now a reason against uniforms and something counts for your side. Nothing here examines how their survey was run, so the answer is not an indict either.", "Answer Types")
        ],
        [
          q("The opponent argues that a new downtown bike lane will slow car traffic. Which answer uses their own argument to give the judge a reason to prefer the lane?", ["The lane replaces a parking lane rather than a driving lane, so car capacity is unchanged", "Their delay figure comes from a simulation of a six-lane arterial, not a street like this one", "The delay this lane causes is the traffic calming the adopted safety plan set out to achieve", "The lane would also give students at the high school a safe route for the morning ride"], "The delay this lane causes is the traffic calming the adopted safety plan set out to achieve", "All four are things a debater might say. Only one runs on their own argument.", "Walk them. The parking-lane answer denies the slowdown \u2014 defense. The simulation answer leaves the argument weaker and nothing counting for you, and it got there through their evidence \u2014 an indict, which is defense too. The safe route for students gives the judge a reason of its own, which is offense but not a reversal: their slowdown argument is untouched by it. Only the safety-plan answer takes the very effect they warned about and makes it argue for the lane.", "Answer Types")
        ],
        {
          teachingSections: [
            {
              heading: "Two directions, and the named move inside each",
              body: "Take one argument and answer it four ways. The opponent says: keeping the library open later will exhaust the staff.\n\n“The plan funds two new part-time posts, so nobody’s shift gets longer.” If that succeeds, the exhaustion argument is gone — and nothing about later hours counts for you yet. You removed their reason; you did not build one. That is DEFENSE, and among these four names it has no second one.\n\n“Their exhaustion figure comes from a staffing report on a city system ten times our size.” If that succeeds, the judge trusts the figure less and the argument counts for less. That is an INDICT: the answer goes after the evidence itself — who produced it, what it measured, how the result was reached — rather than the claim it was offered for.\n\n“Later hours would let people who work until six use the library at all.” If that succeeds, the judge has a reason to want later hours, and their exhaustion argument is untouched. That is OFFENSE, and among these four it too has no second name: a reason of your own, standing beside their argument rather than against it.\n\n“Evening shifts are the ones our staff ask for most, so later hours would give the very people they say would suffer the hours they have been asking for.” If that succeeds, staff welfare — the concern they raised — is a gain for your side rather than a cost, and their argument has stopped working for them at the same time. That is a TURN — the kind of offense in which their own argument is what reverses.\n\nFour answers, one argument, two directions."
            },
            {
              heading: "How to tell which one you made",
              body: "One question sets the direction: if this answer fully succeeds, what is true in the round? Not how strong it sounds, not how much evidence is behind it. Answer that and you know whether it is defense or offense. Then a second question gives you the named move, where there is one: what did the answer run on? Aimed at their evidence, on the defensive side, it is an indict; running on their own argument, on the offensive side, it is a turn.\n\nThree things look like the answer and are not. The first is success: an answer can work completely — the objection gone, nothing left of it — and still be defense, because removing their reason is not supplying yours. That is the mistake with the longest reach, since a total win on their argument feels like a win in the round.\n\nThe second is the quality of your evidence. Suppose your study is the better one; if what it finds is that their effect is not there, you have good defense. If it finds the effect runs the other way, their own concern now argues for you and you have a turn. Equally good evidence, opposite directions, because direction is set by what the finding does, not by how good it is.\n\nThe third is the part you attacked. An answer aimed at their evidence usually only weakens the argument, and that is an indict, which is defense. But aiming at the evidence does not settle the direction: if what you show about it makes their own argument point your way — their study actually found the opposite of what they read it for — then something counts for you, and what you have is a turn, not an indict.\n\nOne word to keep straight: refutation calls every load-bearing part of an argument a support, and any of them can be answered. Indict is narrower — the defensive answer aimed at the evidence itself. Denying a step in their reasoning is a real answer and often good defense; it is just not an indict."
            },
            {
              heading: "Choosing a direction, and what a name does not do",
              body: "The four terms are also useful before you have an answer. Look at the argument in front of you and ask what needs to change about it. Does it need to count for less? Then defense is the job, and if the weak point is the evidence, an indict is the shape. Or does something need to start counting for you, and could their own argument supply it? Then you are looking for offense, and for a turn in particular.\n\nMore than one direction is often available on the same argument, as the four library answers show. That is a choice, settled by what the argument is open to. What is never available is a direction the argument does not support: you cannot reverse an argument whose own terms never point your way.\n\nThe last thing is the most important. Classifying correctly is not refuting. “This is a turn” describes what your answer would accomplish; it is not a reason for the judge to accept it. The reason still has to be there — why the staff prefer evening shifts, and what that does to their argument. That part, the because and the therefore, belongs to the refutation lesson, and nothing here replaces it."
            }
          ],
          misconception: {
            wrongModel: "The strongest answer is automatically offense.",
            whyItFails: "Strength and direction are different questions. An answer can succeed completely — their objection gone, nothing left of it — and still leave the judge no reason to prefer your side. What made it strong is how well it worked; what makes it offense is where it points.",
            betterModel: "Classify by what becomes true if the answer succeeds: their argument counts for less, or something now counts for you."
          },
          commonMistakes: [
            {
              mistake: "Calling an answer offense because it landed hard.",
              whyItFails: "Force is how well an answer works, not where it points. A devastating attack on their evidence usually leaves the judge with less of their reason and none of yours.",
              fix: "Ask what is true in the round if the answer succeeds, and settle that before reaching for a name."
            },
            {
              mistake: "Naming the type from what the answer talks about rather than what it does.",
              whyItFails: "Two answers can both be about their cost figures and point opposite ways: one shows the figure is unreliable, the other shows what they are counting as a cost is a benefit to the very group their argument is meant to protect.",
              fix: "Take the direction from the outcome first, then ask whether a named move — indict or turn — describes how you got there."
            },
            {
              mistake: "Treating every answer aimed at evidence as an indict and stopping.",
              whyItFails: "Aiming at the evidence usually does give you an indict, and an indict is defense. But if what you show about it makes their own argument point your way, something now counts for you — that is a turn, and calling it an indict understates your own answer.",
              fix: "Run the outcome question even on the moves whose names you already know."
            },
            {
              mistake: "Assuming an argument has exactly one answer type available.",
              whyItFails: "The same argument can often be answered in more than one direction, and the flashiest name is not always the one the argument is open to.",
              fix: "Ask what needs to change about their argument, then choose the direction the argument actually supports."
            },
            {
              mistake: "Treating the name as the answer.",
              whyItFails: "Saying “that is a turn” describes what you hope the answer accomplishes and gives the judge no reason to believe it.",
              fix: "State the answer with its reason and say what their argument loses; let the name describe the move rather than carry it."
            }
          ],
          scaffoldedTry: {
            prompt: "The opponent argues: moving the farmers’ market to Sunday will cut its takings, because Saturday shoppers are already downtown. Your answer: the stallholders kept records at their old Sunday pitch, and their takings there beat every Saturday they have had here — the market takes more on a Sunday, not less.",
            frame: "If this answer succeeds, ___. That means ___. So this answer is ___.",
            slots: ["what is now true", "which direction that is", "the answer type, in one word"]
          }
        }
      )
    }
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Turn Mechanics",
    slug: "debate-turn-mechanics",
    description: "Split a causal argument into action, link, and impact, choose the answer each part supports, and test whether two answers, granted together, add up to a reason against your own side.",
    category: "Debate responses",
    order: 12,
    lesson: {
      title: "Turn the right part of the argument",
      slug: "debate-turn-mechanics-lesson",
      summary: "Split a causal argument into action, link, and impact; tell denials from reversals at each part; and test two answers against the outcome they are about.",
      estimatedMinutes: 10,
      content: lesson(
        "Split a causal argument into action, link, and impact; choose whether to deny, shrink, or reverse a part; and check that answers you run together do not add up to a reason against your own side.",
        "In the answer-types lesson you learned to sort answers by what they accomplish, and you met the turn — the reversal that makes an opponent’s own argument count for your side. You were promised that turns come in named varieties. This is that lesson, and the names depend on WHERE in the argument the reversal happens.\n\nStart with the argument. Your side proposes a skate park in Miller Park; the opponent answers that it will bring more teenagers into the neighborhood, and that more teenagers around is bad for residents. That is a chain with three parts. An ACTION: build the park. A LINK: the causal claim that the action produces an outcome, more teenagers around. An IMPACT: the value claim that the outcome is bad, noise and trouble. Almost every argument that predicts a consequence has that shape.\n\nArguments do not always arrive in three neat parts. “A skate park will ruin this neighborhood” is one clause doing all three jobs. Split it with three questions: what do they say we would do, what do they say it causes, and why is that supposed to be bad? If they never said the middle step, that gap is worth naming out loud. Some arguments have more steps in the middle than one, and the same questions apply at each of them.\n\nYou can answer the connection or the endpoint, and at either you can deny, shrink, or reverse. Four of those get names in this lesson, and they are not four strengths of one answer: they do different things.",
        "Often the honest choice is no turn at all: a clean no-link or a modest impact defense is frequently the stronger, safer play, exactly as the last lesson said about defense generally. One note on the words themselves. These labels travel with the idea, not the other way around. Public Forum opponents and judges use them; in many parliamentary rounds the judge will just call all of this refutation. If the vocabulary ever draws blank looks, drop the labels and keep the logic — what disappears, what shrinks, and what reverses is the same in every format.",
        ["Map their chain: what action, causing what outcome, and why is that outcome supposed to matter?", "Pick your target: the connection between action and outcome, or the endpoint where the outcome is called bad.", "Ask what is true if your answer fully succeeds: does that part disappear (a no-link), shrink (impact defense), or reverse (a link turn at the connection, an impact turn at the endpoint)?", "For a reversal, say what reverses and why the reversed result follows — and check that the result depends on your side rather than arriving either way.", "If you are making more than one answer, name the outcome each one is about, put them in comparable words, check whether those outcomes are the same on all four counts — and if they overlap only in part, run the last question on the part they share — grant them both, and ask whether both can stand without making your own side the thing that removes the good, or delivers the harm, that the other answer just named.", "If they cannot, keep the reversal you can win and let the other part take plain defense or silence."],
        {
          prompt: "Topic: the town should build a skate park in Miller Park. The opponent’s one argument: “The skate park will bring more teenagers into the neighborhood, and more teenagers around is bad for residents — noise and trouble.” Answer this single argument four ways — deny the connection, reverse the connection, shrink the endpoint, reverse the endpoint — then decide which of your answers may be run together.",
          weakAnswer: "Run all four at once: the park will not bring more teenagers; even if it does, it is a handful of skaters; actually the park pulls teens off the surrounding streets; and honestly, more teenagers around would be good for the neighborhood anyway. Four answers beat one — we win this argument four different ways.",
          strongAnswer: "Label each answer by what it does to the chain before running any of them. “The regional skate park two towns over already absorbs the skaters — this park will not add teenagers to the neighborhood” denies the action-outcome connection: a no-link, defense. “Teens already hang around the pharmacy and the bank steps; a park gathers them into one supervised corner, so the streets see fewer roaming teens” reverses the connection: a link turn, offense. “Even if the park draws a few more teens, a dozen kids on a Saturday is not the noise and trouble they describe” shrinks the endpoint: impact defense. “More teenagers around would be a benefit, not a harm — young people out in the open, known to their neighbors, make a street feel alive” reverses the value of the very outcome they forecast: an impact turn, offense. Now test the pair of reversals. Both are about the same outcome — teenagers around this neighborhood, now, on these streets — and granted together they say the park removes something we have just called good. They collide, so choose one story: run the link turn and leave the more-teens-is-good thought unsaid, or run the impact turn and drop the claim that the park thins the streets.",
          whyItWorks: "Two things happen here that the weak answer skips. Each response is classified by which part it touches and what happens to that part — disappear, shrink, or reverse — which is what makes the no-link defense, the shrink defense, and the two reversals offense. Then the reversals are tested against each other on the outcome itself. It is the same outcome in both, so the test applies at all; what convicts them is that granting both makes our own park the thing that removes the good we have just named. Had the link turn been about teenagers on the surrounding streets and the impact turn about teenagers inside a fenced park, they would have been two different outcomes and both could have stood. Counting reversals would never have told you either way."
        },
        q("Your team proposes moving the school start time to 9 a.m. The opponent answers: “A later start will push practices into the evening, and evening practices keep athletes out past dark.” Which part of what they said is the link?", ["The school would move its start time from eight in the morning to nine", "A later start will push the school’s sports practices into the evening", "Evening practices keep the school’s athletes out on the roads past dark", "The school day would end an hour later than the families are all used to"], "A later start will push the school’s sports practices into the evening", "The link is the causal claim that the action produces an outcome.", "The action is moving the start time; the impact is the harm of being out past dark. The link is the middle claim that the action produces the outcome — a later start pushing practices into the evening. The fourth is a real consequence of the action, but they never said it, so it is no part of their chain.", "Turn Mechanics"),
        [
          q("Your school proposes compost bins in the cafeteria. The opponent argues: “Compost bins will attract pests, and pests in a cafeteria are a health hazard.” You answer: “These are sealed bins emptied daily — schools running this exact system report no change in pest sightings.” If your answer succeeds, what has it done?", ["A link turn: the pest problem they raised now gives the judge a reason to want bins", "A no-link: the outcome they predicted never arrives at all, so nothing counts for you", "An impact turn: the pests arrive, and their presence is defended as good for the school", "Impact defense: the pests still arrive but matter far less to a cafeteria than claimed"], "A no-link: the outcome they predicted never arrives at all, so nothing counts for you", "Ask what is true if it succeeds: has the outcome vanished, or moved the other way?", "The answer says the outcome does not arrive at all. That is a no-link, and it is defense: their argument goes, and nothing new counts for your side. A link turn would have to claim the bins lower pest numbers below what the cafeteria has now, which is not what was said, and neither impact answer applies to an outcome the answer denies.", "Turn Mechanics"),
          q("The town proposes lighting the river trail at night. The opponent argues: “Lighting will draw crowds of evening visitors, and nightly crowds are the last thing this quiet neighborhood needs.” You answer: “They are right that the visitors will come, and that is the good news — a trail with people on it every evening is a trail residents feel safe walking.” Which move is that?", ["An impact defense: the crowds still arrive, and the answer cuts how much that presence would cost", "An impact turn: the crowds still arrive, and the answer makes their arrival the case for the plan", "A link turn: fewer crowds arrive, and the answer says the unlit trail draws more of them now", "A no-link: the crowds do not arrive, and the answer says lighting is not what brings them out"], "An impact turn: the crowds still arrive, and the answer makes their arrival the case for the plan", "Shrinking leaves the outcome bad. Reversing makes it good.", "The answer never says the crowds will be smaller or quieter. It grants that they arrive and argues their arrival is a benefit, which reverses the value of the endpoint: an impact turn, and offense. Impact defense would leave the crowds a nuisance and shrink it; the two link answers describe things this answer never claims.", "Turn Mechanics"),
          q("Your side proposes homework-free weekends. The opponent argues: “Without weekend homework students will forget material by Monday, and that forgetting forces teachers to spend class time reteaching.” Which response is an impact turn?", ["Students remember more after real rest, so Monday classes would start sharper than now", "Two days of forgetting needs a five-minute Monday warm-up, a small cost to the week", "Those extra class reviews are how knowledge sticks, so the learning would end up deeper", "Their forgetting claim rests on research about the long summer holiday, not two days away"], "Those extra class reviews are how knowledge sticks, so the learning would end up deeper", "An impact turn grants the outcome and reverses what it is worth.", "Their endpoint is the reteaching, called a cost. The reteaching answer grants it happens and argues it is a benefit: an impact turn. The remembering answer reverses the connection instead, so it is a link turn. The warm-up answer shrinks the cost and stays defense, and the summer-holiday answer goes after their evidence, which is an indict and also defense.", "Turn Mechanics")
        ],
        [
          q("Your side proposes a Saturday farmers market in the school lot. The opponent argues: “A market draws outsiders onto campus, and outsiders on school grounds are a safety risk.” You give two answers: a staffed market means fewer unsupervised strangers drifting through the lot than it gets on an empty Saturday now; and the stallholders and shoppers a market brings are good for the school, because they buy from student fundraisers. Do these two answers collide?", ["Yes, because two reversals aimed at one opposing argument compose into a double turn", "No, because the first answer names the drifters and the second the paying shoppers", "Yes, because granting both would mean the market removes the very shoppers we called good", "No, because a debater may give the judge as many answers as the speech time allows"], "No, because the first answer names the drifters and the second the paying shoppers", "Name the outcome each answer is about before you count anything.", "Run the test. The first answer is about unsupervised strangers drifting through the lot; the second is about stallholders and shoppers. Different people, so granting both leaves the opponent nothing: the market removes the drifters and brings the shoppers, and nothing we said takes away the good we named. Two reversals do not collide by being two, and the number of answers you may give is a separate question from whether granting both would hand the opponent a reason against you.", "Turn Mechanics"),
          q("You are defending a fenced dog park. The opponent argues: “a dog park brings more dogs into the neighborhood, and more dogs mean more noise.” You have drafted two responses: the fenced park pulls the neighborhood’s dogs off the sidewalks into one enclosure, and anyway more dogs about the place would be good, because dog walkers make streets feel watched. You run the audit before you speak. What should you do?", ["Keep the reversal you can win and give the other part ordinary defense, so one story stands", "Say the two responses answer two different arguments of theirs, so the pair can still stand", "Add a third answer that shrinks the noise and keep both reversals, so defense can outnumber them", "Withdraw the weaker response and grant that the park adds noise, so the stronger one stands alone"], "Keep the reversal you can win and give the other part ordinary defense, so one story stands", "One story, not two. Which reversal can you still win?", "Both answers are about the same outcome, dogs about the neighborhood, and granted together they say your own park removes something you have just called good — which the opponent can simply agree with. The audit says choose: keep one reversal and let the other part take ordinary defense or silence. Keeping both reversals leaves the collision in place, and piling more defense on top does not remove it — counting answers is not the test; answers to two different arguments can collide anyway when they meet on one outcome, and these plainly answer the same one; and granting that your own park adds the noise takes back the reversal you just kept.", "Turn Mechanics")
        ],
        {
          teachingSections: [
            {
              heading: "Four answers to one chain",
              body: "Take the skate-park chain and answer it four ways.\n\n“The park will not bring more teenagers — the big regional skate park is two towns over, and small local parks like this sit half empty.” This denies that the action causes the outcome; the chain never starts. That is a NO-LINK. If it succeeds their argument disappears and nothing counts for your side — in the last lesson’s language, defense.\n\n“Teenagers already hang around this neighborhood, skating outside the pharmacy and sitting on the bank steps. A park gathers them into one supervised corner, so the streets see fewer roaming teens, not more.” This does not deny the connection; it reverses the direction — the action lowers the very thing they said it raises. That is a LINK TURN, and it is offense: their own concern now argues for the park. A no-link says the arrow from action to outcome does not exist; a link turn says it points the other way. Different moves with different results, not weaker and stronger versions of one answer.\n\nNow the endpoint, where shrinking comes in two kinds. You can say less of the outcome arrives — “even if the park draws a few more teenagers, it is a dozen skaters on weekend afternoons” — which is really a claim about how strongly the connection works. Or you can say the outcome arrives and matters less than they say: “a dozen skaters on a Saturday afternoon is not the noise and trouble they are describing.” Debaters call the second IMPACT DEFENSE. Both are defense: the outcome stays bad, there is simply less of it or less at stake, and nothing counts for your side.\n\nThe endpoint can be reversed too: “more teenagers around is exactly what this neighborhood should want — young people out in the open, visible and known to their neighbors, make a street feel alive instead of empty.” This grants that the outcome happens and reverses its value. That is an IMPACT TURN, offense again, because their predicted outcome is now a reason to vote your way. Shrinking and reversing are different moves: impact defense leaves the outcome bad but smaller; an impact turn makes it good."
            },
            {
              heading: "When two answers add up against you",
              body: "Answers can be strong one at a time and still not survive being said together. Run both reversals above and listen to the pair: the park means fewer teenagers around, and more teenagers around would be good. Granted together they say your own plan prevents something you call good, and the opponent can agree with both and take that as the reason to vote against the park. That is the DOUBLE TURN. It is a collision between two claims, not a rule about how many reversals you are allowed.\n\nSo the test is about the outcome, not about the labels. Two answers collide when both of them, granted about the SAME outcome — the same measure, the same who or what in the same place, the same stretch of time, the same conditions — add up to a reason against your own side. Note what that does not require: the two claims usually can both be true, and that is exactly why the opponent can agree with both. Run the test in five moves. Name the exact outcome each answer is about. Put both in comparable words. Check whether they are about the same outcome, on all four counts. If they share none of it, they are not candidates for a collision. If they overlap only in part, they are candidates for that part alone: name the part they share and run the last question on it. Then grant them both for the length of the test and ask the question that decides it: granting both, can both stand without making your own side the thing that removes the good, or delivers the harm, that your other answer just named? Matching measures make two claims comparable; only that last question makes the pair self-defeating.\n\nTwo things follow, and both matter. Reversals that look like a pair may not be one: “the Saturday market brings fewer weekend loiterers onto the lot than the empty lot draws now” and “the visitors who come to buy from student stalls are good for the school” are about different people, so granting both leaves the opponent nothing. And answers to two different arguments can collide, if they meet on one outcome: thinning teen presence on their noise argument while defending teen presence on their loitering argument is the same self-defeating pair, spread across two flows.\n\nOne pairing passes this test rather than dodging it: “it will not happen — and even if it does, it would be good.” The first half is a denial, not a reversal, so it never claims your side removes anything; granting both, your side is not the thing that takes away the good the second half names. Put a reversal in front of the same words and it fails: “the park thins the streets — and even if more teens come, that is good” does claim your side removes the very thing the second half calls good."
            },
            {
              heading: "What makes a reversal count for you",
              body: "A reversal counts as offense only when the result it creates would give the judge a reason to prefer your side. The test is what the answer would establish if it were accepted, not whether the judge ends up believing it. Suppose you argue that more teenagers around is good, and the same teenagers would be there whether or not the park is built: you have changed how the outcome is judged and given nobody a reason to choose you. The same holds at the connection — if the teens were never going to roam the streets, proving your park keeps them away wins nothing extra. Ask of any reversal whether the result depends on your side. A reversal that fails that test has not earned the name: it is a claim about something that happens either way, not a turn.\n\nThe second duty is this lesson’s own, and it is the same for both reversals. Saying “it flips” is not a reversal: you have to say WHAT reverses, the connection or the endpoint, and WHY the reversed result follows — teens already gather on these streets and a park concentrates them; an evening street with people on it is safer than an empty one. Naming the move tells you what you are trying to accomplish; the reason is what makes it land. Building that into a complete answer, with the because and the therefore, is the refutation lesson’s job.\n\nTwo boundaries to keep straight. A reason of your own that does not run through their argument is offense, but it is not a turn: a turn takes their outcome and makes it yours. And an answer aimed at their evidence is an indict from the last lesson, which is defense — going after the evidence becomes a turn only when what you show makes their own argument point your way. The outcome question settles the direction first, every time."
            }
          ],
          misconception: {
            wrongModel: "Two reversals against the same argument are a double turn.",
            whyItFails: "The number of reversals is not what makes a pair defective. What makes it defective is that the two answers, both granted about the same outcome, add up to a reason against your own side: your plan removes the very thing you have just called good. Two reversals whose outcomes are genuinely different sit together perfectly well, and two answers to two different arguments can collide when they meet on one outcome.",
            betterModel: "Name the outcome each answer is about, put them in comparable words, check whether those outcomes are the same on all four counts — same measure, same who or what in the same place, same stretch of time, same conditions — and if they overlap only in part, run the last question on the part they share — then grant both and ask whether both can stand without making your own side the thing that removes the good, or delivers the harm, that the other answer just named."
          },
          commonMistakes: [
            {
              mistake: "Calling an answer a turn without saying why the reversed result follows.",
              whyItFails: "“It actually flips” names a move and gives the judge nothing to believe. A reversal that is only asserted is one the other side can simply deny.",
              fix: "Say which part reverses, and give the reason it reverses, in one sentence."
            },
            {
              mistake: "Denying the connection and calling it a link turn.",
              whyItFails: "A no-link says the outcome never arrives; a link turn says your side lowers the very thing they said it raises. The first leaves nothing counting for you.",
              fix: "Ask what is true if the answer succeeds: has the outcome vanished, or has it moved the other way?"
            },
            {
              mistake: "Reversing an outcome that would arrive either way.",
              whyItFails: "If the good thing you are now defending happens whether or not your side wins, you have changed how it is judged without giving the judge a reason to choose you.",
              fix: "Check that the reversed result depends on your side before counting it as offense."
            },
            {
              mistake: "Judging a pair of answers by counting reversals.",
              whyItFails: "Two reversals about genuinely different outcomes sit together perfectly well, and two answers to separate arguments can still collide. Counting is not the test.",
              fix: "Name the outcome each answer is about, put both in comparable words, and check whether those outcomes are the same on all four counts — same measure, same who or what in the same place, same stretch of time, same conditions — and if they overlap only in part, run the last question on the part they share — then grant both and ask whether they can stand without making your own side remove the good, or deliver the harm, the other just named."
            },
            {
              mistake: "Offering a reason of your own and calling it a turn.",
              whyItFails: "A separate benefit is offense and worth having, but their argument is untouched by it — nothing of theirs has been made to work for you.",
              fix: "A turn runs through their own outcome. If yours does not, call it what it is."
            }
          ],
          scaffoldedTry: {
            prompt: "The opponent argues: “Moving the library’s story hour to Saturday will bring families onto a street that is already busy with weekend traffic, and more people on foot on a busy street is a hazard.” Your answer: “Families on that pavement on a Saturday morning are what slows the traffic down — drivers go slower on a street where people are walking, and the crossing outside the library is where that matters most.”",
            frame: "Your answer works on ___. If it succeeds, ___. The move is ___.",
            slots: ["which part, and what it does to it", "what becomes true", "the move, in the lesson's words"]
          }
        }
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
        "Plan your side's first speech: choose your contentions, put them in an order that works, give each one its own job, and close on what they show together.",
        "A constructive is your side's first big speech. It is where you put your own arguments on the table.\n\nUsually there is nothing to answer yet, because the other side has not spoken.\n\nSay your side is arguing that school should start later. You might open like this:\n\n\"We have two reasons. First, students get more sleep. Second, fewer tired teenagers are driving to school in the morning.\"\n\nThat opening tells the judge what is coming before you argue any of it. It is called a ROADMAP.\n\nEach of those two reasons is a CONTENTION: one big point, with your arguing underneath it. Everything your side argues, all together, is your CASE.\n\nBuilding one good argument is a skill you already have from the Claim, Warrant, Impact lesson. Arranging several of them into a case is a different skill, and it is the one this lesson is for.\n\nSo do not spend this speech answering the other side. A speech that argues against points nobody made gives the judge their case instead of yours.\n\nOrder your contentions by what depends on what. One point can depend on another in two ways: the judge has to accept the first before the second means anything, or the first supplies something the second counts on.\n\nHere is the first kind. Say one contention argues that the school bus route is unsafe, and another argues the town should pay for a new one. Paying for a new route only means something once the judge accepts the old one is unsafe, so the safety point goes first.\n\nAnd here is the second. Say one contention argues that a bake sale raises money, and another argues that money pays for the class trip. The trip point spends what the bake sale brings in, so the bake sale goes first.\n\nWhere nothing depends on anything, the order is yours to choose.\n\nGive every contention a job none of the others does. Two contentions that show the same thing look like two points and are really one.\n\nAnd a contention only counts once you argue it. Announcing a heading is not arguing it.",
        "The constructive decides what the rest of the debate can be about. The other side can only argue with a case they can identify, and a judge who could not follow it the first time will not follow it faster in a rebuttal.",
        ["Pick the two or three reasons your side is running.", "Put them in order: anything a later point depends on goes first.", "Give each one a job the others do not do.", "Tell the judge what is coming, then argue each point properly.", "Close by saying what your points show together."],
        {
          prompt: "A first constructive on free school breakfast. Both versions use the same two points and the same study.",
          weakAnswer: "The other side will say this costs too much, but schools waste money on plenty of things, and they will probably say parents should do it, though plenty of parents leave for work before their children are up. Anyway, hungry students do worse. There is a study about it.",
          strongAnswer: "Two contentions. First, the students who skip breakfast are mostly the ones whose families cannot spare the money, so this is about a group that cannot fix the problem on its own. Second, those same students do worse in morning lessons: a school that started free breakfast saw fewer students sent out of morning lessons, which is what you would expect if hunger is part of why they struggle. The second point only means something once you accept who we are talking about, so it comes second. Together they show that the students who most need the food are the ones the school leaves out now.",
          whyItWorks: "The weak version spends the whole speech answering the other side, so its own points arrive as scraps — and it names a study without ever saying what the study found.\n\nThe strong version puts two contentions up, and says why one has to come before the other. Notice how it uses the study: it says what the study found, and why that supports the point. Naming a source only tells the judge that support exists somewhere.\n\nIt closes on what the two points show together, without claiming to have beaten a case it has not heard."
        },
        q(
          "Which of these is the constructive's own job, and not something a later speech can do instead?",
          ["Comparing your side's points against the other side's, once both are in the debate", "Answering the strongest argument the other side has actually made so far", "Deciding which single argument the judge should vote on at the end of the debate", "Getting your side's points up early, where everyone else can argue with them"],
          "Getting your side's points up early, where everyone else can argue with them",
          "Which of these has to happen first for the others to be possible?",
          "Establishing the case is the constructive's distinctive job — the other three all depend on material that is already in the debate. Comparison, refutation and collapsing are later work, and each needs a case that a constructive has already built.",
          "Constructive"
        ),
        [
          q(
            "A case for a school cycling club runs two contentions. One argues the school already owns twelve bikes that nobody uses. The other argues the club would cost almost nothing to run, because it would use bikes the school already has. Which contention should come first?",
            ["The bikes contention, because the cost contention counts on the school already having them", "The cost contention, because saving money is the more persuasive of the two", "Either order works, because the two contentions are about different things", "The cost contention, because the bikes only matter once the judge is thinking about money"],
            "The bikes contention, because the cost contention counts on the school already having them",
            "One contention uses something the other one supplies.",
            "The cost contention spends what the bikes contention supplies, so the bikes have to be on the table first. Choosing by which sounds more persuasive ignores what depends on what. The two are not independent either — one rests on the other. And the dependency does not run backwards: the bikes contention stands up on its own, whether or not the judge is thinking about money yet.",
            "Speech organization"
          ),
          q(
            "A point argues that keeping the school library open late helps students who have nowhere quiet to work. Which use of the study actually supports it?",
            ["The late-opening study is exactly about schools like this one", "Several studies of late opening point the same way", "At the school that tried it, students with no quiet space at home came in most", "This point is backed by a late-opening study that the other side has not argued against"],
            "At the school that tried it, students with no quiet space at home came in most",
            "One of these tells the judge what the study found.",
            "Only this says what the study found, which is something the reasoning can rest on. The others say a study is relevant, say that studies exist, or say nobody argued with it — all of which tell the judge support has been claimed without saying what it is.",
            "Evidence"
          ),
          q(
            "A case for opening the town library on Sundays runs two contentions, both argued in full. The first says Sunday opening is the only way people who work all week can use the library. The second says people who work all week cannot use a library that closes on Sundays. What is wrong with the case?",
            ["Nothing is wrong, because a case is stronger when the same thing is argued twice", "The two contentions come to the same thing, so the case has one point dressed as two", "The two contentions are in the wrong order, because the one about who is shut out depends on the other", "The case has not told the judge which of its two contentions should decide the debate"],
            "The two contentions come to the same thing, so the case has one point dressed as two",
            "Suppose the judge accepts both contentions, and ask how many things the case has then established.",
            "Both contentions establish one thing between them — that the people whose working week leaves them no other day can use the library only if it opens on a Sunday — so a judge who accepts either has accepted the other on the way, and the case has the look of breadth without a second part to it. Establishing one thing twice does not make it more established; it spends a stretch of speech that a genuinely different argument would have had. No order is forced here either, because neither contention needs anything the other supplies. And choosing what the debate should turn on is later work, not what is missing from a case that has argued one thing twice.",
            "Speech organization"
          )
        ],
        [
          q(
            "You are writing a first constructive. Which plan best matches what that speech is for?",
            ["Open by answering the other side's strongest argument before you argue your own", "Work out which contention has to come first, argue each one properly, then say what they show together", "Pick the two or three reasons your side is running, and then argue whichever one of them feels strongest first", "Start with the comparison you want the judge to make at the end of the debate"],
            "Work out which contention has to come first, argue each one properly, then say what they show together",
            "Match the plan to the speech's job: establishing your case.",
            "This plan puts the case up, orders it around what actually depends on what, argues each contention properly, and closes on what they showed. Answering the other side comes in a later speech, ordering by which reason feels strongest ignores what depends on what, and opening with the final comparison claims a conclusion the debate has not reached yet.",
            "Constructive"
          ),
          q(
            "A speaker argues two contentions in full and sits down straight after the second one. What has the speech left undone?",
            ["Nothing, because two contentions argued in full are a complete constructive", "It never said what the two contentions prove side by side", "It did not give any evidence for either contention", "It did not answer the arguments the other side is most likely to make"],
            "It never said what the two contentions prove side by side",
            "Two good arguments are not automatically one case.",
            "Contentions hold up a case, and the speech has to say what they show together — otherwise the judge is left with two separate points and has to put the case together for you. Two contentions argued in full are not already a complete constructive, for exactly that reason. The arguing itself was fine, evidence is a separate question, and answering the other side is not this speech's job.",
            "Constructive"
          )
        ],
        {
          commonMistakes: [
            { mistake: "Arguing against the other side before they have spoken.", whyItFails: "The judge hears their case from you, and your own points get whatever time is left.", fix: "Put your own contentions up. Answering comes in a later speech." },
            { mistake: "Announcing a contention instead of arguing it.", whyItFails: "A heading gives the judge no reason to accept anything, and a point left half-built here is hard to rescue later.", fix: "For each contention, say what you believe, why it is true, and why it matters." },
            { mistake: "Closing with \"we have beaten their case\".", whyItFails: "Their case has not been made yet, so there is nothing there to have beaten — and the judge is left to add your points up alone.", fix: "Say what your own contentions add up to, the way the strong answer above does." }
          ],
          scaffoldedTry: {
            prompt: "A case for opening the school sports halls to the public in the evenings has three contentions. All three are already argued in full — none of the arguing here is yours. They are listed in the order the speaker happened to draft them, which is not necessarily an order the speech can be given in.\n\nCLUBS: the five local clubs that currently drive to the next town would move their sessions here. They would move because the rental fee is low. The fee can only be that low if opening the halls costs the school nothing extra.\n\nHOURS: the halls stand empty after the school day, and the school already pays a caretaker to stay until late, so it can open them without spending anything extra.\n\nUPKEEP: the rental fees from the evening sessions pay off the repairs the halls need within three years.\n\nPut the three in an order the speech can be given in, say which contention supplies the rental fees UPKEEP spends, and write the one sentence you would close on.",
            frame: "Order: ___. The rental fees UPKEEP spends come from the people in ___. I would close: ___",
            slots: ["the order", "the contention the fees are paid out of", "the sentence you would close on"]
          }
        }
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
