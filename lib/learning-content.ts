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
      summary: "What a round is, what each side and the judge are doing, and how to keep track of each argument as it changes.",
      estimatedMinutes: 7,
      content: lesson(
        "Know what a round is, what each side and the judge are doing, and how to track each argument as it changes.",
        "Motion: the school cafeteria should stop selling sugary drinks. Side A says it should, and gives two reasons. Side B says it should not, gives its reasons, and answers Side A. Side A answers back. When the speaking ends, the judge decides which side’s reasons held up best, using only what was said.\n\nThat is a round: one whole debate, from the first speech to the judge’s decision. The motion is the statement the two sides disagree about. There are always two sides. A format is the set of rules a competition uses. Formats differ in speech names, order and timing; the jobs stay the same.\n\nIn a CompeteReady practice round, you pick a side and a format. The room shows the speeches for that format, whose turn it is, and how long each turn lasts, so you do not have to guess. You speak on your turns, your opponent speaks on theirs, and the judge decides from what was said.\n\nSo your job is not just to talk. It is to leave your reasons still standing at the end.\n\nThree words to keep apart. The round is the whole debate. A speech is one person’s turn to talk. An argument is one reason inside a speech: a claim, a reason, and a why-it-matters (the Claim, Warrant, Impact lesson teaches how to build one). Early speeches are mostly constructive: building your side’s case. Later ones are mostly responsive: answering, and comparing what is left.",
        "Once you know what the judge is choosing between, every sentence you say has a job.",
        [
          "While the other side speaks, note each claim and the reason under it.",
          "Mark which of your arguments they answered and which they skipped.",
          "After their speech, check each argument: answered? What state is it in now?",
          "Defend the ones that were answered, and say which got no response."
        ],
        {
          prompt: "Motion: the school cafeteria should stop selling sugary drinks. Two versions of one short back-and-forth. Watch what happens to each of Side A’s two arguments.",
          weakAnswer: "Side A: Sugary drinks cause energy crashes, so students concentrate worse after lunch. Also, the cafeteria would not lose money, because sales would shift to water. Side B: Students should be trusted to choose. Also, the menu has not changed in ten years. Side A: And sugary drinks are bad for teeth.",
          strongAnswer: "Side A: the same two arguments. Side B: On concentration: students who want a sugary drink will bring one from home, so a ban changes where they buy it, not what they drink. Side A: On that: the cafeteria is where most students buy drinks, because it is open all day. Nothing was said about the money, so that argument stands as we made it.",
          whyItWorks: "Follow each argument, not each speech. In the weak version nobody answers anything, so the judge holds five arguments and no reason to prefer one side’s. In the strong version the concentration argument is introduced, answered, then defended, so it is still unresolved. The money argument got no response, and Side A says so."
        },
        q(
          "A judge is about to decide a round. What are they choosing between?",
          [
            "Which side seemed more sure of itself while speaking",
            "Which side had the most to say and gave the most reasons overall",
            "Which side’s reasons are still standing after the answers",
            "Which side the judge thinks is right about the motion"
          ],
          "Which side’s reasons are still standing after the answers",
          "Think about what the judge is allowed to decide on.",
          "The judge decides on what was said in the round, not on delivery, not on their own opinion, and not by counting. A side can give more reasons and still lose if those reasons were answered while the other side’s went unanswered. What is compared at the end is what each side’s arguments have become.",
          "Round Orientation"
        ),
        [
          q(
            "Late in a round, Side A has made three arguments. Side B answered two of them and never mentioned the third. What should Side A do with its next speech?",
            [
              "Answer only Side B’s latest speech and let the earlier ones go",
              "Reply to their answers on those two, and say the third was never touched",
              "Say all three again, word for word, and add a fact to each",
              "Give up the two they answered, since the third is the one never attacked"
            ],
            "Reply to their answers on those two, and say the third was never touched",
            "Ask what state each of the three arguments is in now.",
            "Two arguments were answered, so the judge now needs Side A’s reply, or they stay where Side B’s answers put them. The third was left alone, so it stands as made, and saying so costs one sentence. Answering only the last speech treats the round as if it reset. Repeating with a source does not engage the answers. Dropping the two that were answered gives up the arguments actually in dispute.",
            "Round Orientation"
          )
        ],
        [
          q(
            "Side A says: “Homework should be limited because students need sleep.” Side B answers: “Students lose sleep to phones, not homework.” What does the judge most need from Side A next?",
            [
              "A new reason to limit homework, since the sleep point is now about phones",
              "An agreement that phones matter, then a move to the next argument",
              "The same point about students needing sleep, repeated more firmly",
              "A reason homework still costs sleep, even if phones cost sleep as well"
            ],
            "A reason homework still costs sleep, even if phones cost sleep as well",
            "Which part of Side A’s argument did Side B actually attack?",
            "Side B did not deny that students need sleep; they denied that homework is what costs it. That is the part now in dispute, so the judge needs Side A to engage it. A new reason abandons the contested one, agreeing and moving on concedes it, and repeating the sleep point restates the part nobody disputed.",
            "Round Orientation"
          )
        ],
        {
          teachingSections: [
            {
              heading: "A round is a set of arguments that change",
              body: "From the judge’s chair, the round is not a list of speeches. It is a handful of arguments, and each one has a story: introduced, then answered or left alone, then defended by its maker or not. Nothing resets when a new speaker stands up.\n\nSo for every argument there are two separate questions. Was it answered: yes or no. And what state is it in now.\n\nAn argument that was answered can still be very much alive, because the answer did not settle it: it is still unresolved. It can be weakened: answered and never defended. Or it can sit exactly where it was made, because it got no response at all.\n\nIf the other side never answers one of your arguments, they have not beaten it, but they have given the judge less reason to reject it. It can decide a round you thought you were winning, and saying so costs one sentence."
            },
            {
              heading: "Listen, and keep score",
              body: "The hardest beginner habit is listening while the other side speaks, instead of rehearsing what to say next. Catch two things in every opposing speech. For each argument they make: the claim, and the reason under it. For each argument you made: answered, or skipped?\n\nKeep a rough written record: one line per argument, theirs and yours, with a note beside each: answered or not, and how it stands. It is not a transcript: you do not write everything down. Hold the main claims and let the details go."
            },
            {
              heading: "The round narrows, and the judge decides on what remains",
              body: "By the later speeches, whatever the format calls them, most arguments are on the table. The round shrinks to the few disagreements still standing.\n\nThe judge decides on what is left. Not which side said more. Not which side sounded surer. Not what they themselves believe about the motion. Only which of the surviving arguments should decide this round. Choosing which one matters most is a skill with its own lesson later."
            }
          ],
          misconception: {
            wrongModel: "The round starts over every time a new speaker stands up, so each speech is judged on its own.",
            whyItFails: "Nothing resets. Every speech acts on the arguments already in the round, and the judge carries the results forward.",
            betterModel: "See the round as a few arguments changing state."
          },
          commonMistakes: [
            {
              mistake: "Thinking only about your own arguments while the other side speaks.",
              whyItFails: "You stand up not knowing which of your points were answered, and defend what nobody attacked.",
              fix: "Score their speech as it happens, argument by argument."
            },
            {
              mistake: "Assuming an argument you made once stays as strong as when you made it.",
              whyItFails: "An argument that was answered and never defended sits where the answer put it.",
              fix: "Reply to their answer. Saying your argument again, louder, is not defending it."
            }
          ],
          scaffoldedTry: {
            prompt: "Motion: the school should replace exam week with projects. Side A: Projects show what a student understands better than a timed test does. Also, exam week costs two weeks of lessons that go to exam practice. Side B: On projects: they are done with help at home, so they show what the family knows, not what the student knows. Side A: On that: the projects would be completed in class time with the teacher present, so the home does not come into it. Now score the exchange. Name the argument that was answered, the issue that is still unresolved between the two sides after that defence, and the argument that received no response at all.",
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
    description: "Judge what a piece of evidence actually shows, and what it leaves unproven.",
    category: "Debate foundations",
    order: 10,
    lesson: {
      title: "Judge the evidence",
      slug: "debate-evidence-evaluation-lesson",
      summary: "Say exactly what a piece of evidence shows, and exactly where the claim goes beyond it.",
      estimatedMinutes: 11,
      content: lesson(
        "Say what a piece of evidence actually shows, check whether it supports the claim made on it, and name what it leaves unproven.",
        "Claim: students learn more when school starts later. Evidence: a survey found that students said they felt less tired.\n\nWhat did the evidence actually show? That students SAID they felt less tired. It did not show that anyone learned more. The claim goes further than the evidence.\n\nEvidence gives the judge a reason to believe a claim; it does not prove the claim by itself. Your job is to say how far the reason reaches.\n\nTake the evidence as true. You do not have to disprove it, or look anything up. Debaters call the link between evidence and claim the warrant; building one is the Claim, Warrant, Impact lesson’s job.",
        "Rounds are full of confident citations. The judge follows the debater who can say what each one actually shows.",
        [
          "Say what is claimed, and what would have to be shown for it to hold.",
          "Say what the evidence found: what was measured, in whom, over what period, compared with what.",
          "Compare: does the evidence fit the claim, and is it big enough?",
          "Name the gap: grant what it shows, say what is unproven, and shrink the claim to fit."
        ],
        {
          prompt: "Claim: removing library late fees gets more books returned on time. Evidence: two similar libraries were tracked for a year; the one that removed fees saw on-time returns rise from 71 to 78 percent, the other stayed at 72. Evaluate the evidence.",
          weakAnswer: "This is strong evidence. It is real data, not opinion, it has a comparison, and returns went up. The claim is proved.",
          strongAnswer: "What it shows: at one library, over one year, on-time returns rose seven points after fees were removed, while a similar library that kept fees did not move. That comparison rules out a year when everyone returned more books — but not something else changing at that library, so the fee change is the likeliest explanation, not a proven one.\n\nWhat it does not show: that the same would happen at other libraries, or that the rise lasts.\n\nWhat is still needed: a reason to think other libraries are like this one. So the evidence supports the claim for libraries like this one; the claim as stated is still bigger than its evidence.",
          whyItWorks: "The first impression stops at “real data with a comparison”: the right thing to notice, the wrong place to stop. The evaluation says exactly what was measured and compared; grants that; and names what is left."
        },
        q(
          "Claim: the gym renovation improved student fitness. Evidence: a survey shows students like the new gym. What is the problem with this evidence?",
          [
            "It was taken after the renovation, not before, so there is no before measure of fitness",
            "It asks students who disliked the old gym, not neutral ones, and they like any change",
            "It surveyed the students who use the gym most, not the least fit ones, so it is one-sided",
            "It counts how much students enjoy the new gym, so it tells us nothing about being fitter"
          ],
          "It counts how much students enjoy the new gym, so it tells us nothing about being fitter",
          "Ask what the survey actually found.",
          "A real survey can still fail to support the specific claim. Liking the gym is real information about enjoyment, and adding a before measure, allowing for warmer answers, or asking a fairer group would not turn it into information about fitness. The mismatch is in what was counted, not in how well it was counted.",
          "Evidence"
        ),
        [
          q(
            "Neighbourhoods with more streetlights have less litter. A speaker concludes that streetlights prevent litter. What should a careful debater say?",
            [
              "Well-kept areas may get both the lights and low litter, so the cause is not yet shown",
              "The same pattern holds across many neighbourhoods at once, so the conclusion is well supported",
              "Litter counts may wobble week to week, so the figures do not settle it either way",
              "The link is probably a real cause, provided litter was counted the same way in each neighbourhood"
            ],
            "Well-kept areas may get both the lights and low litter, so the cause is not yet shown",
            "The pattern is real. What does it prove?",
            "The pattern is real evidence, but well-kept neighbourhoods may get both the lights and the lower litter — something else that makes the two go together. Breadth does not fix that: a pattern repeated across many places is still a pattern, not a cause. Rough counts would make the pattern less certain, not explain it, and consistent counting would only confirm it. A comparison that separates upkeep from lighting would deal with that explanation; nothing else offered here does.",
            "Evidence"
          ),
          q(
            "Two reports on a teen curfew disagree. A group campaigning for curfews describes one town that improved. A review by a group that gains nothing either way looked at forty towns, set out its method, and found mixed results. Which deserves more confidence, and why?",
            [
              "The review, because a mixed finding sounds honest and a confident one sounds like selling",
              "The campaign report, because one real success is more solid than an average that proves nothing",
              "The review, because it explained how it counted and the campaign report never explained how",
              "Neither on its own, because that town is probably among the forty, which came out mixed"
            ],
            "The review, because it explained how it counted and the campaign report never explained how",
            "Ask the same questions of both reports.",
            "Disagreement is where evaluation starts. A method that is explained can be checked; the campaign report gave none, so from what was said it cannot be, and one town is one town however solid it feels. An average across forty towns is not nothing: it is forty towns. Preferring the review because a mixed finding sounds honest is choosing by tone, not by method. Whether the improved town is among the forty is a guess the stem gives no basis for, and it would not change which report can be checked.",
            "Evidence"
          )
        ],
        [
          q(
            "Claim: a reading app doubled students’ reading skill. Evidence: the app company surveyed volunteer users, who reported big improvement. What is the strongest evaluation?",
            [
              "It is not worth much, because the app company is judging its very own product",
              "It shows some volunteers felt better, which is not the same as a measured doubling",
              "It is weak only because far too few users were surveyed to say very much",
              "It shows real gains, which outsiders repeating the same survey would confirm as doubling"
            ],
            "It shows some volunteers felt better, which is not the same as a measured doubling",
            "What did the survey actually ask?",
            "Take the evidence as true: some volunteers told the seller they felt they improved. That establishes something, so throwing it out because of who gathered it is rejection by source rather than evaluation. Nothing in the stem says how many were asked, so smallness is a guess. Outsiders running the same survey would still be asking volunteers how they feel, so it would confirm nothing about skill. The gap is between felt improvement and a measured doubling, and naming that gap is the evaluation.",
            "Evidence"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Job 1: Say what the evidence actually shows",
              body: "Start from the claim: say in one sentence what would have to be shown for it to hold. Then say what the evidence shows — what was measured or observed, in whom, over what period, compared with what.\n\nA count of sign-ups shows sign-ups, not whether the programme worked. A survey that asked what people would do shows intentions, not behaviour.\n\nTwo things to know by sight. A start or end date chosen to make the change look bigger shows less than the whole period. A figure is out of date only if the claim is about now and the facts have changed."
            },
            {
              heading: "Job 2: Does it match the claim?",
              body: "Fit: evidence about something nearby is not evidence about the claim. Feeling less tired is not learning more. A real, expert, trustworthy source can still be answering the wrong question.\n\nSize: evidence from one case, one place, or one group supports a claim about that case. On its own it usually cannot prove a claim about many. One improved town is evidence about that town, not about curfews everywhere. Evidence that covers part of a claim leaves the rest still a claim.\n\nCause: two things happening together, or one after the other, is not one causing the other until the other explanations are dealt with. That means anything else that could make the two go together. A comparison group (people like the first group who did not get the change) rules out only the explanations both groups share."
            },
            {
              heading: "Job 3: Name the gap, and the problem",
              body: "Grant and gap (to grant is to accept something as true for now). Take the evidence as true, say what it does establish, name what is still unproven, and shrink the claim to fit what is left. “Students learn more when school starts later” becomes “students say they feel less tired”, which the evidence supports.\n\nBe specific. “That source is bad” tells the judge nothing. “That survey asked twenty students at one school, so it does not show what all students would do” names the problem and what follows from it.\n\nWho produced it, and do they want a particular result? That is a reason for extra care, not a reason to throw the result away. Can the method be checked? If not, it earns less confidence than a result you can check."
            }
          ],
          misconception: {
            wrongModel: "If the evidence is true, the argument is proved.",
            whyItFails: "True and supports-this-claim are different questions. A true fact can be about something nearby, or far smaller than the claim.",
            betterModel: "Ask how far the evidence reaches. The argument is proved that far, and no further."
          },
          commonMistakes: [
            {
              mistake: "Using evidence about the topic but not about the claim.",
              whyItFails: "Nearby is not on target.",
              fix: "Say what the claim needs shown; check the evidence against that."
            },
            {
              mistake: "Treating evidence for part of a claim as evidence for all of it.",
              whyItFails: "Some improvement is not doubled.",
              fix: "Grant the part it shows; name the part it does not reach."
            },
            {
              mistake: "Treating one example as proof of a general claim.",
              whyItFails: "A vivid story is evidence of one case.",
              fix: "A claim about many needs many."
            },
            {
              mistake: "Using a strong-sounding number without saying what it counted.",
              whyItFails: "A figure carries only what was counted.",
              fix: "Say what the number counts before saying what it proves."
            },
            {
              mistake: "Trusting an impressive source instead of checking the fit.",
              whyItFails: "Who said it and whether it fits are separate questions.",
              fix: "Check the source and the fit separately."
            }
          ],
          scaffoldedTry: {
            prompt: "Claim: this city’s free bus fares have cut car traffic. Evidence offered: on the first Saturday of free fares, traffic on the main shopping street was about a third lighter than on the Saturday before. Say what it shows, what it does not yet establish (prove), and what would be needed to support the claim as stated. Take it as true; you are judging how far it reaches.",
            frame: "The evidence shows ___. It does not yet establish ___. To support the claim as stated we would need ___.",
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
    description: "Find what the two sides really disagree about, and state it as a question the judge can decide.",
    category: "Debate foundations",
    order: 3,
    lesson: {
      title: "Find the real clash",
      slug: "debate-clash-lesson",
      summary: "Three jobs: name what each side says, test whether both can be true, and write the question the judge has to decide.",
      estimatedMinutes: 12,
      content: lesson(
        "Say what each side is trying to prove, find the question both depend on, and state it so either side could still win it.",
        "The motion (the statement a debate is about): the school cafeteria should go meat-free. Side A: “Meat-free meals are healthier.” Side B: “Students will just buy lunch outside.”\n\nDo they disagree? Not yet: both can be true, since a healthier menu nobody eats is still healthier.\n\nAsk what each argument needs. Side A’s benefit needs students to eat the meals; Side B says they will not. That is the real disagreement: will students actually eat the cafeteria’s meals?\n\nThat question is the CLASH: the one thing the two sides need to go opposite ways. Three jobs find it in a round (one whole debate).",
        "Judges decide rounds by settling disagreements, not by counting arguments; name the question and they know where to look.",
        [
          "Say what each side is trying to prove, in one sentence they would accept.",
          "Ask whether both can be true at once. If they can, no clash yet.",
          "Ask what each argument needs to be true; the thing both need, going opposite ways, is the clash.",
          "State it as a question either side could still win, narrower than the motion."
        ],
        {
          prompt: "Motion: this city should make its buses free. Side A: free buses cut car traffic, because short-trip drivers will switch. Side B: free buses cost eleven million a year in lost ticket money; and the extra journeys come from people who already ride. Identify the clash.",
          weakAnswer: "The clash is traffic against cost.",
          strongAnswer: "Side A’s traffic claim needs the new riders to be former drivers; Side B’s second argument says they will be today’s passengers riding more. The clash is whether free fares move people out of cars, or mostly add trips for people already riding. The eleven-million cost sits outside that clash: it can be true whichever way the question goes.",
          whyItWorks: "The weak version pairs two arguments that can both be true; the strong version finds the Side B argument that clashes with Side A, states the open question, and says what stays outside."
        },
        q(
          "Motion: this school should start the day an hour later. Side A argues that students would arrive more rested. Which of Side B’s replies is actually in clash with that?",
          ["Better-rested students would still need the same lessons each school week.", "After-school sports would finish in the dark and lose most of winter.", "Students would just push bedtime back an hour and gain no extra sleep.", "Well-rested or not, students would still walk in late on dark winter mornings."],
          "Students would just push bedtime back an hour and gain no extra sleep.",
          "Ask whether Side A’s statement and the reply can both be true at the same time.",
          "Only one reply takes the opposite position on the thing Side A’s argument depends on: that a later bell actually buys students more sleep. Each of the other replies can be true at the same time as Side A’s statement — students can be better rested and still have the same lessons, still arrive late, and the sports cost does not touch how rested anyone is — so choosing between them decides nothing. Two replies mention rest: sharing a subject with the claim is not the same as contesting it.",
          "Clash"
        ),
        [
          q(
            "Side A says a ban on phones during the school day reduces distraction in class. Side B says students will hide their phones and be distracted by that instead. Which question states their clash so that either side could still win it?",
            ["Would a ban reduce distraction, or would students just find an even worse way to lose their focus?", "Would a ban reduce distraction overall, or would it only change what distracts students most?", "Is banning phones during the whole school day the only right policy for this school?", "Is a phone ban the only way to stop students being distracted during a school lesson?"],
            "Would a ban reduce distraction overall, or would it only change what distracts students most?",
            "A clash question is one that either side could still win.",
            "One question decides the answer before the debate starts: asking whether students would find a worse way to lose focus is stronger than anything Side B said — Side B claimed the distraction moves, not that it grows — so it hands Side B an answer they did not argue for. One is the motion in different clothes. One asks whether a ban is the only way to stop distraction, which neither argument depends on. Only the remaining question names the thing the two sides take opposite positions on and leaves it open — it has the same shape as the loaded first option, so the shape is not what makes it fair.",
            "Clash"
          )
        ],
        [
          q(
            "Motion: the town council should close the main street to cars on Saturdays. Side A argues that shops will gain customers, because people browse when they can walk without traffic. Side B argues that shops will lose customers, because the people who spend the most drive in from outside town and park behind the shops. Which question do both of these arguments depend on?",
            ["Should the main street be closed to cars on Saturdays, or be left open as now?", "Which shops would lose the drivers from outside, even if more people browse on foot?", "Do shoppers on foot find the main street quieter once it is closed to cars?", "Do the shoppers these shops rely on come on foot, or drive in from outside?"],
            "Do the shoppers these shops rely on come on foot, or drive in from outside?",
            "Ask what each argument needs to be true in order to reach its conclusion.",
            "Side A’s gain needs the shops’ best customers to be people on foot; Side B’s loss needs them to be people who drive. One option is the motion, which every argument fits under. One asks which shops would lose the drivers, which assumes Side B’s conclusion before it is argued. One is a real question, but both sides would answer it the same way — yes, it would be quieter — and neither conclusion changes with the answer. Only the remaining question is the one both arguments stand or fall on.",
            "Clash"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Job 1: Say what each side is trying to prove",
              body: "One sentence per side, in words they would accept. Not the motion or their evidence: what they are trying to prove.\n\nRestate each side at the strength they gave it. “Side A says uniforms magically fix bullying” is not what Side A said."
            },
            {
              heading: "Job 2: Ask whether both can be true at once",
              body: "Sounding opposed is not the test; the test is whether both can be true at the same time.\n\nSide A: uniforms reduce the pressure to wear the right clothes. Side B: uniforms are expensive. Both can be true, so no clash yet. Change Side B to: uniforms do not reduce that pressure, because students show off with shoes instead. Now both cannot be true. That is a clash.\n\nMost real disagreements are about how much, not yes or no. Nobody says uniforms do nothing; the other side says far less. Put the amount inside the question — “do uniforms meaningfully reduce clothing pressure?” — and check the sides still split. Words like meaningfully, mostly, or enough do it.\n\nSometimes the honest result of digging is that there is no shared question. A meat-free menu can be healthier and cost more; those arguments are independent — they do not touch. Do not invent a link the other side never made."
            },
            {
              heading: "Job 3: Find the question both sides depend on",
              body: "Ask what each argument needs to be true to work. To find it, ask: if this were false, would the argument still stand? What would break it is what it needs. The thing both need, going opposite ways, is the clash. It usually sits one level below what either speaker said, in different words on each side.\n\nState it as a question either side could still win, narrower than the motion. “Why do uniforms fail to reduce pressure?” has already decided they fail; the neutral version from Job 2 can be won by either side. If your opponent would object to a word in it, that word is doing your arguing for you. Take it out."
            },
            {
              heading: "What clash is not",
              body: "Not the motion. “The clash is whether the cafeteria should go meat-free” tells the judge nothing; every argument fits under it.\n\nAnd it is one job of three. Clash asks what the sides disagree about. Refutation answers a different one: why their reasoning fails. Weighing answers a third: which side’s result should count for more."
            }
          ],
          revisionLadder: [
            {
              attempt: "Side A: a skatepark gives teenagers somewhere to go. Side B: they already gather in the car park by the pool and will not move. Side A replies: they claim teenagers do not want anywhere better, obviously false, so the clash is whether teenagers would prefer a skatepark.",
              diagnosis: "Well phrased, and built on a position Side B never took. Side B said the teenagers would not move, not that they would not prefer to. That swaps what teenagers would do for what they would like — which is easier to beat.",
              revision: "Taking Side B at their strongest — the teenagers already have a place and would not move — the clash is whether the car park already does what a skatepark would."
            }
          ],
          misconception: {
            wrongModel: "Clash means taking one argument from each side and setting them against each other.",
            whyItFails: "Two arguments from opposite sides can both be true at once; then there is nothing to decide.",
            betterModel: "Clash is two arguments answering one question in ways that cannot both be right. Find the question, then state it so either side could still win it."
          },
          commonMistakes: [
            {
              mistake: "Pairing arguments by side instead of by question.",
              whyItFails: "Opposite sides tell you where to look for a clash. They do not make one.",
              fix: "Write the one question both answer."
            },
            {
              mistake: "Choosing two claims that can both be true at the same time.",
              whyItFails: "The judge can believe both.",
              fix: "Run the both-true test; if both survive, go one level down to what each needs."
            },
            {
              mistake: "Confusing finding the clash with refuting it.",
              whyItFails: "Naming the disagreement does not say why the other side is wrong.",
              fix: "Say what they disagree about first; then argue your side."
            },
            {
              mistake: "Restating the other side more weakly than they put it.",
              whyItFails: "A clash built on an argument they never made is one they never joined.",
              fix: "Write their position in words they would recognise, at full strength."
            }
          ],
          languageFrames: [
            {
              purpose: "Identify the disagreement",
              starters: [
                "The real disagreement is whether ___"
              ]
            },
            {
              purpose: "State the clash neutrally",
              starters: [
                "The judge needs to decide whether ___"
              ]
            },
            {
              purpose: "Connect the two sides",
              starters: [
                "Both sides’ arguments about {topic} meet on whether ___"
              ]
            }
          ],
          scaffoldedTry: {
            prompt: "Motion: this school should move to a four-day week. Side A: attendance would improve, because families could book medical and dental appointments on the free weekday instead of pulling students out of lessons. Side B makes two arguments: the four remaining days would each run an hour longer, and younger students lose focus in the final hour; and clinics hand families whatever slot is free, so most appointments will still fall on school days whichever day is off. Only ONE of Side B's arguments clashes with Side A. Find it, say what each of those two sides is trying to prove in words they would accept, and state the question both depend on, so that either side could still win it.",
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
    description: "Compare both sides’ results so the judge knows which one should decide, and why.",
    category: "Debate responses",
    order: 5,
    lesson: {
      title: "Explain why your impact wins",
      slug: "debate-weighing-lesson",
      summary: "Three jobs: find a real difference between the two results, say why it matters, and compare both sides out loud.",
      estimatedMinutes: 11,
      content: lesson(
        "Put both sides’ results side by side, find a difference the debate really shows, and tell the judge why it means your side should win.",
        "A town is deciding on a stop sign at the school crossing. One side: it stops children being hit. The other: it adds a minute to every trip.\n\nWeak: “Our impact is bigger.”\n\nBetter: “A minute of delay is annoying; a child hit at a crossing can be hurt for life. Preventing the injury matters more, because a minute can be made up and an injury cannot.”\n\nThat is WEIGHING: explaining why one side’s result should matter more than the other’s. Each argument ends in a result — a harm or a benefit — which debaters call an IMPACT.\n\nWeighing is not describing your own harm louder, and not comparing whose evidence is better — that compares sources, not results.",
        "Judges often think both sides have a point; with no rule from you, they use whatever rule they prefer.",
        ["Name both results.", "Find a difference the round actually shows.", "Turn it into a rule usable on either side, say why it fits, and say it early.", "Run both results through the rule and say which side wins.", "If a difference favours them, name it, then say why yours should still decide."],
        {
          prompt: "Side A: a class on checking what AI tells you leaves students better prepared. Side B: it costs class time. Each side gives several speeches; the last cannot be answered. Two ways to run the same comparison.",
          weakAnswer: "[Final speech only] Decide this on what cannot be undone: lost class time can be rescheduled, a student’s missing skill cannot. Under that rule, being prepared wins.",
          strongAnswer: "[First speech] Decide this on what cannot be undone, because a fixable mistake is smaller than one a student carries for good. [Final speech] Lost class time can be rescheduled; the student’s missing skill cannot. Under that rule, being prepared wins.",
          whyItWorks: "Same words; what changed is when the rule arrived. Given early, the other side could still argue for a rule of its own, so the judge uses a rule that was open to challenge. Given late, nobody can answer it. Fix: give the rule earlier."
        },
        q("Which line is weighing?", ["Our impact is backed by three separate studies, and theirs by a single one", "Their impact would be serious for the families involved if it ever happened", "Ours reaches more people than theirs does, so ours is what should decide here", "We answered every single argument they made today, one by one, point by point"], "Ours reaches more people than theirs does, so ours is what should decide here", "Describing a harm, comparing evidence, and counting answers are not weighing.", "Only one line puts the two results next to each other and says which should settle the round. Comparing whose evidence is stronger compares sources, not harms. Granting that their harm would be serious concedes without choosing. Saying you answered everything says nothing about which harm matters more.", "Weighing"),
        [
          q("A round on a town curfew: it might reduce late-night injuries, but it is unlikely to be enforced. Which sentence gives the judge a rule that could be used on either side’s impact?", ["Late-night injuries are a serious harm for any teenager who is out in this town.", "Count a harm for less when it only happens if the policy is being enforced.", "Our side has far more evidence on injuries, and they have nothing on enforcement.", "The curfew only needs enforcing in a few places to cut injuries for real."], "Count a harm for less when it only happens if the policy is being enforced.", "A rule has to be usable on the other side’s impact too, not only on yours.", "Only one of these is a rule the judge could use on either side’s impact. The others describe a harm, compare how much evidence each side has, or claim a result. None of them tells the judge how to choose once both harms are real.", "Weighing"),
          q("A city is deciding whether to close its late-night bus route. Both sides accept that the two harms are about equally likely, that neither arrives before the other, and that nothing in the round shows which harm is larger. One thing does differ: the people their harm falls on can find another way; the people ours falls on cannot. Which line gives the judge a comparison that can actually separate the two sides?", ["Decide this on which harm is more likely to actually happen, because a judge should not hand the round to a harm that probably never arrives at all.", "Decide this on which harm arrives first, because a judge should act on the harm that is here right now rather than one still on its way.", "Decide this on which harm is larger, because size is what settles a comparison when the other differences between the sides are level.", "Decide this on which harm the people it falls on can get around, because a harm with a way round is a smaller thing than one with none."], "Decide this on which harm the people it falls on can get around, because a harm with a way round is a smaller thing than one with none.", "A rule only helps if the two sides come out differently under it.", "All four are real rules with reasons, and only one decides anything here. The round has settled that the harms are equally likely and start together, so the likely rule and the first rule leave the judge where they started. Nothing in the round shows a difference in size, so the larger rule cannot be applied at all. Only the get-around rule rests on a difference this round actually shows, and it says why that difference should decide.", "Weighing"),
          q("Side A asks the judge to decide on which harm is more likely. Side B thinks the judge should decide on which harm can be undone. What should Side B do?", ["Accept Side A’s rule, since it was stated first and a clear reason was given for it.", "Argue that Side A’s rule is wrong because it favours Side A, and rest the case on that reason.", "Argue for the undone rule, and give a reason it suits this debate better than likelihood.", "Hold the undone rule until the final speech, so the likelihood rule cannot be defended."], "Argue for the undone rule, and give a reason it suits this debate better than likelihood.", "A rule is a claim like any other.", "A weighing rule is a claim like any other: the other side can contest it and offer a better one, with a reason. Accepting a rule you disagree with concedes the comparison; rejecting a rule only because it favours the side that offered it is not a reason, and leaves no rule of your own on the table; holding a rule back until nobody can answer it makes it weaker, not stronger.", "Weighing"),
          q("You said early that harms already happening should count for more than harms that might happen later. The other side’s harm is a budget gap five years from now; yours is students going without meals now. Which sentence applies the rule you set?", ["Our impact is far more emotionally compelling than a budget forecast could ever be.", "A gap five years out may never come at all, and students are missing their meals today.", "Their five-year forecast is nearly always exaggerated, while our students’ hunger is real.", "We should win this because we set a weighing rule and the other side never set one."], "A gap five years out may never come at all, and students are missing their meals today.", "The rule you set was about timing.", "The correct answer tests both impacts against the rule already set and lets the rule produce the conclusion. The others appeal to emotion, dismiss the other side’s harm on credibility rather than by the rule, or treat having a rule as a win by itself. A rule tells the judge how to decide; it does not decide for them.", "Weighing")
        ],
        [
          q("A state grant will pay either to clear an invasive weed out of a lake or to repair the lake’s boat ramps, not both. Two things are settled by the end of the round. Their harm (boaters who cannot launch) reaches more people than yours. Your harm (the weed spreading) grows every season it is left alone, while theirs stays the same size whenever it is fixed. Which line does the most for a judge who still has to choose?", ["Ours is the harm that grows every season it is left alone, so the comparison goes to us, and the judge should decide this round on the spread of the weed rather than on the state of the boat ramps.", "Their harm reaches more people, and we grant it. Ours grows every season it is left alone, and that comparison should decide, because a ramp costs the same to repair next year and the weed does not.", "Every comparison here runs our way, because ours is the harm that grows if it is left alone, ours reaches more people, and ours is the one that started first, so the judge has nothing left to balance.", "One difference favours each side, and we grant it, so the two cancel out and the impacts finish level; with the comparison tied, the judge should decide on which side handled the other’s arguments better."], "Their harm reaches more people, and we grant it. Ours grows every season it is left alone, and that comparison should decide, because a ramp costs the same to repair next year and the weed does not.", "Both differences are real. The work is saying which one should decide, and why.", "Real differences often point in different directions, and the judge still has to choose. The line that grants what the other side wins and then gives a reason the remaining difference should decide is doing the weighing. The line that says every comparison runs one way contradicts what the round settled. The line that names its own advantage and stops leaves the judge holding two real differences and no reason to prefer either. The line that calls it tied hands the decision to something that is not an impact at all.", "Weighing"),
          q("A round on turning farmland back into wild land. You are Side A. Your harm: species lost for good. Side B’s harm: a temporary drop in farm income. Early on, Side B asked the judge to decide on which harm touches more people day to day, and gave a reason. From your first speech, you asked the judge to decide on what cannot be undone. Which final-speech line is strongest?", ["The number of species at stake is far larger than the number of farms this policy would touch — a harm that big should simply win this round on numbers alone, whatever rule was set.", "Ignore their rule, judge, because a rule that happens to favour the side proposing it can never be fair; use ours instead, since ours favours nobody and was on the table from our first speech.", "Their rule is fair and it favours them, so we accept it and grant the comparison — and ask you to decide instead on which team argued the people-count more carefully from its first speech.", "On how many people it touches their harm wins — but from our first speech we argued another rule, and it should decide: a harm that ends leaves people options, a permanent harm does not."], "On how many people it touches their harm wins — but from our first speech we argued another rule, and it should decide: a harm that ends leaves people options, a permanent harm does not.", "Ask which line does the most work for a judge who still has to choose between two real harms.", "This is the hard case: the other side’s rule does not favour you. Accepting it loses the comparison, and rejecting it because it is inconvenient is not an argument. The strongest line admits what their rule gives, then holds the judge to the rule you set in your first speech and gives the reason for preferring it. The numbers-alone option reaches for a rule neither side argued for; the ignore-their-rule option rejects a rule for being convenient rather than wrong, and asserts its own without a reason; the accept-it option concedes the comparison and then asks the judge to decide on something that is not an impact.", "Weighing")
        ],
        {
          teachingSections: [
            {
              heading: "Job 1: Find a real difference",
              body: "Results can differ in how many people they touch, how bad they are, how likely, how soon, or whether they can be undone. Debaters have names for some; you never need them. You need a difference the round — the whole debate — actually shows.\n\nIf both harms are equally likely, “ours is more likely” does not tell them apart; if both start together, neither does “ours comes first”. The judge applies it and still cannot choose.\n\nSometimes the difference has no name: one harm blocks something people must do, the other something they merely wanted. What separates the two sides is the fact, not the name for it."
            },
            {
              heading: "Job 2: Turn it into a rule, and say why",
              body: "Give the judge a rule for choosing. Debaters call it a WEIGHING STANDARD, or a WEIGHING FRAMEWORK (two names, one thing). Word it so it could be used on their result too: “A harm that cannot be undone should count for more.” “Our harm is huge” is not a rule; nothing in it measures their result.\n\nSay why the rule fits this debate. A difference with no reason behind it is just a fact; say why it should decide.\n\nSay it early, while the other side still has speeches to answer it, and expect them to argue for a rule of their own."
            },
            {
              heading: "Job 3: Compare both sides out loud",
              body: "Stating the rule is not the comparison. Run both results through it and say what it decides: “A minute of delay can be made up. An injury cannot. Under that rule, the crossing wins.”\n\nOften more than one difference is real, and not all favour you: theirs reaches more people, yours is permanent. Do not pretend every comparison favours you; a judge who sees the difference you skipped trusts the rest less.\n\nName what they win (debaters say you grant it), then say why yours should still decide, and give the reason. Naming both and stopping leaves the judge no way to choose."
            }
          ],
          revisionLadder: [
            { attempt: "[A library must cut its help desk or its evening hours. You defend the desk.] People come to that desk with forms they cannot finish alone, and a staff member sits with them until it is done.", diagnosis: "This describes one result and stops. The other side’s harm — people who cannot get in before closing — is missing. WHAT THE REVISION ADDS: both results, a rule usable on either side, and a reason.", revision: "Their harm blocks an evening at the shelves; ours blocks forms people must file. Decide this on whether the harm blocks something required, because a missed duty costs more than a missed wish." },
            { attempt: "Same line as above.", diagnosis: "A rule with a reason, not yet applied — and it skips the difference the other side wins: theirs starts the week the hours shrink, ours months later. WHAT THE REVISION ADDS: both harms under the rule, their difference named, why ours still decides.", revision: "On when the harms start they are ahead, and we grant it: theirs starts the week the hours shrink; ours months later. But our rule was whether the harm blocks something required. A form with a deadline and a fine is required; an evening at the shelves is not. On that rule the desk stays." }
          ],
          languageFrames: [
            { purpose: "Naming a kind of comparison is not making one; the words after “because” are the whole argument.", starters: ["Decide this on ___, because ___.", "On ___ they are ahead. It still should not decide, because ___."] }
          ],
          scaffoldedTry: {
            prompt: "Everything you need is below. Nothing here is yours to invent.\n\nTHE ROUND: a university is deciding whether to require all first-year students to live on campus. You are arguing against the requirement.\n\nOUR IMPACT: students who would have commuted from home cannot pay the housing charge, and do not sign up at all.\n\nTHEIR IMPACT: first-years who commute take part in less of the first year and are likelier to leave before finishing it.\n\nESTABLISHED IN THE ROUND, DISPUTED BY NEITHER SIDE:\n- The requirement either applies or it does not; the two harms cannot both be avoided.\n- Ours is certain: the university's own figures show the charge is more than those students can pay, and there is no exception. Theirs needs a chain — a commuter has to stop joining in, then fall behind, then leave — and most commuters do none of that.\n- Both harms begin with the same entering class; neither arrives before the other.\n- Both fall on first-year students.\n- Both stop if the requirement is lifted; neither outlasts the policy.\n- Their harm would reach several hundred students; ours would reach a few dozen.\n\nTHE FIVE COMPARISONS AVAILABLE TO YOU: how likely each harm is / when each harm starts / who each harm falls on / how long each harm lasts / how many students each harm reaches.\n\nYOUR TASK: fill the four slots. Three of those five comparisons are settled as level by the facts above — a judge can apply them and still not know what to do. Of the two that are left, one runs your way and one runs theirs, and you have to handle both.",
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
    description: "Sort answers by what they do: defense or offense, and the named moves inside them, indict and turn.",
    category: "Debate responses",
    order: 11,
    lesson: {
      title: "Know what your answer does",
      slug: "debate-answer-types-lesson",
      summary: "Ask what an answer does before you ask what it is called: does their argument count for less, or does something now count for you?",
      estimatedMinutes: 8,
      content: lesson(
        "Say what an answer does if it works, sort it as defense or offense, name an indict or a turn, and pick the direction an argument needs.",
        "They say: the school should not add a late bus, because almost nobody would ride it. You answer: the sign-up sheet already has sixty names.\n\nBefore you ask what that answer is called, ask what it does. If it works, their reason is gone, but the judge still has no reason to want the bus. Their argument counts for less. Nothing new counts for you.\n\nEvery answer does one of two jobs. DEFENSE makes their argument count for less: smaller, shakier, or gone, and adds nothing new for your side. OFFENSE gives the judge a reason to prefer your side that was not there before.\n\nEach job has one special kind with its own name: an INDICT is a kind of defense, a TURN is a kind of offense.",
        "Judges vote for reasons. Defense is a real answer and often the right one, but choose it on purpose. If every answer you make is defense and their argument is still standing, the judge holds their reason and none of yours.",
        [
          "Say their argument in one sentence.",
          "Suppose your answer works completely. Say what is then true.",
          "Read the direction: only counts for less, or something now counts for you?",
          "Name it: defense if only for less, offense if something counts for you. Indict if you went after their evidence, turn if their own argument supplied it.",
          "Run it backwards: does their argument need to count for less, or to start counting for you?"
        ],
        {
          prompt: "They say: a park on the parking lot will cost nearby shops their customers. A: their claim rests on a survey of what shop owners fear, not on what shops actually took. B: in similar projects the park brought shops more customers than the parking did. Name each answer.",
          weakAnswer: "Both answers beat the business argument, so both are offense. A goes hardest at their evidence, so A is the turn.",
          strongAnswer: "If A works, the judge trusts the business claim less and the argument gets smaller. Nothing about the park counts for us yet: defense, and because it went after the evidence, an indict.\n\nIf B works, their own worry, business, is now a reason for the park: offense, and because their argument is what reversed, a turn.\n\nA is not a turn: doubting a survey puts no reason on our side.",
          whyItWorks: "Each answer was sorted by what it would make true, and A was named from what it went after. Either can still fail: B is a turn whether or not the judge ends up believing the comparison."
        },
        q(
          "They say your school recycling plan costs too much. You answer: a county grant pays for the whole plan, so the school spends nothing. Suppose that answer works completely. What kind of answer is it?",
          [
            "Defense: the cost objection is handled, but recycling itself has not gained a reason",
            "Offense: the answer worked completely, so the judge now has a reason to prefer recycling",
            "Turn: their own cost reason now argues for the recycling plan, not against it",
            "Indict: they never said where their cost numbers came from, so their reason is weaker"
          ],
          "Defense: the cost objection is handled, but recycling itself has not gained a reason",
          "Say what is true once the answer works, then read the direction.",
          "A completely successful answer can still be defense. Their reason is gone, but the judge has nothing to vote for: taking their reason away is not giving yours. Nothing was said about where their numbers came from, so it is not an indict. Their cost reason is not made to argue for recycling, so it is not a turn.",
          "Answer Types"
        ),
        [
          q(
            "They say a new stadium will boost the local economy, and cite a report. You answer: the company building the stadium paid for that report, and it counts spending that would have happened in town anyway. Suppose that works. What has it done?",
            [
              "Indict: the report looks shaky now, so the boost they promised counts for less than before",
              "Turn: showing who paid for the report makes their whole economy reason argue for your side",
              "Offense: the company wanting the stadium built is itself a reason to reject the stadium",
              "Defense: the boost is smaller than claimed, and nothing about the report itself was doubted"
            ],
            "Indict: the report looks shaky now, so the boost they promised counts for less than before",
            "Two questions: which direction, and which part of the argument you went after.",
            "Their economy reason counts for less and nothing yet counts for your side: defense. The answer went after the evidence, who paid for it and what it counted, so it is an indict. Doubting a report does not make the economy argue for you, so it is not a turn. The company wanting the stadium is a reason to doubt the report, not a reason of your own. And the answer does doubt the report, so the last option is not what happened.",
            "Answer Types"
          ),
          q(
            "They say school uniforms cut bullying, citing a small survey. You read a larger study: uniforms slightly increase bullying. A teammate says: that is only defense, our study just cancels theirs. Is the teammate right?",
            [
              "No: with bullying going up under uniforms, the judge now has a reason on your side too",
              "Yes: a study that answers their study can take their reason away but never build one for you",
              "No: it shows how badly their survey was run, so it is an indict rather than plain defense",
              "Yes: the larger study makes their reason count for less, and that is all it does"
            ],
            "No: with bullying going up under uniforms, the judge now has a reason on your side too",
            "Ask what is true if the new study is accepted, then read the direction.",
            "Direction is set by what the study finds. A study finding no change would cancel their reason: defense. This study finds bullying goes up, so bullying is now a reason against uniforms, and something counts for your side. Nothing here examines how their survey was run, so it is not an indict, and an indict would be defense anyway.",
            "Answer Types"
          )
        ],
        [
          q(
            "They say a new downtown bike lane will slow car traffic. Which answer is a turn?",
            [
              "The lane replaces a parking lane, not a driving lane, so cars have the same room as before",
              "Their delay number comes from a computer model of a six-lane highway, not a street like this",
              "Slower downtown car traffic is the goal that the city’s safety plan was created to reach",
              "The lane also gives students at the high school a safe route for the morning ride"
            ],
            "Slower downtown car traffic is the goal that the city’s safety plan was created to reach",
            "Walk each answer: what is true if it works, and what did it go after?",
            "The parking-lane answer denies the slowdown: defense. The simulation answer weakens their argument through their evidence: an indict, also defense. The safe route is a reason of your own, offense, but their slowdown argument is untouched. Only the safety-plan answer takes the very slowdown they warned about and makes it argue for the lane.",
            "Answer Types"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Four answers to one argument",
              body: "They say: keeping the library open later will exhaust the staff.\n\n“The later-hours plan pays for two new part-time jobs, so nobody’s shift gets longer.” If that works, their argument is gone, and nothing about later hours counts for you yet. That is DEFENSE. It has no second name.\n\n“Their tiredness numbers come from a library ten times our size.” If that works, the judge trusts the numbers less. You got there through the evidence: who made it, what it measured, how it was reached. That is an INDICT, a kind of defense.\n\n“Later hours let people who work until six use the library.” If that works, the judge has a reason to want later hours, and their argument is untouched. That is OFFENSE. No second name either: a reason of your own, beside their argument.\n\n“Evening shifts are the ones our staff ask for most.” If that works, staff welfare, their own concern, is now a reason for your side. That is a TURN: offense where their own argument supplies your reason. You turned their point around.\n\nA turn usually does two things at once: it stops their argument helping them, and it gives you a reason. It is sorted by the reason it gives you."
            },
            {
              heading: "How to tell which one you made",
              body: "First question: if this answer worked perfectly, what would be true in the debate? That gives you the direction: their argument only counts for less, or something now counts for your side.\n\nSecond question: what did the answer go after? That gives you the name. Their evidence, on the defense side: an indict. Their own argument, on the offense side: a turn.\n\nForce does not set the direction. You can destroy their argument completely and still have only defense, because taking their reason away is not giving the judge yours. Evidence quality does not set it either. The same strong study is defense if it finds the result they claim is not there, and a turn if it finds the result runs the other way.\n\nGoing after the evidence usually makes their argument count for less: an indict. But if what you show about their study makes their own argument point your way (their study actually found the opposite), something now counts for you. That is a turn, not an indict.\n\nThe Refutation lesson lets you answer any part an argument leans on, including a step in its reasoning. That is real defense. Only an attack on the evidence itself is an indict."
            },
            {
              heading: "Choosing a direction",
              body: "The names also work before you have an answer. Ask what their argument needs to change. To count for less? That is defense, and an indict if the weak point is the evidence. To start counting for you, through their own argument? That is a turn.\n\nMore than one direction is often open on the same argument. But you cannot reverse an argument that never points your way.\n\nNaming the answer is not making it. “This is a turn” gives the judge no reason to accept it. The reason, and what their argument loses, still have to be said out loud."
            }
          ],
          misconception: {
            wrongModel: "The strongest answer is automatically offense.",
            whyItFails: "The two new part-time jobs win the library argument outright, and that answer is still defense: later hours have not gained a reason. Strong is how well it worked. Offense is where it points.",
            betterModel: "Judge direction by where the answer points, not by how hard it hit."
          },
          commonMistakes: [
            {
              mistake: "Naming the type from the topic, not the effect.",
              whyItFails: "Two answers about one number can point opposite ways.",
              fix: "Direction first, then the name."
            },
            {
              mistake: "Stopping at indict for every attack on evidence.",
              whyItFails: "If their own argument now points your way, that is a turn.",
              fix: "Run the outcome question anyway."
            },
            {
              mistake: "Waiting to see whether the judge buys it before naming the answer.",
              whyItFails: "You sort an answer by what it would do if accepted, not by whether it lands.",
              fix: "Name it from the outcome it aims at."
            }
          ],
          scaffoldedTry: {
            prompt: "They say: moving the farmers’ market to Sunday will cut how much money it makes, because Saturday shoppers are already downtown. Your answer: the stall owners kept records at their old Sunday spot, and they made more money there than on any Saturday here, so the market takes more on a Sunday, not less.",
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
    description: "Split an argument into action, link, and impact; say what an answer does to it; and check that two answers, taken together, do not add up to a reason against your own side.",
    category: "Debate responses",
    order: 12,
    lesson: {
      title: "Turn the right part of the argument",
      slug: "debate-turn-mechanics-lesson",
      summary: "Two jobs: name what your answer does to their argument, and check that two answers you use together do not add up against your own side.",
      estimatedMinutes: 10,
      content: lesson(
        "Split an argument into action, link, and impact; name what an answer does to a part; and check that answers you use together do not add up to a reason against your own side.",
        "Your side wants a skate park in Miller Park. The other side says: “A skate park will bring more teenagers into the neighborhood, and more teenagers around means noise and trouble.”\n\nThat argument is a chain with three parts. ACTION: build the park. LINK: the park brings more teenagers around (the outcome). IMPACT: more teenagers around is bad.\n\nOne sentence can hide all three. Split it with three questions: what would we do, what does it cause, and why is that bad?\n\nTwo jobs follow: name the move; check the pair.",
        "Public Forum judges use these names; many parliamentary judges call all of it refutation. If the words draw blank looks, drop the labels and keep the logic. Building a full answer around the move is the Refutation lesson’s job.",
        ["Map their chain: what action, causing what outcome, and why is that bad?", "Pick the part you are answering: the link or the impact.", "Ask what is true if it fully succeeds: gone (no-link), smaller (impact defense), or the other way (a turn)?", "Count a reversal as a turn only if the result happens because of your side.", "Two answers together? Name each outcome and check it is the same in all four ways, or on the part they share.", "Grant both. If your side now removes the good, or causes the harm, your other answer named, keep the reversal you can win; the other part gets plain defense or silence."],
        {
          prompt: "Same skate park, same argument. Your two drafted reversals: the park pulls teens off the surrounding streets, and teens inside a fenced park are safer. What may you say?",
          weakAnswer: "Two reversals against one argument is a double turn. Drop one.",
          strongAnswer: "Check the pair. Answer one: teens on the surrounding streets, fewer. Answer two: teens inside the park, safer. Different thing, different place — not the same outcome, so they cannot collide. Say both.",
          whyItWorks: "Counting reversals said drop one; the check said keep both. Only a pair about the same outcome can add up against you."
        },
        q("Your team proposes moving the school start time to 9 a.m. The opponent answers: “A later start will push practices into the evening, and evening practices keep athletes out past dark.” Which part of what they said is the link?", ["The school would move its start time from eight in the morning to nine", "A later start will push the school’s sports practices into the evening", "Evening practices keep the school’s athletes out on the roads past dark", "The school day would end an hour later than the families are all used to"], "A later start will push the school’s sports practices into the evening", "The link is the claim that the action causes an outcome.", "The action is moving the start time; the impact is the harm of being out past dark. The link is the middle claim that the action causes the outcome — a later start pushing practices into the evening. The fourth is a real result of the action, but they never said it, so it is no part of their chain.", "Turn Mechanics"),
        [
          q("Your school proposes compost bins in the cafeteria. The opponent argues: “Compost bins will attract pests, and pests in a cafeteria are a health hazard.” You answer: “These are sealed bins emptied daily — schools running this exact system report no change in pest sightings.” If your answer succeeds, what has it done?", ["A link turn: the pest problem they raised now gives the judge a reason to want bins", "A no-link: the outcome they predicted never arrives at all, so nothing new is gained", "An impact turn: the pests arrive, and their presence is defended as good for the school", "Impact defense: the pests still arrive, but they never matter as much as was claimed"], "A no-link: the outcome they predicted never arrives at all, so nothing new is gained", "Ask what is true if it succeeds: has the outcome vanished, or moved the other way?", "The answer says the outcome does not arrive at all. That is a no-link, and it is defense: their argument goes, and nothing new counts for your side. A link turn would have to claim the bins lower pest numbers below what the cafeteria has now, which is not what was said. Neither impact answer fits an outcome the answer denies.", "Turn Mechanics"),
          q("The town proposes lighting the river trail at night. The opponent argues: “Lighting will draw crowds of evening visitors, and nightly crowds are the last thing this quiet neighborhood needs.” You answer: “They are right that the visitors will come, and that is the good news — a trail with people on it every evening is a trail residents feel safe walking.” Which move is that?", ["An impact defense: the crowds still arrive, and the answer cuts how much that presence would cost", "An impact turn: the crowds still arrive, and the answer makes their arrival a reason for the plan", "A link turn: fewer crowds arrive, and the answer says the unlit trail draws more of them now", "A no-link: the crowds do not arrive, and the answer says lighting is not what brings them out"], "An impact turn: the crowds still arrive, and the answer makes their arrival a reason for the plan", "Shrinking leaves the outcome bad. Reversing makes it good.", "The answer never says the crowds will be smaller or quieter. It grants that they arrive and argues their arrival is a benefit, which reverses the impact: an impact turn, and offense. Impact defense would leave the crowds a nuisance and shrink it; the two link answers describe things this answer never claims.", "Turn Mechanics"),
          q("Your side proposes homework-free weekends. The opponent argues: “Without weekend homework students will forget material by Monday, and that forgetting forces teachers to spend class time reteaching.” Which response is an impact turn?", ["Students remember more after real rest, so Monday classes would start sharper than now", "Two days of forgetting needs a five-minute Monday warm-up, a small cost to the week", "Those extra class reviews are how knowledge sticks, so the learning would end up deeper", "Their forgetting claim rests on research about the long summer holiday, not two days away"], "Those extra class reviews are how knowledge sticks, so the learning would end up deeper", "An impact turn grants the outcome and reverses what it is worth.", "Their impact is the reteaching, called a cost. The reteaching answer grants that it happens and argues it is a benefit: an impact turn. The remembering answer reverses the link instead, so it is a link turn. The warm-up answer shrinks the cost and stays defense. The summer-holiday answer attacks their reason to expect any forgetting: nothing granted, nothing reversed, so defense.", "Turn Mechanics")
        ],
        [
          q("Your side proposes a Saturday farmers market in the school lot. The opponent argues: “A market draws outsiders onto campus, and outsiders on school grounds are a safety risk.” You give two answers: a staffed market means fewer unsupervised strangers drifting through the lot than it gets on an empty Saturday now; and the shoppers a market brings are good for the school, because they buy from student fundraisers. Do these two answers add up against your side?", ["Yes, because the drifters and the shoppers are the same outsiders on the same lot", "No, because the first answer names drifters, the second the shoppers a market brings", "Yes, because granting both means the market removes the very shoppers we called good", "No, because a debater may give the judge as many answers as the time allows"], "No, because the first answer names drifters, the second the shoppers a market brings", "Name the outcome each answer is about before you count anything.", "Run the check. The first answer is about strangers drifting through the lot; the second is about shoppers at the stalls. Different people, so the outcomes are not the same. Grant both: the market removes the drifters and brings the shoppers, and nothing we said takes away the good we named. Two reversals do not add up against you just by being two, and how many answers you may give is a separate question.", "Turn Mechanics"),
          q("You are defending a fenced dog park. The opponent argues: “A dog park brings more dogs into the neighborhood, and more dogs mean more noise.” You have drafted two responses: the fenced park pulls the neighborhood’s dogs off the sidewalks into one enclosure, and anyway more dogs around would be good, because dog walkers make streets feel watched. You check the pair before you speak. What should you do?", ["Keep the reversal you can still win, and give the other part plain defense instead of a turn", "Say the two responses answer two different arguments of theirs, so the pair can still stand", "Add a third answer of plain defense that shrinks the noise, and keep both reversals too", "Withdraw the weaker response and admit the park adds noise, so the reversal you can win stands alone"], "Keep the reversal you can still win, and give the other part plain defense instead of a turn", "Two reversals about the same dogs. The check says choose.", "Both answers are about the same outcome — dogs around the neighborhood — and granted together they say your own park removes something you just called good. The check says choose: keep one reversal and let the other part take plain defense or silence. Keeping both reversals leaves the problem in place, and more defense on top does not remove it. The two responses plainly answer the same argument. And admitting that your park adds noise hands them the harm for free — the other part needs defense, not surrender.", "Turn Mechanics")
        ],
        {
          teachingSections: [
            {
              heading: "What one answer is doing",
              body: "Answer the link or the impact: deny it, shrink it, or reverse it (a TURN). Two parts, three moves each: six. Four have names below; the other two are plain defense, meaning defense with no turn in it.\n\nNO-LINK denies the link: “The regional park already has the skaters; this one will not bring more.” Their argument disappears and nothing new counts for your side: that is defense.\n\nLINK TURN reverses the link: “Teens already roam these streets; a park gathers them in one supervised corner, so the streets see fewer.” Their own worry now argues for the park: that is offense — something now counts for you.\n\nIMPACT DEFENSE shrinks the impact: “A dozen skaters on a Saturday is not noise and trouble.” The outcome arrives but matters less than they say. Defense. (Saying “fewer teenagers will come” shrinks the link instead. Defense too.)\n\nIMPACT TURN reverses the impact: “Teenagers out in the open, known to their neighbors, make a street feel alive.” The outcome arrives, and it is good. Offense.\n\nTo tell which move you made, ask: if my answer completely succeeds, what is true? Gone, smaller, or the other way?\n\nA reversal only counts if the result happens because of your side. Teenagers who would be there with or without the park win you nothing — you have not turned anything."
            },
            {
              heading: "When two answers add up against you",
              body: "Now say both reversals together: fewer teenagers around, and more teenagers around would be good.\n\nBoth can even be true at the same time — and that does not make them safe together.\n\nTo grant an answer means to treat it as true for a moment, so you can see what follows. Grant both. Together they say our park removes something we just called good. The other side can agree with both — and use that against the park.\n\nThat pair is a DOUBLE TURN. The problem is what the two answers add up to, not how many reversals you made. Two answers collide when, granted together about the same outcome, they add up to a reason against your own side."
            },
            {
              heading: "Check your answers before you speak",
              body: "Name each outcome so the two can be compared: fewer teenagers around; more teenagers around.\n\nIs that the same outcome in all four ways? (1) the same thing being measured; (2) the same who or what, in the same place; (3) the same stretch of time; (4) the same conditions, such as with the park built.\n\nShare none of them? They cannot collide. Share only part — one answer about all teenagers, the other only about skaters? Run the grant question below on the part they share: the skaters.\n\nTake the good thing, or the harm, that one answer names. Grant both. Does your other answer now make your own side the thing that removes that good, or causes that harm? Same outcome only means the two answers can be compared. This question is what decides it.\n\nIf yes, keep the reversal you can win — the one you have the better reason for. The other part gets plain defense, or silence (say nothing about it)."
            }
          ],
          misconception: {
            wrongModel: "Two reversals against the same argument are a double turn.",
            whyItFails: "Counting is not the test.",
            betterModel: "Name each outcome. If it is the same in all four ways, grant both and ask whether your own side now removes the good, or causes the harm, the other answer named."
          },
          commonMistakes: [
            {
              mistake: "Answering the whole argument at once.",
              whyItFails: "No part disappears, shrinks, or reverses.",
              fix: "Split it into action, link, and impact. Answer one part."
            },
            {
              mistake: "Denying the link and calling it a link turn.",
              whyItFails: "A no-link makes the outcome vanish; a link turn makes your side lower it.",
              fix: "Ask what is true if the answer succeeds: gone, or the other way?"
            },
            {
              mistake: "Reversing an outcome that would arrive either way.",
              whyItFails: "The judge gets no reason to pick you.",
              fix: "Ask: would it happen without us? If yes, it is not a turn."
            },
            {
              mistake: "Fixing a double turn by admitting their harm.",
              whyItFails: "That hands them the harm for free.",
              fix: "Keep the reversal you can win; the rest gets plain defense or silence — never surrender the point."
            },
            {
              mistake: "Calling a reason of your own a turn.",
              whyItFails: "Their argument is untouched by it.",
              fix: "A turn takes their outcome and makes it yours. If yours does not, it is not a turn."
            }
          ],
          scaffoldedTry: {
            prompt: "The opponent argues: “Moving the library’s story hour to Saturday will bring families onto a street that is already busy with weekend traffic, and more people on foot on a busy street is a hazard.” Your answer: “Families on that sidewalk on a Saturday morning are what slows the traffic down — drivers go slower where people are walking, and the crossing outside the library is where that matters most.”",
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
    description: "Pull the role, audience, situation, task and limits out of a role-play scenario.",
    category: "DECA roleplay",
    order: 1,
    lesson: {
      title: "Reading the Scenario",
      slug: "deca-reading-scenarios-lesson",
      summary: "Work out who you are, who is listening, what happened, what you were asked to do, and which facts you actually have.",
      estimatedMinutes: 6,
      content: lesson(
        "Read a role-play scenario and name your role, audience, situation, task, and the facts and limits you were given.",
        "A scenario is the short business situation you are handed before a role-play. It tells you who you are, what is going on, and what you were asked to do. Here is one:\n\n“You are the assistant manager of a coffee shop. Your store manager has asked to meet you. For the last three weeks the morning line has moved slowly, and some customers have left without ordering. Four staff work weekday mornings. The manager wants you to recommend what the shop should do.” (Our scenario, not an official one.)\n\nRead it twice: once for what happened, once for what you were asked to do. Those are not the same thing.",
        "Everything you say is built on this reading. A polished answer to the wrong task is still the wrong task, and an invented fact can be checked against the scenario.",
        [
          "Who am I? — my role.",
          "Who am I talking to? — my audience.",
          "What happened? — the situation.",
          "What am I asked to do? — the task.",
          "What facts and limits do I have?"
        ],
        {
          prompt: "You are a sales associate at a garden centre. The owner has asked to meet you. Since the plant display moved to the back last month, staff have noticed fewer people buying plants. The owner wants your recommendation about the display. (Our scenario, not an official one.)",
          weakAnswer: "Moving the display to the back killed plant sales, so I would put it back at the front and sales would recover.",
          strongAnswer: "I am a sales associate speaking to the owner. The situation is that staff have noticed fewer people buying plants since the display moved to the back last month. My task is to recommend what to do about the display. Nobody has told me why, or what the centre can spend, so I would treat the new position as something to check, not the proven cause.",
          whyItWorks: "It names what the scenario states and stops there. It keeps the move as something to check: the scenario says what staff noticed after it, never that it caused it."
        },
        q(
          "A scenario reads: “You are a shift supervisor at a cinema. Your manager has asked to meet you. Since the new online booking system launched, the ticket-desk queue has been longer on Friday nights. Your manager wants you to recommend how to shorten it.” What is the task?",
          [
            "The ticket-desk queue is longer on Friday nights",
            "Recommend a way to shorten the Friday-night queue",
            "Explain why the online booking system was launched",
            "Decide whether the booking system should be kept"
          ],
          "Recommend a way to shorten the Friday-night queue",
          "The situation is what is happening. The task is what you were asked to do about it.",
          "The longer queue is the situation — it is what is going on. The one thing the manager actually asks for is a recommendation about shortening it. Nothing in the scenario asks you to explain why the system was launched or to decide its future.",
          "Situation or task"
        ),
        [
          q(
            "A scenario says the ticket-desk queue has been longer on Friday nights since a new online booking system launched. Which of these can you state as a fact?",
            [
              "The booking system is what made the queue longer",
              "The queue has been longer since the system launched",
              "Most customers now book online instead of queueing",
              "The ticket desk is short-staffed on Friday nights"
            ],
            "The queue has been longer since the system launched",
            "Since is not because.",
            "The scenario says when the queue got longer, not what caused it. The other three each add something it never says — a cause, a booking habit, and a staffing level.",
            "Fact or assumption"
          ),
          q(
            "You are a sales assistant. Your scenario says nothing about a budget and nothing about hiring. Which recommendation stays inside the role you were given?",
            [
              "I would hire two more assistants for Saturday mornings",
              "I would approve a discount for everyone who waited",
              "I would suggest we look at how shifts run",
              "I would raise the store’s advertising budget this month"
            ],
            "I would suggest we look at how shifts run",
            "Take the job you were given and nothing beyond it.",
            "Three of these hire someone or spend money, and nothing in the scenario says a sales assistant can do either. Suggesting the shop look at how its shifts run is something the role can offer.",
            "Role and authority"
          )
        ],
        [
          q(
            "A scenario reads: “You are a receptionist at a dental practice. The practice has two treatment rooms. The manager has asked you to recommend how to fit in more appointments.” Which of these is a constraint on your answer?",
            [
              "Two treatment rooms are available in the practice",
              "You are the receptionist at the practice",
              "The manager asked you for a recommendation",
              "More appointments should be fitted in each day"
            ],
            "Two treatment rooms are available in the practice",
            "A constraint is a limit your answer has to work within.",
            "Two rooms is the limit any plan has to fit inside. The other three name your role, your audience, and the thing you were asked to do — none of them limits what you can propose.",
            "Constraints"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Who you are, and who is listening",
              body: "Your role is the job the scenario hands you. In the coffee shop you are the assistant manager, talking to your store manager.\n\nThe role decides what you can offer. An assistant manager can recommend a change to the morning shift. They cannot promise to hire, unless the scenario says so.\n\nThe audience decides what is worth saying. A manager wants to know what to do and what it costs. How to speak to them is a separate lesson."
            },
            {
              heading: "What happened, and what you were asked to do",
              body: "The situation is what is going on. The task is what you were asked to do about it. Most scenarios contain both, and it is easy to miss one.\n\nIn the coffee shop, the situation is the slow morning line. The task is to recommend what the shop should do.\n\nYou can understand a situation perfectly and still answer the wrong question. Before planning, say the task back in your own words."
            },
            {
              heading: "The facts you were given, and the limits on your answer",
              body: "Facts are the details the scenario states: three weeks, four staff on weekday mornings, customers leaving without ordering.\n\nA constraint is a limit your answer has to work within — a budget, a deadline, the staff available, a company policy. A fact becomes a constraint when your answer has to fit inside it, so four staff on weekday mornings is both.\n\nThe scenario says nothing about money, so you do not know what you can spend. Not knowing is different from knowing there is none.\n\nNot every scenario carries every limit. A real scenario also lists performance indicators, the things the person scoring you is looking for. A separate lesson teaches what to do with them."
            },
            {
              heading: "A fact on the page is not a guess in your head",
              body: "This one costs the most marks. You may propose an action. You may not treat a guess as though it were already true.\n\nThe scenario never says why the line slowed, or whether you can hire. Say “we are losing customers because we are understaffed” and you have invented a cause. Say “I would check whether the morning shift is understaffed” and you have proposed a step.\n\nIs claims a fact. Would proposes an action."
            }
          ],
          misconception: {
            wrongModel: "The scenario is background. The real work is the recommendation.",
            whyItFails: "Guess the task and a strong answer answers a question nobody asked.",
            betterModel: "The scenario is the brief. The rest of the round is built on reading it accurately."
          },
          commonMistakes: [
            {
              mistake: "Answering the situation instead of the task.",
              whyItFails: "The scenario describes a problem, so it feels like the question.",
              fix: "Find the sentence that asks you for something, and mark it first."
            },
            {
              mistake: "Filling a gap with a number the scenario never gave.",
              whyItFails: "It is easy to catch, and it makes your other numbers look invented too.",
              fix: "Say what you would find out, instead of naming a figure."
            },
            {
              mistake: "Taking authority the role does not come with.",
              whyItFails: "A recommendation the role cannot make is not one the business can use.",
              fix: "Check the job title, then stay inside it."
            },
            {
              mistake: "Starting to solve while you are still reading.",
              whyItFails: "The first idea arrives before the facts, and you then read looking for agreement.",
              fix: "Finish the five questions first. The problem underneath is the next lesson."
            }
          ]
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Identifying the Problem",
    slug: "deca-identifying-problem",
    description: "Say what needs to change, using only the causes the scenario supplies.",
    category: "DECA roleplay",
    order: 2,
    lesson: {
      title: "Identifying the Problem",
      slug: "deca-identifying-problem-lesson",
      summary: "Move from what the scenario says to what actually needs to change — without inventing a reason it never gave.",
      estimatedMinutes: 6,
      content: lesson(
        "Say what needs to change in one sentence, separate from the task, from what you can see, and from any solution.",
        "The problem is the thing that needs to change. It is not the task you were given, and not always the first thing you notice. Here is a scenario:\n\n“You are an assistant manager at a bakery. The owner has asked to meet you. Customers have been picking up the wrong orders. The order slips are handwritten, and staff say orders get mixed up because the slips are hard to read. The owner wants you to recommend what the bakery should do.” (Our scenario, not an official one.)\n\nWhat you notice is that customers get the wrong orders. What needs to change is that orders keep getting mixed up — and here the scenario gives a reason, because staff say the slips are hard to read.",
        "A recommendation is only as good as the problem it answers. Aim at the wrong thing and everything after is wasted. Saying what needs to change is where this lesson stops; what to do about it comes next.",
        [
          "What is going wrong? — the visible issue.",
          "Who or what is affected?",
          "What facts show it?",
          "Does the scenario say why, or is the reason unknown?",
          "What needs to change? — one sentence."
        ],
        {
          prompt: "You are an assistant at a gym. The manager has asked to meet you. Over the past two months fewer members have renewed their memberships. The gym has not changed its prices or its opening hours. The manager wants you to recommend what the gym should do. (Our scenario, not an official one.)",
          weakAnswer: "The problem is that members are bored of the equipment, so we should buy new machines.",
          strongAnswer: "The task is to recommend what the gym should do. The scenario tells me fewer members renewed over the past two months, so it is renewals that are affected. The scenario does not say why, and it tells me price and opening hours have not changed, so I cannot point at either. My problem sentence: fewer members are renewing than two months ago. I would want to know why before saying what to change.",
          whyItWorks: "It says what needs to change without naming a reason the scenario never gave. It also uses what the scenario does rule out."
        },
        q(
          "A scenario reads: “You are a supervisor at a cinema. Your manager has asked to meet you. Since a new snack counter opened, people waiting for snacks have been blocking the ticket queue. Your manager wants you to recommend how to fix the queue.” Which of these is the problem?",
          [
            "You were asked to recommend a fix for the queue",
            "People waiting for snacks are blocking the ticket queue",
            "The cinema should move its snack counter elsewhere",
            "The new snack counter is popular with customers"
          ],
          "People waiting for snacks are blocking the ticket queue",
          "The task is what you were asked for. The problem is what needs to change.",
          "The blocked queue is what needs to change. Being asked for a recommendation is the task, and moving the counter is something you could do about it. Nothing on the page says the counter is popular.",
          "Task or problem"
        ),
        [
          q(
            "A scenario says only that a shop’s sales have fallen over the last three months. It gives no other information. Which problem statement does it support?",
            [
              "Sales have fallen over the last three months",
              "Sales fell because the prices are too high",
              "Sales fell because a competitor opened nearby",
              "Sales fell because the shop stopped advertising"
            ],
            "Sales have fallen over the last three months",
            "A scenario that says nothing about the cause has not given you one.",
            "Only one of these says what the scenario actually says. The others each add a reason the page never mentions, and any of them could be wrong without the scenario contradicting itself.",
            "Supported cause"
          ),
          q(
            "A scenario says a library’s evening study room is often full while its morning room sits empty. Which of these is a problem rather than a solution?",
            [
              "The library should open another evening study room",
              "The library should move chairs into the morning room",
              "Evening study space runs out while mornings sit empty",
              "The library should let students book a room ahead"
            ],
            "Evening study space runs out while mornings sit empty",
            "A solution is something to do. A problem is something that needs to change.",
            "Three of these start with something the library should do, which makes them answers. Only one says what is actually going wrong.",
            "Problem or solution"
          )
        ],
        [
          q(
            "A scenario reads: “You are a receptionist at a vet clinic. The manager has asked to meet you. Appointments have been running late all week. The clinic books one appointment every ten minutes, and staff say most check-ups take longer than that.” Which problem statement does it support?",
            [
              "Appointments have been running late all week",
              "The clinic should book fewer appointments each day",
              "The staff at the clinic are working too slowly",
              "Appointments are booked closer together than check-ups take"
            ],
            "Appointments are booked closer together than check-ups take",
            "This scenario does give you a reason — so you may use it.",
            "Ten-minute slots against check-ups that take longer is on the page, so it belongs in the problem. Running late is what you notice, booking fewer is something you could do, and nothing says anyone is working too slowly.",
            "Supported cause"
          )
        ],
        {
          teachingSections: [
            {
              heading: "The task is not the problem",
              body: "The task is what you were asked to produce. The problem is what needs to change. Two different sentences.\n\nAt the bakery the task is to recommend what the bakery should do. The problem is that orders are being mixed up.\n\n“The problem is that I need to make a recommendation” names nothing that is wrong. It is the task wearing the word problem."
            },
            {
              heading: "What you notice is not always what needs changing",
              body: "The thing you can see is the symptom: complaints went up, orders are late, sales fell. It is real, it is where you start, and sometimes it is the whole story.\n\nBut it is not automatically the thing to fix. Not every scenario has something underneath: sometimes the visible issue is the issue. Look for what the facts support, not a hidden layer that has to be there.\n\nSometimes there is more. Customers getting the wrong orders is what happens; the handwritten slips are what staff say produces it."
            },
            {
              heading: "Only a cause the scenario gives you",
              body: "Sometimes the scenario tells you why. The bakery one does, because staff say the slips are hard to read. That is on the page, so you may use it.\n\nOften it does not. If a scenario says only that sales fell, you do not know why. It might be price, a competitor, or the weather — possibilities, not facts.\n\nSome facts are neither a reason nor ruled out. The scenario states them and never connects them to what is going wrong; leave those where they are.\n\nA scenario silent about the cause has not given you one, and silence is not permission to pick whichever reason sounds best. “Sales have fallen over the last three months” beats a reason you made up."
            },
            {
              heading: "A solution is not a problem, and one sentence is enough",
              body: "“We should start a loyalty card” is something to do. “Customers rarely come back after a first visit” is something that needs to change. Only the second is a problem.\n\nWrite the problem as one sentence. Where the scenario gives a cause you may include it: staff say orders get mixed up because the handwritten slips are hard to read."
            }
          ],
          misconception: {
            wrongModel: "Every scenario hides a deeper cause, and my job is to dig it out.",
            whyItFails: "It pushes you into inventing one when the scenario supplies none, and an invented cause is easier to knock down than none.",
            betterModel: "Use the cause the scenario gives you. Where it gives none, say what needs to change and leave why open."
          },
          commonMistakes: [
            {
              mistake: "Restating the task as the problem.",
              whyItFails: "The task is what you were asked for, so it feels like the subject.",
              fix: "Check your sentence says what is wrong, not what you were asked to do."
            },
            {
              mistake: "Naming a cause the scenario never gave.",
              whyItFails: "It is the easiest thing to challenge, and it takes your recommendation down with it.",
              fix: "If the scenario is silent, say what needs to change and stop."
            },
            {
              mistake: "Writing a solution and calling it the problem.",
              whyItFails: "A solution answers a question you have not asked yet.",
              fix: "If your sentence contains “we should”, it is not the problem."
            }
          ]
        }
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
  // P1-B1 (2026-09-09) — the teaching owner for the DECA `performance-indicators` drill area.
  //
  // WHY THIS LESSON EXISTS. The four DECA drill areas each write real mastery to a real Skill row,
  // but the B5 architecture audit found that no published lesson taught any of the constructs those
  // drills test. `how-deca-roleplay-works` owns the EVENT — what a role-play is, the sequence, the
  // recommendation scaffold — and defines a performance indicator in one key idea. It does not own
  // the skill of turning one indicator into a response, which is what the 30-item bank measures.
  //
  // WHAT THIS LESSON OWNS, and deliberately not more: decode the indicator into a plain question,
  // read its subject and its full predicate, let the verb set the job, explain the idea AND use it
  // on this scenario, cover every listed indicator, and check the result the indicator names.
  //
  // WHAT IT DOES NOT TEACH, recorded so the gap is not mistaken for coverage:
  //   - the instructional-area rules (pi-09, pi-24). "Instructional area" appears nowhere in any
  //     published lesson, and the term sits directly beside the HELD pi-26 weighting claim, whose
  //     owner gate requires a primary official source that does not exist yet.
  //   - how far an assigned role's authority extends (pi-17's second half).
  //   - card parsing: separating the scored list from problem, constraint and roles (pi-20).
  // These stay drill-only until a later slice teaches them; pi-26 stays HELD either way.
  //
  // NO WEIGHTING CLAIM. Nothing below says an indicator is worth a stated number of points, that
  // one indicator outweighs another, or that CompeteReady scores indicators officially. The example
  // indicators are CompeteReady's own and say so.
  {
    organization: "DECA",
    track: "DECA",
    name: "Performance Indicators",
    // The lesson's own id, NOT the `deca-performance-indicators` Skill slug. Keeping them distinct
    // matters: `resolveSkillsSlug` rule 1 redirects any slug that is a registry lesson id, so
    // reusing the skill slug here would turn `/skills/deca-performance-indicators/practice` from an
    // honest "not supported for DECA" page into a 404 for any learner with a due review. The skill
    // association is made once, by exact slug, on the registry entry's `skillSlug`.
    slug: "deca-understanding-performance-indicators",
    description: "Work out what a listed performance indicator asks, then demonstrate it in the scenario.",
    category: "DECA roleplay",
    order: 4,
    lesson: {
      title: "Understanding Performance Indicators",
      slug: "deca-understanding-performance-indicators-lesson",
      summary: "Work out what an indicator asks for, show the business idea, and use it on your own scenario.",
      estimatedMinutes: 8,
      content: lesson(
        "Work out what a listed performance indicator is asking for, then show that business idea inside your own scenario.",
        "A performance indicator is a business skill the judge expects to see you use. They are listed on your scenario card — the sheet you are handed before a role-play, which sets the situation and says who you are. The wording is formal and textbook.\n\nHere is one. Explain how businesses build customer loyalty. A weak answer: “Customer loyalty is really important for us.” A better answer: “Let’s give a free coffee on every sixth visit. Regulars get a reason to come back here instead of the shop over the road. And keeping a regular costs less than finding someone new.”\n\nThe second answer shows the idea working. The first only mentions it.\n\nThat gap is the whole skill. Saying the indicator’s words does not cover it. You cover it when the judge can hear you understand the idea, and see you use it here.\n\nThe indicators in this lesson are examples we wrote. Real ones come from your own card, worded differently.",
        "Role-play events are commonly scored on how well you show each listed indicator. So a perfect answer to one cannot make up for two you never reached.",
        [
          "Say the indicator back as a plain question.",
          "Name its subject, and what it says about that subject.",
          "Let the first word set the job.",
          "Explain the idea, then use it on this scenario.",
          "Say what you would watch to know it worked."
        ],
        {
          prompt: "You are the assistant manager of a small gym. Membership has fallen over the last three months. The judge plays the owner. A listed indicator reads: Explain the nature of customer retention. (Our example, not an official one.)",
          weakAnswer: "Customer retention is really important for a gym. We should focus on keeping our members happy.",
          strongAnswer: "Retention is keeping the members we already have, and it costs less than replacing them. Ours go quiet around month three. I’d have a trainer ring anyone who misses two weeks and offer a free session. Then I’d watch how many of them are still training three months later.",
          whyItWorks: "It says what retention is and why it saves money. Then it acts, in this gym. The check is about members staying — what the indicator names."
        },
        q(
          "A listed indicator reads “Explain the nature of inventory control in a small shop.” What is the most useful first move?",
          [
            "Say the indicator’s title out loud so the judge hears you cover it",
            "Put it in your own words, as a question you could answer",
            "Write out the textbook definition of inventory control from memory",
            "Pick whichever business idea you already know best and use that one"
          ],
          "Put it in your own words, as a question you could answer",
          "You cannot show something you have not pinned down.",
          "In plain words it becomes: what is stock costing this shop, and what should be on the shelf? Now there is something to answer. The other three start building before the indicator is understood.",
          "Decoding an indicator"
        ),
        [
          q(
            "A listed indicator begins with the word “Demonstrate.” What does that first word change?",
            [
              "You should define the term carefully before using it anywhere else",
              "You should name the indicator first, so the judge knows it is coming",
              "You have to do the thing in the meeting, rather than describe it",
              "You should leave it until last, once the rest of your plan is explained"
            ],
            "You have to do the thing in the meeting, rather than describe it",
            "Some indicators ask for an action, not an idea.",
            "“Demonstrate” asks for the thing itself, live. A perfect account of the procedure never lets the judge see it happen. Plan the moment instead: what will you actually do?",
            "Indicator verbs"
          ),
          q(
            "A listed indicator reads “Explain the nature of word-of-mouth promotion.” Which response does both halves of the job?",
            [
              "What word of mouth does for a business, and what it does here",
              "A careful definition of word of mouth, and of how it spreads between people",
              "A decision to run a referral offer next month, stated clearly and confidently",
              "A promise to think about word of mouth and report back after the meeting"
            ],
            "What word of mouth does for a business, and what it does here",
            "The idea, and then this business.",
            "A definition on its own is knowledge with nowhere to go. A decision on its own leaves the reasoning unsaid. Carrying the idea into this business does both jobs at once.",
            "Explain and apply"
          ),
          q(
            "A listed indicator is about employee motivation. A student clearly explains what motivates the shop’s customers instead. Against that indicator, the response has:",
            [
              "covered it, because the explanation was clear and well organised",
              "covered it, because customers and staff both respond to motivation",
              "explained the right subject, but at the wrong point in the meeting",
              "explained the wrong subject, so the listed skill went unshown"
            ],
            "explained the wrong subject, so the listed skill went unshown",
            "An indicator names a subject as well as a job.",
            "The explanation is good, and it is about the wrong people. Adjacent topics are different skills, and only the unlisted one got shown.",
            "Reading the whole indicator"
          )
        ],
        [
          q(
            "You move a café to smaller, more frequent milk deliveries. The listed indicator is about controlling stock costs. Which result best shows the judge it worked?",
            [
              "How quickly the new supplier confirmed the change to smaller orders",
              "Whether the staff found the new delivery routine easier to manage",
              "How many deliveries the café ended up receiving in an average week",
              "What the café spent on milk it threw away, before and after"
            ],
            "What the café spent on milk it threw away, before and after",
            "Measure the thing the indicator names.",
            "The indicator is about stock costs, so the check has to be about money spent on stock. Supplier speed, staff comfort and delivery counts all describe the change instead.",
            "Checking the result"
          )
        ],
        {
          teachingSections: [
            {
              heading: "What is it really asking?",
              body: "First, say it back as a plain question. Take “Explain the nature of staff morale in a shop.” In plain words: what makes staff here feel good or bad, and why does that matter? Now you can answer it. Many indicators start with “Explain the nature of…”, which just means: say what it is, and why it matters here.\n\nRead the whole line, not just the topic. An indicator names a subject, and says something about it. One about employee motivation is not covered by explaining what motivates customers.\n\nThe first word sets the job. Explain and describe ask you to make the idea clear. Analyse asks you to break the situation up: which parts it affects, and how they knock into each other. Evaluate asks for a choice and the reasons behind it. Demonstrate asks you to do the thing, live."
            },
            {
              heading: "Show the idea, then use it here",
              body: "A full answer has two halves. First the idea: what the concept is, and why it matters. Then the use: what it means for this business, this problem, these limits. The same indicator asks for different things in different scenarios, so a general definition is not enough.\n\nThen finish it. Say what you would watch to know it worked. Keep that check on the thing the indicator names. If the scenario gives you nothing to measure, say so rather than invent a number."
            },
            {
              heading: "Cover the whole list",
              body: "The judge is looking for every indicator on the list, whether or not their own questions reach it. If the conversation never reaches one, steer your answer there and show the idea working. While you plan, get one workable line on each before you make any of them longer.\n\nTwo indicators on one topic are still two jobs. “Describe the refund policy” and “Apply it to this customer’s request” ask for different things.\n\nA budget or a staffing limit shapes how you show an indicator. A limit like that is not itself an indicator."
            }
          ],
          misconception: {
            wrongModel: "If I say the indicator out loud, or mention its topic, I have covered it.",
            whyItFails: "Repeating the wording shows you can read. An answer that names every indicator and shows none has shown none.",
            betterModel: "It is covered when someone who never saw your card could hear your answer and tell you understood the idea and used it."
          },
          commonMistakes: [
            {
              mistake: "Stopping at a definition when the indicator says demonstrate.",
              whyItFails: "Describing how you would calm an unhappy customer is not calming the one the judge is playing.",
              fix: "When the verb asks for an action, plan the moment the judge watches."
            },
            {
              mistake: "Doing brilliant work on something that was not listed.",
              whyItFails: "Extra strength makes the meeting better. It still cannot stand in for a listed skill.",
              fix: "Reach every listed indicator first. Then give your remaining time to the weakest one."
            }
          ]
        }
      )
    }
  },
  // P1-B2 (2026-09-09) — the teaching owner for the DECA `business-reasoning` drill area.
  //
  // WHAT ORIENTATION ALREADY OWNS, and this lesson must not restate: the five-part recommendation
  // scaffold in lib/roleplay-lessons.ts (Problem / Recommendation / Business reason / Implementation
  // / Measurement), its honesty caveat, and the rule that a recommendation without a reason is an
  // opinion a judge can dismiss. Orientation names the slots and says a beginner who stops after
  // "Recommendation" has under-answered. It never teaches how to FILL them. That gap is this lesson.
  //
  // WHAT THIS LESSON OWNS: feasibility against every stated limit; what counts as a material cost;
  // building the reason from facts the scenario supplies rather than from a rule true of any
  // business; measurement as metric + comparison + target; picking the measure the stated problem
  // names; checking the business can collect it; pairing a cost with the return; and a tradeoff that
  // names both sides. De-risking rides in a common mistake.
  //
  // WHAT IT DOES NOT TEACH, recorded so the gap is not mistaken for coverage:
  //   - ROI and break-even as formal definitions (br-02, br-06). Finance vocabulary whose distractors
  //     turn on margin, cost of goods sold and payback period. A plain-language clause only.
  //   - arithmetic on stem numbers (br-11, br-18, br-30) — the habit is taught, the sums are not.
  //   - sequencing and multi-constraint scheduling (br-16, br-19). The bank deliberately names no
  //     sequencing method, so inventing one here would be new unsourced doctrine.
  //   - settlement and cash flow (br-24); impact/effort prioritisation (br-09) beyond one clause.
  //   - exposure larger than a headline percentage (br-21).
  //
  // NOT PERFORMANCE INDICATORS: the PI lesson owns working out what skill the card asks you to show,
  // and its measurement rule is anchored to the INDICATOR. This lesson's measurement rule is anchored
  // to the BUSINESS PROBLEM the scenario states. NOT ROOT-CAUSE either: the held identifying-problem
  // entry owns symptom-versus-cause and keeps it.
  //
  // NO FAKE PRECISION, and no borrowed vocabulary: nothing below invents a price, a percentage or a
  // customer count, and the word "competitor" is never used to mean the student — the bank uses it in
  // both senses and the role-play lesson already establishes "the participant (you)".
  {
    organization: "DECA",
    track: "DECA",
    name: "Business Reasoning",
    // The lesson's own id, NOT the `deca-business-reasoning` Skill slug — the same rule P1-B1
    // established. `resolveSkillsSlug` rule 1 redirects any slug that is a registry lesson id, so
    // reusing the skill slug would turn `/skills/deca-business-reasoning/practice` from an honest
    // DECA compatibility page into a 404 for a learner with a due review.
    slug: "deca-justifying-your-recommendation",
    description: "Test a recommendation for feasibility, benefit, measurement and cost before you say it.",
    category: "DECA roleplay",
    order: 5,
    lesson: {
      title: "Justifying Your Recommendation",
      slug: "deca-justifying-your-recommendation-lesson",
      summary: "Turn an idea into a business decision: can this business do it, what would it gain, and what does it cost?",
      estimatedMinutes: 8,
      content: lesson(
        "Test a recommendation before you say it, and give the reason that makes it worth doing at this business.",
        "A recommendation is what you would do. Business reasoning is why it would work here.\n\nCompare these two. “The shop should start a loyalty program.” Now the same idea with reasoning: “The shop could run a points scheme through the checkout system it already has. Setup costs almost nothing, regulars get a reason to come back, and the manager can check whether repeat visits go up.”\n\nBoth name the same action. Only the second says the shop can do it, what it gets back, and how anyone would know. That is the gap between an idea and a business decision.\n\nThe scenarios and figures here are ours. Yours come from your own scenario card: the sheet handed to you before a role-play — the practice meeting where you explain a recommendation to a judge. It sets the situation and its limits.",
        "Judges hear plenty of ideas. Yours holds up when it survives the next question. Reasoning lets you answer “what will this cost us?” without inventing anything.",
        [
          "Can we do it? Check the plan against every limit the card states.",
          "Why would it help? Build the reason from a fact on the card.",
          "How would we know? Name what you would watch and what it must reach.",
          "What does it cost? Say what it uses up, and why the gain is worth it."
        ],
        {
          prompt: "You are the assistant manager of a bike shop. Repairs are booked three weeks out and the shop turns away about ten jobs a week. There is a spare bench, and one mechanic who works Saturdays only. The judge is playing the owner. (Our scenario, not an official one.)",
          weakAnswer: "We should hire another mechanic. More repairs would mean more money coming in for the shop.",
          strongAnswer: "I’d move the Saturday mechanic to two weekday evenings. The bench is there, so the cost is his hours. That puts a second mechanic on the ten jobs we turn away. Saturdays lose their cover, so I’d try it for two months. The measure is the booking wait — three weeks now, and I want it under one week.",
          whyItWorks: "It fits what the shop has, and every fact about the shop comes off the card. It names the cost, says what the shop gives up, and picks one measure with a before."
        },
        q(
          "Which of these is business reasoning, rather than just an idea?",
          [
            "Open a second shop downtown next year, starting early in the spring",
            "Improve our customer service, because good service always matters to every business",
            "Open Sundays, because the market next door runs then and draws customers",
            "Launch a loyalty card for regulars at the start of next month"
          ],
          "Open Sundays, because the market next door runs then and draws customers",
          "Which one says why, using something about this business?",
          "Three of these say what to do. Only one gives a reason drawn from this shop’s own situation — the market next door. Naming a season or a launch date makes a plan specific, not justified.",
          "Idea versus reasoning"
        ),
        [
          q(
            "A shop has $400 and four staff-hours for a one-week promotion. Which plan is feasible?",
            [
              "A window display and a flyer drop, using stock the shop already has",
              "A radio ad the local station quotes at $900 for the week",
              "A weekend sampling stand, staffed for six hours by two paid assistants",
              "A printed catalog, quoted at $700 for the print run before any postage"
            ],
            "A window display and a flyer drop, using stock the shop already has",
            "Check the plan against both limits, not just the easier one.",
            "Feasible means the business can actually carry it out with what it has. Only the display and flyers stay inside both the money and the hours. Two assistants for six hours is twelve staff-hours against four, and the two quoted prices are both above $400.",
            "Feasibility"
          ),
          q(
            "The judge asks what your plan will cost. The scenario gives no prices. What is the strongest answer?",
            [
              "A confident figure, because a judge would rather hear a number than a hedge",
              "A rough percentage of last year’s sales, worked out on the spot",
              "Nothing about cost, since the scenario never supplied any prices at all",
              "What the plan uses up in hours and materials, and how you’d price it"
            ],
            "What the plan uses up in hours and materials, and how you’d price it",
            "Specific logic beats an invented number.",
            "You can be exact about what a plan consumes without inventing a price for it. A made-up figure and a percentage worked out on the spot both fall apart under one follow-up, and saying nothing leaves the question unanswered.",
            "Cost without fake numbers"
          ),
          q(
            "A salon’s stated problem is that clients book once and never rebook. It starts offering a rebooking discount at checkout. Which measure shows whether that problem improved?",
            [
              "Total sales for the month after the discount started",
              "The share of clients who book a second appointment",
              "How many clients say they liked being offered a discount",
              "The number of discounts handed out at the checkout"
            ],
            "The share of clients who book a second appointment",
            "Measure the problem the scenario named.",
            "The problem was clients not coming back, so the measure has to be clients coming back. Total sales move for other reasons, discounts handed out counts the action rather than the result, and an opinion is not the behaviour.",
            "Choosing a measure"
          )
        ],
        [
          q(
            "A car wash is deciding whether to add a Saturday morning shift. Which reason best supports it?",
            [
              "Weekend trade is growing across the car-wash sector as a whole",
              "Customers always prefer having more times available to them",
              "The site sits idle on Saturdays and the booking line logs refusals then",
              "Rivals in the area open Saturdays, so this one must be losing that work"
            ],
            "The site sits idle on Saturdays and the booking line logs refusals then",
            "Which reason uses something the scenario states?",
            "Only one is built from this car wash: a site standing idle and refusals already logged. A sector trend, a claim about what customers always prefer, and an assumption about what rivals are taking would each be true of almost any business.",
            "Reasons built from facts"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Can we do it?",
              body: "Feasible does not mean good. It means the business can carry the plan out with what it has. Check it against every limit the card states, not just the easiest one. One staff-hour means one person’s work for one hour. A plan that fits the budget but needs six from a shop with three is not feasible.\n\nBe careful what you count as a cost. A cost uses up money, time or capacity — the work a business can handle — enough to notice. Getting used to a new order form does not. Relabeling four hundred shelf tags does, because someone has to stand there and do it."
            },
            {
              heading: "Why would it help, and how would we know?",
              body: "Build the reason out of facts the scenario gave you. A reason that would be true of any business — “customers like convenience” — proves nothing about this one.\n\nThen say how the business would know. A useful answer names the measure, what you would compare it to, and what would count as working. “Sales went up” is not enough, because sales move for all sorts of reasons.\n\nPick the measure that matches the problem the scenario named, and check the business can actually collect it. A shop with no customer accounts cannot track repeat visits."
            },
            {
              heading: "What does it cost?",
              body: "When you name a cost, put it beside what the business gets back. A price alone does not answer the question, and nor does a benefit with no price. Return on investment asks whether the benefit was worth what the business spent.\n\nMost plans have a downside as well as an upside, and weighing the two is a tradeoff. Say the downside, then say why the gain still wins. “This costs more up front, but it pays back by spring” is a tradeoff. Naming only the good half is not."
            }
          ],
          misconception: {
            wrongModel: "If my idea is specific enough — what, who and when — it counts as business reasoning.",
            whyItFails: "Specific is not the same as justified. A plan can name staffing and dates and still not say why this business should do it.",
            betterModel: "The reasoning is the part that could change the owner’s mind. Take it away and you are left with an idea nobody has argued for."
          },
          commonMistakes: [
            {
              mistake: "Inventing numbers the scenario never gave you.",
              whyItFails: "A made-up percentage falls apart under one follow-up, and the judge cannot check it.",
              fix: "Use the figures on the card. If you need one that is not there, say what you would look up."
            },
            {
              mistake: "Backing a plan with a rule that would fit any business.",
              whyItFails: "“Faster is always better” and “every plan carries risk” are true everywhere, so they say nothing about this shop.",
              fix: "Point at something the scenario actually states."
            },
            {
              mistake: "Dropping the plan when the judge says it has been tried before.",
              whyItFails: "Giving up answers nothing, and repeating the plan louder answers nothing either.",
              fix: "Offer a smaller or shorter version that would show whether it works this time."
            }
          ]
        }
      )
    }
  },
  // P1-B3 (2026-09-09) — the teaching owner for the DECA `customer-relations` drill area, and the
  // FIRST cluster-knowledge lesson. It does NOT belong in the role-play course: the published DECA
  // course map is eleven performance steps and names no content area, and the approved curriculum
  // (docs/curriculum/02-deca-course.md, BC-1) states outright that Customer Relations and Marketing
  // Fundamentals "are content areas the performance course never covers, so they are taught here, in
  // their own section". Hence the separate DECA Business-Content course in the registry.
  //
  // THE SPINE IS THE APPROVED CORE DEFINITION, not one invented here. docs/curriculum/02-deca-course.md:
  // "Customer Relations is deciding what to say and do in a customer interaction, using the facts you
  // actually have, the policy that applies, the options genuinely available, and the authority your
  // role carries." Those four inputs — facts, policy, options, authority — organise the whole lesson,
  // and they are the four the 30-item bank actually turns on.
  //
  // WHAT THIS LESSON OWNS: paraphrase-to-confirm; asking a question only when the answer changes the
  // remedy; separating what is established from what is not; not committing to a remedy before its
  // precondition is confirmed; the stated policy as a ceiling in BOTH the offer and the description
  // direction; that a true sentence naming no option is not an answer; letting the customer's stated
  // constraint choose between two allowed remedies; acting inside your authority and escalating only
  // what exceeds it; and warmth as no substitute for a promise the business can keep.
  //
  // WHAT IT DOES NOT TEACH, recorded so the gap is not mistaken for coverage:
  //   - CR2-CR6 at their full curriculum depth. This is one lesson for one drill area, not six.
  //   - proportionate response as its own construct (cr-14, cr-19, cr-28, cr-30 also test it).
  //   - plain-language register versus internal jargon (cr-08, cr-23) — the held
  //     deca-professional-communication entry is reserved for speaking structure and tone.
  //   - retention economics beyond a clause: the PI lesson already owns it.
  //   - cost, feasibility, tradeoff and measurement: the business-reasoning lesson owns those, and the
  //     bank's own scope note holds the same boundary.
  //
  // BANK DEBT, recorded and NOT repaired: cr-07 frames follow-up as universally good while cr-29 keys
  // the opposite and rejects "following up is always good service"; this lesson teaches cr-29's rule.
  // cr-09 teaches "exceeding expectations", which the approved curriculum rejects as a concept. cr-17
  // and cr-18 carry positional-rationale debt under the six-item waiver and are untouched.
  //
  // NO ROLE-PLAY SCORING CLAIM: nothing below says this drill is judged, that mastery here means
  // role-play readiness, or that any official rubric contains a customer-relations category.
  {
    organization: "DECA",
    track: "DECA",
    name: "Customer Relations",
    // The lesson's own id, NOT the `deca-customer-relations` Skill slug — the rule P1-B1 established
    // and P1-B2 carried: `resolveSkillsSlug` rule 1 redirects any slug that is a registry lesson id,
    // which would 404 `/skills/deca-customer-relations/practice` for a learner with a due review.
    slug: "deca-handling-customer-situations",
    description: "Decide what to say to a customer using the facts, the policy, the real options, and your authority.",
    category: "DECA business content",
    order: 6,
    lesson: {
      title: "Handling Customer Situations",
      slug: "deca-handling-customer-situations-lesson",
      summary: "Work out what the customer needs, what the policy allows, which options are real, and what your job lets you decide.",
      estimatedMinutes: 8,
      content: lesson(
        "Decide what to say in a customer situation using the facts you have, the policy that applies, the options that are real, and the authority your job carries.",
        "Customer relations is deciding what to say and do when a customer needs something. Four things decide it: the facts you have, the policy that applies, the options you really have, and what your job lets you decide.\n\nA customer ordered a chocolate cake and the bakery made vanilla. A weak reply: “Sorry, that’s our policy.” A better one: “Let me check I have this right — you ordered chocolate and we made vanilla. I can remake it this afternoon, or refund it now. Which suits you better?”\n\nThe second reply is not warmer. It is more useful. It checks the facts, names what the bakery can do, and lets the customer choose. Warmth alone fixes nothing, and nor does reading out a rule.\n\nThe scenarios here are ours. A real one states its own policy and limits, and those are what your answer must fit.",
        "A customer remembers whether they were dealt with straight. The replies that hold up are the ones the business can keep.",
        [
          "Say the concern back, and check you have it right.",
          "Separate what is established from what is not.",
          "Say what the policy allows, and which options are real.",
          "Do what you can decide, and pass on what you cannot."
        ],
        {
          prompt: "You work at a repair desk. A customer paid for a delivery that never arrived, and the delivery company has not reported back. You may re-send it at no charge. Refunds need a manager, and one is on shift. (Our scenario, not an official one.)",
          weakAnswer: "I’m so sorry, that is completely our fault. I’ll refund you right now and make sure it never happens again.",
          strongAnswer: "I’m sorry you have been left without your order. I don’t know yet what happened, so I’d rather find out than guess. What I can do is send a replacement at no charge. If you would rather have the money back, that is a manager’s call, and one is here, so I can ask now.",
          whyItWorks: "It acknowledges the part that is certain and leaves the cause open. It offers what this job allows, and is honest that the refund belongs to someone else rather than calling it impossible."
        },
        q(
          "A customer says: “I paid extra for next-day delivery, waited in all Saturday, and it turned up on Monday.” Which reply best shows you understood?",
          [
            "That sounds frustrating, and I am very sorry for all the trouble",
            "Let me look into what went wrong with that delivery for you",
            "So you paid extra for next-day, waited in all Saturday, and it came Monday",
            "So you paid for Saturday delivery, waited in, and lost the day"
          ],
          "So you paid for Saturday delivery, waited in, and lost the day",
          "Show you followed it, without simply repeating it.",
          "Saying it back in your own words shows you followed it, including what it cost them — a lost Saturday. Giving the sentence back unchanged proves only that you heard the words, sympathy on its own skips the checking, and going off to investigate moves on before anything is confirmed.",
          "Checking you understood"
        ),
        [
          q(
            "A gym freezes a membership for up to three months a year, with two weeks’ notice. A colleague tells a member “you can freeze it whenever you like.” What is wrong with that?",
            [
              "It is too informal for a conversation about membership terms",
              "It describes a wider policy than the gym actually has",
              "It should have come from a manager rather than a colleague",
              "It gives away detail the member did not need to hear"
            ],
            "It describes a wider policy than the gym actually has",
            "Compare the promise with the stated rule.",
            "The rule has two limits and the sentence has none. A member who acts on it gets told something different later, which is worse than hearing the real rule now. How formal it sounded and who said it are not the problem.",
            "Describing policy accurately"
          ),
          q(
            "A salon redoes a cut free within seven days. A customer comes back on day ten. You are able to offer 20% off their next visit. Which reply is weakest?",
            [
              "Our free redo period runs for the first seven days after the appointment",
              "It is past seven days, but I can take 20% off your next visit",
              "I can’t redo it free now, though I can discount your next visit",
              "That is outside the redo window — shall I apply 20% next time?"
            ],
            "Our free redo period runs for the first seven days after the appointment",
            "Correct is not the same as helpful.",
            "It is true, and it leaves the customer with nothing. Something is still available and it is yours to offer, so a reply that stops at the rule answers the rule instead of the person.",
            "Naming the real option"
          ),
          q(
            "A customer’s coffee was made with the wrong milk. You are allowed to remake it free. Your supervisor is standing nearby. What should you do?",
            [
              "Ask the supervisor to approve it, so the customer feels looked after",
              "Explain the remake policy in full before deciding what to do",
              "Remake it now, since it is something you are allowed to do",
              "Check with the supervisor first, in case the rule has changed"
            ],
            "Remake it now, since it is something you are allowed to do",
            "Escalation is for what you cannot decide.",
            "It is inside the policy and inside your job, so it is yours to do. Fetching a supervisor for it costs the customer time, and reading out the policy answers a question nobody asked.",
            "Working inside your authority"
          )
        ],
        [
          q(
            "A parent says nobody joined their child’s online lesson yesterday. You have not checked the session log yet. Which reply is best?",
            [
              "I’m sorry, our tutor clearly missed it — I’ll credit the lesson now",
              "I’m sorry the lesson did not happen. Let me check the log first",
              "The tutor says they were online, so the problem was probably your end",
              "I can’t comment at all until I have looked at the session log"
            ],
            "I’m sorry the lesson did not happen. Let me check the log first",
            "Acknowledge what is certain; check what is not.",
            "The missed lesson is certain and can be acknowledged now. Whose fault it was is not, so blaming the tutor, blaming the parent, and refusing to say anything at all each go past what is known.",
            "Acknowledge, then check"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Start with the facts you have",
              body: "Say the concern back in your own words before you solve it. That is active listening. Say what it cost them, not only what happened. Repeating their sentence back proves you heard it and nothing more.\n\nAsk a question only when the answer would change what you do. If an order “isn’t right”, one question settles it: is something missing, wrong, or damaged? If it is in front of you and covered, more questions only delay the fix.\n\nSome things are established and some are not. You can say a customer lost their afternoon. You cannot say whose fault it was, or promise the fix that depends on it, until someone has checked. Fixing a service problem afterwards is called service recovery."
            },
            {
              heading: "Say what the policy allows, and what is real",
              body: "The stated policy is the ceiling. You cannot offer more than it allows, or describe it as broader than it is. A generous-sounding promise just sets the customer up for a no later.\n\nA true sentence is not automatically an answer. “Our returns run 30 days” is accurate and leaves the customer with nothing. If store credit — money to spend there later — is available, say so.\n\nWhen two options are both allowed, the customer’s own deadline decides. If they need it Thursday, the five-day option is not the one."
            },
            {
              heading: "Know what you can decide",
              body: "In a job, different people can approve different things. Some decisions are yours, some are your manager’s, and some the business does not offer at all.\n\nIf it is yours, do it. Fetching a manager for something you are allowed to do just costs the customer time.\n\nIf it is above you, do not call it impossible. Say what you can do, and bring in the person who decides the rest.\n\nIf nothing covers it, say so and name what you can still offer. And do not turn your own limit into a company rule. “We only refund up to $150” is a different claim from “that is as far as I can go.”"
            }
          ],
          misconception: {
            wrongModel: "Good service means saying yes, and the kindest reply is the most generous one.",
            whyItFails: "A yes the business cannot keep becomes a no from someone else later. That is worse than a clear answer now. Warmth is not the problem; the promise is.",
            betterModel: "The best reply is the most useful one the facts, the policy and your job actually allow."
          },
          commonMistakes: [
            {
              mistake: "Apologising for a fault nobody has established yet.",
              whyItFails: "It commits the business to a story that may turn out wrong, and invites a fix to match.",
              fix: "Say what the customer has lost. Leave the cause until someone has checked."
            },
            {
              mistake: "Reading out the rule and stopping there.",
              whyItFails: "The customer already knows they have a problem. A correct sentence naming no option leaves them holding it.",
              fix: "Say the rule, then say what is still possible."
            },
            {
              mistake: "Following up on everything.",
              whyItFails: "Follow-up earns its place when someone else still has to act, or the fix is unfinished.",
              fix: "Follow up while something is still open, not out of habit."
            }
          ]
        }
      )
    }
  },
  // P1-B4 (2026-09-09) — the teaching owner for the DECA `marketing-fundamentals` drill area.
  //
  // SIX LESSONS, NOT ONE. docs/curriculum/02-deca-course.md defines MK1-MK6 as six lessons, and
  // ⟨BC-5⟩ records that the owner personally read "all twelve lessons" of the business-content
  // section, while ⟨BC-6⟩ states they "are written to stand alone" and "are not labels for questions
  // that do not exist yet". The 30-item drill spreads across all six units (roughly 4-7 items each),
  // so a single page could not teach it without claiming coverage it does not have.
  //
  // MAPPING: MK1 is the gateway and is the ONE entry that claims skillSlug `deca-marketing`, so
  // remediation has a single destination. MK2-MK6 carry the practice CTA with NO skillSlug — the
  // pattern the Debate answer-types and turn-mechanics lessons already use, which the review-ladder
  // controls validate (a CTA-only lesson's drill skill must keep exactly one claimed teaching home,
  // and that home must be another lesson). The chain runs MK1 -> MK2 -> ... -> MK6.
  //
  // BOUNDARIES HELD, from the curriculum's own area table: cost, ROI, feasibility, measurement and
  // metric quality are BUSINESS REASONING; what a listed indicator requires is PI; what to say to one
  // customer right now is CUSTOMER RELATIONS. No lesson below teaches any of those.
  //
  // BANK DEBT, recorded and NOT repaired: mk-08 keys cost per acquisition as a promotion metric,
  // which the curriculum assigns to BR; MK6 routes campaign measurement away rather than teaching it.
  // No drill item is edited by this phase.
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    // MK1 — the gateway. This is the ONE marketing entry whose registry record claims the
    // `deca-marketing` skill, so the area has exactly one remediation destination.
    slug: "deca-who-the-customer-is",
    description: "Tell a customer need, a market segment and a target market apart.",
    category: "DECA business content",
    order: 7,
    lesson: {
      title: "Who the Customer Is",
      slug: "deca-who-the-customer-is-lesson",
      summary: "Work out what the customer is trying to get done, group the people trying to do it, and choose the group you can serve.",
      estimatedMinutes: 6,
      content: lesson(
        "Tell a customer need, a market segment and a target market apart, and say which one a situation is describing.",
        "Marketing starts with one question: who is this for? Three words get used for that, and they do not mean the same thing. A need is what the customer is trying to get done. A segment is a group of people trying to get the same thing done. A target market is the group the business chooses to build around.\n\nA bike shop looks at who buys from it and finds three groups: commuters, weekend riders, and racers. That is segmenting — describing how the market divides. Choosing to build the shop around commuters is targeting. It is a decision, and it is why a commuter service package becomes the sensible next move.\n\nDescribing the groups is not a plan. “Our target market is anyone who might buy a bike” names the market and chooses nothing. A target you cannot be outside of is not a target.",
        "Every later marketing decision points back at this one. Until you have chosen who you are for, you cannot tell whether an offer, a price or a channel fits.",
        [
          "Say what the customer is trying to get done.",
          "Group the people trying to get the same thing done.",
          "Choose the group the business can actually serve.",
          "Check the next decision follows from that choice."
        ],
        {
          prompt: "A bookshop wants one group to build its weekday campaign around. Its own records show most weekday sales are parents buying children’s books between two and four in the afternoon. Students come in mainly at weekends. (Our scenario, not an official one.)",
          weakAnswer: "We should target readers. Everybody reads, so the campaign should go out to as many people as we can reach.",
          strongAnswer: "The records already point at one group: parents buying children’s books on weekday afternoons. I’d build the weekday campaign around them and time it before school pickup, because that is when the records say they are here. Students come at weekends, so they are a different campaign, not this one.",
          whyItWorks: "It picks a group the shop’s own records describe, rather than one it hopes exists. And the choice then decides the timing, instead of the timing being added afterwards."
        },
        q(
          "A garden centre sorts its customers into weekend planters, allotment growers and landscapers. What has it done so far?",
          [
            "Chosen a target market to build the season around",
            "Described how its own market divides into different groups",
            "Written a value proposition aimed at each of them",
            "Decided which of the groups is the most profitable"
          ],
          "Described how its own market divides into different groups",
          "Describing the market and choosing inside it are different steps.",
          "Sorting customers into groups is segmenting, and it describes the market. Choosing one to build around would be targeting, and nothing here says a choice has been made. What each group is worth is a different question again.",
          "Segment or target"
        ),
        [
          q(
            "A gym’s members keep asking for more parking spaces. Asked why, they say they are trying to get in and out inside their lunch hour. What are they actually asking for?",
            [
              "More parking spaces, added as soon as they can be built",
              "A way to fit a workout into a lunch hour",
              "A cheaper membership than the one they have now",
              "Longer opening hours in the middle of the day"
            ],
            "A way to fit a workout into a lunch hour",
            "The request is not always the need.",
            "The words name parking; the reason names the need. Once the need is a workout inside an hour, a quicker way through the changing rooms might answer it and more spaces might not. Nobody said price or opening hours was the problem.",
            "Finding the need"
          ),
          q(
            "A tutoring service has found four groups: 400 students wanting daytime courses, 150 adults wanting evening classes, 90 hobby learners wanting to drop in, and 60 candidates wanting weekend intensives. Its tutors work weekday evenings only. Which group is the sensible target?",
            [
              "The 400 students who want intensive daytime courses",
              "The 90 hobby learners who want to drop in any time",
              "The 150 adult learners who want evening classes",
              "The 60 candidates who want weekend intensives"
            ],
            "The 150 adult learners who want evening classes",
            "The biggest group is not automatically the reachable one.",
            "Only one group wants the service in the hours the tutors already work. Group size does not help when there is nobody there to teach them.",
            "Choosing a target"
          )
        ],
        [
          q(
            "Which of these is a target market?",
            [
              "Anyone who might want to buy from us this year",
              "People who like good service and fair prices",
              "Office workers within a ten-minute walk, at lunchtime",
              "Customers who are interested in what we sell"
            ],
            "Office workers within a ten-minute walk, at lunchtime",
            "A target you cannot be outside of is not a target.",
            "Only one of these leaves anybody out. The others describe almost every possible customer, so they cannot help you decide what to offer or where to say it.",
            "Choosing a target"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Start from the need, not the product",
              body: "Ask what the customer is trying to get done. Meal-kit customers asking for a “quick mode” button are not really asking for a button. They are trying to get dinner made on a weeknight, and the useful answer is a set of fifteen-minute recipes.\n\nA group is worth targeting when the business can actually serve it. The biggest group is not automatically the right one. If the tutors only work weekday evenings, four hundred students who want daytime courses cannot be reached, whatever the number says."
            }
          ],
          misconception: {
            wrongModel: "The target market is everyone who might possibly buy.",
            whyItFails: "A target that excludes nobody gives you nothing to decide with. Every offer fits, every channel fits, and no plan is better than any other.",
            betterModel: "A target market is a choice about where to concentrate. If nothing is left out, no choice has been made."
          }
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-why-they-choose-you",
    description: "Tell a difference from a value proposition, and test whether the difference matters.",
    category: "DECA business content",
    order: 8,
    lesson: {
      title: "Why They Would Choose You",
      slug: "deca-why-they-choose-you-lesson",
      summary: "Turn a fact about your offer into the promise it makes to the customer you chose.",
      estimatedMinutes: 6,
      content: lesson(
        "Tell a difference from a value proposition, and test whether a difference actually matters to the customer you chose.",
        "A difference is something about your offer that is not true of the alternatives. A value proposition is the promise that difference makes to the customer you chose. They are not the same thing.\n\nA bike repair shop returns every bike the same day. That is the difference. The value proposition is what it means to a commuter: your bike back the same day, ready for the ride to work tomorrow. One is a fact about the shop. The other is a reason to choose it.\n\nDifferent is not the same as better. A shop could be the only one using purple boxes. True, checkable, and no reason for anyone to buy anything.",
        "A feature on its own gives a customer nothing to decide with. What decides it is what the feature does for them, and whether that was something they were already trying to get.",
        [
          "Name the difference.",
          "Say what it gets the customer you chose.",
          "Check that a competitor could not say the same sentence."
        ],
        {
          prompt: "A payroll software company sells to owners of businesses with fewer than five staff. Those owners say their worry is making a mistake on a tax filing. The software checks filings before they are submitted. (Our scenario, not an official one.)",
          weakAnswer: "Our software includes an automatic pre-submission validation layer built into the filing workflow.",
          strongAnswer: "Your filings are checked before they are submitted, so mistakes get caught first. That is the thing these owners told us they were worried about, and it is what the check actually does for them.",
          whyItWorks: "It states the same fact in the customer’s terms. The weak version describes the software; the strong one answers the worry the owners named."
        },
        q(
          "A window company’s frames are guaranteed for twenty-five years. Which is the value proposition?",
          [
            "Our frames are guaranteed for a full twenty-five years",
            "We use a reinforced core that resists warping over time",
            "You will not be replacing these windows again for decades",
            "Our frames are tested against a twenty-five year standard"
          ],
          "You will not be replacing these windows again for decades",
          "Say what the difference gets the customer.",
          "The others state a fact about the frames or about the guarantee. Only one says what that means for the person who has to live with them, which is the part they can decide with.",
          "Feature or promise"
        ),
        [
          q(
            "A bike shop lists four things no other local shop does. Which difference is useless to the customer?",
            [
              "We are the only local shop with a green front door",
              "We are the only local shop that opens before seven",
              "We are the only local shop that repairs older frames",
              "We are the only local shop that returns bikes the same day"
            ],
            "We are the only local shop with a green front door",
            "A difference has to be one somebody would choose on.",
            "All four are differences. Three of them change what the customer gets — earlier access, a repair nobody else does, a shorter wait. The colour of the door changes nothing they were trying to do.",
            "Difference that matters"
          ),
          q(
            "Two versions of the same printer cartridge cost the same. One can be collected today from a store twenty-five minutes away; the other arrives by post in four days. A customer whose printer is out of ink now would take:",
            [
              "The posted version, since waiting avoids the trip",
              "Either one, because the price is the same either way",
              "The store version, collected today rather than posted",
              "Neither, until a cheaper option can be found"
            ],
            "The store version, collected today rather than posted",
            "Value is the benefit set against what it costs to get it.",
            "The price is identical, so price cannot decide it. What differs is the wait, and this customer needs ink now — so the trip buys something they actually want.",
            "Customer value"
          )
        ],
        [
          q(
            "A mobile dog groomer comes to the owner’s door, so an anxious dog never travels. Which sentence is the value proposition?",
            [
              "We operate a fully equipped grooming van with onboard water",
              "No car, no waiting room. We groom at your door.",
              "We are a mobile grooming service covering the whole county",
              "Our groomers are trained to work with nervous animals"
            ],
            "No car, no waiting room. We groom at your door.",
            "Which one names what the owner gets?",
            "The others describe the van, the coverage and the training. Only one says what changes for the owner and the dog, which is the reason to choose it.",
            "Feature or promise"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Turn the feature into the promise",
              body: "Say the difference, then say what it gets the customer. Paper that does not bleed through is a feature. Both sides of every page stay usable is the promise.\n\nA value proposition that would fit any competitor is not one. If a rival could put their name on your sentence and it would still be true, you have described the category rather than your own offer."
            }
          ],
          commonMistakes: [
            {
              mistake: "Listing features and calling it value.",
              whyItFails: "A feature is a fact about the product. It becomes value only when someone says what it does for the customer.",
              fix: "After each feature, say “which means…” and finish the sentence."
            },
            {
              mistake: "Claiming a difference the situation does not support.",
              whyItFails: "If nothing in front of you says you are the only one, saying so is a guess the customer can check.",
              fix: "Point at the difference the situation actually gives you."
            }
          ]
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-how-you-are-understood",
    description: "Define positioning and keep it apart from a difference and a value proposition.",
    category: "DECA business content",
    order: 9,
    lesson: {
      title: "How You Want to Be Understood",
      slug: "deca-how-you-are-understood-lesson",
      summary: "Decide how you want your market to think of you, and check your own choices are saying it.",
      estimatedMinutes: 6,
      content: lesson(
        "Say what positioning is, and keep it apart from a real difference and from a value proposition.",
        "Positioning is how you want your market to think of you, next to the alternatives. It is a decision about being understood.\n\nThree words sit close together here. A difference is what is actually different about your offer. Positioning is how you mean to be understood. A value proposition is why the customer you chose should care.\n\nA café priced above its neighbours, with better beans and table service, is positioned as somewhere a bit special — what people often call premium. The price is part of the message, not only a number on the till.",
        "You do not get to decide what customers think by saying it. They read it off what you charge, what you sell, and where you sell it.",
        [
          "Say how you want the market to think of you.",
          "List the choices a customer can actually see.",
          "Check those choices say the same thing."
        ],
        {
          prompt: "A tea brand means to sit above Brand X in both price and how good people think it is. Today both sell at $4.50. The tea brand uses leaf from one estate; Brand X blends several. (Our scenario, not an official one.)",
          weakAnswer: "We should say in our advertising that we are the premium option and that our tea is better quality.",
          strongAnswer: "I’d raise the price above Brand X. Sitting at the same price says we are the same kind of thing, whatever the advertising claims. The leaf from one estate gives us something the higher price can stand on.",
          whyItWorks: "It changes a signal the customer can see rather than only the wording. And the change is backed by a difference the situation already gives us."
        },
        q(
          "A hotel says it is positioned as the quiet, restful option in town. Which of its choices contradicts that?",
          [
            "The late-night bar it advertises on the front of the building",
            "The blackout blinds fitted in every one of the bedrooms",
            "The library lounge it keeps free of phones and screens",
            "The garden it maintains at the back, away from the road"
          ],
          "The late-night bar it advertises on the front of the building",
          "Which choice tells the customer something different?",
          "A late-night bar advertised on the front of the building is the loudest thing about the place, which is not what a quiet, restful hotel is claiming to be. Blackout blinds, a screen-free lounge and a garden away from the road all point the same way as the claim.",
          "Signals that agree"
        ),
        [
          q(
            "Positioning is best described as:",
            [
              "The list of features that make an offering different from the rest",
              "How a business means its market to think of it against rivals",
              "The benefit statement that a chosen customer is given to read",
              "The amount a business charges when set against its nearest rivals"
            ],
            "How a business means its market to think of it against rivals",
            "Three close words: different, understood, why care.",
            "Features are the difference. The benefit statement is the value proposition. Price is one signal of a position, not the position itself.",
            "Three close words"
          ),
          q(
            "A furniture maker means to sit below Northgate on price while staying the durable, repairable choice. Its chair is $220 and Northgate’s is $260. What should it do?",
            [
              "Match Northgate at $260, so quality is not doubted",
              "Cut to $150, to be clearly the cheaper option",
              "Hold the chair at $220 where it already sits",
              "Raise to $270, to sit just above Northgate"
            ],
            "Hold the chair at $220 where it already sits",
            "Does the current signal already say what you mean?",
            "It is already below Northgate and not so far below that durability stops being believable. Matching at $260 loses the gap it wants, $270 puts it above Northgate when the intention was to stay below, and $150 says budget rather than durable.",
            "Price as a signal"
          )
        ],
        [
          q(
            "A business claims a premium position and advertises weekly discount coupons. What is the problem?",
            [
              "Coupons are more expensive to run than other promotions",
              "The signals contradict each other, so the claim is doubted",
              "Premium businesses are not allowed to discount at all",
              "Coupons reach the wrong age group for a premium product"
            ],
            "The signals contradict each other, so the claim is doubted",
            "Customers read the choices, not the claim.",
            "Nothing here says what coupons cost or who picks them up, and there is no rule against discounting. The problem is that the weekly discount says one thing while the claim says another.",
            "Signals that agree"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Your choices are the message",
              body: "Customers work out your position from what they can see: what you charge, what you stock, where you sell, how you look. Where a situation supports it, price is one of the clearest of those signals.\n\nSo a position has to be backed by choices that agree with it. A range — everything a business sells — can call itself clinical and top of its category. Run a permanent three-for-two on it (pay for two, take three) and you have told the customer two different things. The one they believe is usually the one with a price on it."
            }
          ],
          commonMistakes: [
            {
              mistake: "Collapsing difference, positioning and value into “branding”.",
              whyItFails: "They answer three different questions, and a scenario is usually asking only one of them.",
              fix: "Ask which is wanted: what is different, how you mean to be understood, or why this customer should care."
            },
            {
              mistake: "Treating positioning as a slogan.",
              whyItFails: "A sentence in an advert cannot outvote the price on the shelf.",
              fix: "Change something the customer can see, then say it."
            }
          ]
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-the-offering-and-its-price",
    description: "Name which marketing lever a decision belongs to, and tell price as a signal from price as arithmetic.",
    category: "DECA business content",
    order: 10,
    lesson: {
      title: "The Offering and Its Price",
      slug: "deca-the-offering-and-its-price-lesson",
      summary: "Work out which of the four levers a decision is really about, and what a price is saying.",
      estimatedMinutes: 6,
      content: lesson(
        "Name which of the four marketing levers a decision belongs to, and tell a price question about meaning from a price question about money.",
        "Businesses have four controllable levers, usually called the four Ps: product, price, place and promotion. Product is what you provide. Price is what the customer pays. Place is how they get it. Promotion is how you tell them.\n\nA sandwich shop sells only full-size baguettes, and customers say they want something smaller at lunch. Adding a half-size option changes the product — what the shop sells is now a different thing. Charging less for the same baguette would be a price decision, and neither is about how people get hold of it.\n\nSome decisions touch two levers at once, so say which one the customer’s problem is about. And naming the lever is the easy half: choosing well inside it is the work, and the four Ps do not do that for you.",
        "Getting the lever wrong sends the whole answer somewhere else. A queue problem answered with an advert is a promotion fix for a product fault.",
        [
          "Say what the customer’s problem actually is.",
          "Name which lever changes it: product, price, place or promotion.",
          "Choose inside that lever, using what the situation gives you."
        ],
        {
          prompt: "A gym’s members say they want to train before work, and its records show most of them start work at nine. The gym opens at seven, when its first instructor arrives, though the building is accessible from six. It has an equipment area that needs no instructor. (Our scenario, not an official one.)",
          weakAnswer: "We should advertise our early classes harder so more members know that we open at seven.",
          strongAnswer: "I’d let members use the equipment area unstaffed from six. What we sell does not include the hour they most want. That area needs no instructor, so the offering can change without waiting for staff.",
          whyItWorks: "It fixes the thing members named. The weak answer promotes an opening time that is still too late, which is a promotion answer to a product problem."
        },
        q(
          "Which of these is a promotion decision?",
          [
            "Choosing to run a paid social-media advertising campaign",
            "Choosing which shops will stock the new range",
            "Choosing to add a smaller size to the product line",
            "Choosing to sit ten percent above the nearest rival"
          ],
          "Choosing to run a paid social-media advertising campaign",
          "Which lever is being pulled: product, price, place or promotion?",
          "Stocking is place, a new size is product, and sitting above a rival is price. Only one of these is about telling customers something.",
          "Naming the lever"
        ),
        [
          q(
            "“Place” in the four Ps means:",
            [
              "The town or region a business decides to operate in",
              "How and where the customer obtains the product",
              "The shelf position a product is given in a shop",
              "The country where the product is manufactured"
            ],
            "How and where the customer obtains the product",
            "Place is about how it reaches the customer.",
            "Place covers the path from seller to buyer — where they get it and how it gets there. A head-office location, a shelf position and a factory are all real things, and none of them is what place means here.",
            "Naming the lever"
          ),
          q(
            "A judge asks what your price says about the product. Which answer is about price as a marketing decision?",
            [
              "We sell it for $40 and it costs us $22, so a discount still pays",
              "Sitting above the nearest rival tells buyers we mean to be the better one",
              "A ten percent cut would need us to sell a lot more to make it back",
              "Our costs went up this year, so the price had to follow them"
            ],
            "Sitting above the nearest rival tells buyers we mean to be the better one",
            "What does the price say, not what does it earn?",
            "Two of these work out whether the price pays for itself, and one says where the price came from. Only one answers what the price communicates, which is the marketing question that was asked.",
            "Price as a signal"
          )
        ],
        [
          q(
            "A gym sells only twelve-month memberships. Customers say they want to try it for a shorter period first. Which lever should change?",
            [
              "Promotion — advertise the twelve-month membership harder",
              "Price — reduce the cost of the twelve-month membership",
              "Product — add a one-month membership to what is sold",
              "Place — open a second branch on the other side of town"
            ],
            "Product — add a one-month membership to what is sold",
            "What did the customers actually say was wrong?",
            "They did not say they had not heard of the gym, that it cost too much, or that it was hard to reach. They said the only thing on sale is the wrong length, so what is sold has to change.",
            "Naming the lever"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Two different price questions",
              body: "Price gets asked about in two ways, and they want different answers.\n\nOne is what the price says. Sitting above the nearest rival tells a customer you mean to be the better choice; sitting well below says something else. That is a marketing question.\n\nThe other is whether the price works — what it costs to make, what margin is left, whether a discount pays for itself. That is a money question, and it is not this lesson. Answering a “what does this price say” question with arithmetic misses what was asked."
            }
          ],
          commonMistakes: [
            {
              mistake: "Answering a pricing question with margin arithmetic.",
              whyItFails: "It is a good answer to a question nobody asked, and it leaves the marketing question open.",
              fix: "Check whether you were asked what the price says or whether it pays."
            },
            {
              mistake: "Treating the four Ps as a checklist that solves the problem.",
              whyItFails: "Naming the category is not the same as choosing well inside it, and the four levers are not a complete answer to every situation.",
              fix: "Name the lever, then say what you would actually do with it."
            }
          ]
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-getting-it-to-the-customer",
    description: "Explain place and distribution, and work out what the buyer needs from the channel.",
    category: "DECA business content",
    order: 11,
    lesson: {
      title: "Getting It to the Customer",
      slug: "deca-getting-it-to-the-customer-lesson",
      summary: "Work out what this buyer needs at the point of purchase, and whether the channel can supply it.",
      estimatedMinutes: 6,
      content: lesson(
        "Explain what place and distribution mean, and work out what a buyer needs from the channel before choosing one.",
        "Place is how and where the customer gets what you sell. It covers the whole path from you to them, including any businesses in between. That path is called the channel, and distribution is the work of moving things along it.\n\nThose in-between businesses are called intermediaries. They earn their place by doing something useful — storing stock, sorting it, breaking a big delivery into small ones a shop can take.\n\nBuyers of hearing aids say they need the devices fitted in person, and re-moulded later as comfort changes. Those are the two things they told us the buying has to include. Both of those need someone in the room, which rules out any channel that can only describe the product.",
        "A channel that cannot do what the buyer needs at the moment of buying loses the sale, however good the product is.",
        [
          "Say what the buyer needs at the point of purchase.",
          "Ask whether the channel can supply that.",
          "Check the channel actually reaches the group you chose."
        ],
        {
          prompt: "Parents buying school shoes say they need to compare several styles side by side and take a pair home the same day. One option is to sell from shelf stock in the shop. The other is to order each pair in for collection later that week. (Our scenario, not an official one.)",
          weakAnswer: "Order them in. Holding less stock is tidier, and the parents can come back later in the week to collect.",
          strongAnswer: "Sell from the shelf stock. The parents told us two things they need: several styles in front of them, and shoes to take home today. Ordering in fails both — there is nothing to compare, and the shoes arrive days later.",
          whyItWorks: "It reads the requirement off what the buyers said, then checks each option against it. The weak answer optimises for the shop and loses the two things the buyer came for."
        },
        q(
          "A coffee roaster’s café customers say their biggest problem is running out of beans mid-week. Which change answers that?",
          [
            "Send the cafés a monthly newsletter about the roastery",
            "Deliver twice a week instead of once a week",
            "Print the roast date on every bag of beans",
            "Add two new blends to the range on offer"
          ],
          "Deliver twice a week instead of once a week",
          "What did the buyer say goes wrong, and when?",
          "The problem is running out partway through the week, which is about how often stock arrives. A newsletter, a date on the bag and a wider range all leave the same gap between deliveries.",
          "Channel fit"
        ),
        [
          q(
            "What do intermediaries do in a channel?",
            [
              "They set the price the final customer will be asked to pay",
              "They help move products along, by storing, sorting and splitting them",
              "They advertise the product on the producer’s behalf",
              "They manufacture the product under the producer’s name"
            ],
            "They help move products along, by storing, sorting and splitting them",
            "They earn their place by doing something to the goods.",
            "Storing, sorting and breaking a bulk delivery into shop-sized ones is the work that gets a product from a producer to a buyer. Pricing, advertising and manufacturing are different jobs.",
            "How it reaches them"
          ),
          q(
            "A bakery’s target is night-shift nurses at the hospital opposite, who finish at half past seven in the morning and shop on the way home. The bakery opens at nine. What should change?",
            [
              "Start counter service at seven in the morning",
              "Add a night-shift discount to the usual range",
              "Advertise the bakery inside the hospital building",
              "Extend opening later into the evening instead"
            ],
            "Start counter service at seven in the morning",
            "Can the chosen group reach you when they are there?",
            "The nurses pass at half past seven and the doors are shut. A discount, an advert and a later closing time all leave them walking past a closed shop.",
            "Reaching the target"
          )
        ],
        [
          q(
            "A specialty tool needs to be demonstrated before people will buy it. Which channel is the poor fit?",
            [
              "A shop counter with staff who can show it working",
              "A stand at an event, with the tool set up to try",
              "An online listing with photographs and a written description of it",
              "A supplier’s display room with a bench to try it on"
            ],
            "An online listing with photographs and a written description of it",
            "What does the buyer need at the moment of buying?",
            "The buyers need to see it work before they commit. Three of these can show them; one can only describe it, so the requirement goes unmet.",
            "Channel fit"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Ask what the buyer needs at the counter",
              body: "Different purchases need different things at the point of sale. Some need information — a demonstration, an explanation, a chance to ask. Some need convenience, or the choice of several options side by side. Some need help afterwards: fitting, adjusting, servicing.\n\nStart there. Once you know what this buyer needs, most channels rule themselves out. And check the channel reaches the group you actually chose: a shop the nurses walk past at half past seven is no use if it opens at nine."
            }
          ],
          commonMistakes: [
            {
              mistake: "Treating distribution as just shipping.",
              whyItFails: "Place covers where and how the customer gets it, including whether they can try it, compare it, or have it fitted.",
              fix: "Ask what has to happen at the point of purchase, not only how the box travels."
            },
            {
              mistake: "Choosing a channel on what it costs the business.",
              whyItFails: "Cost is a real question, and it is a different one. It cannot tell you whether the buyer can get what they need.",
              fix: "Settle the fit first, on what the buyer requires."
            }
          ]
        }
      )
    }
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-telling-them-about-it",
    description: "Explain what promotion is for, and judge whether audience, message and channel fit.",
    category: "DECA business content",
    order: 12,
    lesson: {
      title: "Telling Them About It",
      slug: "deca-telling-them-about-it-lesson",
      summary: "Match the message to the people you chose, and use something that can actually reach them.",
      estimatedMinutes: 6,
      content: lesson(
        "Explain what promotion is for, and judge whether the audience, the message and the channel fit each other.",
        "Promotion is everything a business does to tell customers about an offer. It comes in several forms: advertising, short-term offers, selling in person, public relations, direct contact, and anything online.\n\nAdvertising is paid, and meant to reach a lot of people at once. A sales promotion is a short-term nudge to act now, like a two-week trial offer.\n\nA community choir rehearses on Tuesday evenings in the town hall and wants new members who can get there. An advert in the local weekly paper reaches that area. A national campaign would reach far more people, almost none of whom could come on a Tuesday.",
        "A message can be true, well written and completely wasted. Whether it works depends on who sees it and whether it says anything they wanted.",
        [
          "Say who the message is for.",
          "Ask what that group would actually want to hear.",
          "Choose something that reaches them, not something popular."
        ],
        {
          prompt: "A garden centre wants its 8,000 existing loyalty-card customers to try a new houseplant range. Their email addresses are on the loyalty file. There is no paid-advertising budget this quarter, and the range launches in two weeks. (Our scenario, not an official one.)",
          weakAnswer: "Run a broad advertising campaign so that far more people in the area get to hear about the garden centre.",
          strongAnswer: "Email the loyalty list with a two-week in-store trial offer on the new range. We already have their addresses, so it costs nothing we do not have. These are people who know the centre. They only need a reason to come in for the new plants.",
          whyItWorks: "The audience is the one named, the channel already reaches them, and the message gives them something to do inside the launch window. The weak answer builds awareness among people who were not the target."
        },
        q(
          "A Saturday football club for under-twelves needs players who live close enough to come every week. Which channel best fits?",
          [
            "A post on a nationwide youth-sport discussion forum",
            "A notice in the newsletters of nearby primary schools",
            "A national radio advertisement broadcast on weekend mornings",
            "A stall at a large sports expo in another region"
          ],
          "A notice in the newsletters of nearby primary schools",
          "Which one reaches these people, in this place?",
          "All four reach people interested in sport. Only one is limited to families living near enough to come every Saturday, which is what the club said it needs.",
          "Audience and channel"
        ),
        [
          q(
            "What is the difference between advertising and a sales promotion?",
            [
              "Advertising is done online, and a sales promotion is done in a shop",
              "Advertising is paid and reaches many; a promotion is a short-term nudge",
              "Advertising is used by the large businesses, and promotions by smaller ones",
              "Advertising is honest, while a sales promotion is really a marketing trick"
            ],
            "Advertising is paid and reaches many; a promotion is a short-term nudge",
            "One informs widely; the other asks for something now.",
            "Both can be online or offline and both are used by businesses of any size. What separates them is that a sales promotion is short-term and built around something to do now.",
            "Kinds of promotion"
          ),
          q(
            "A pet shop’s target is owners of large dogs, who its records show buy one twelve-kilogram sack of food about every six weeks. It offers a loyalty stamp giving a free sack after twelve purchases. Why is that a weak promotion for this group?",
            [
              "The reward is too far away for how often these owners buy",
              "Loyalty schemes of this kind do not work well for pet shops",
              "Twelve-kilogram sacks are the wrong size for the shop to sell",
              "The shop should be advertising to new customers instead of these"
            ],
            "The reward is too far away for how often these owners buy",
            "Work the offer against how often they actually buy.",
            "Buying every six weeks, twelve purchases is well over a year away. The offer asks for a wait these buyers will not feel. Nothing here says loyalty schemes or that sack size are wrong in general.",
            "Message fit"
          )
        ],
        [
          q(
            "Which promotion says something the customer would care about?",
            [
              "Our new range is now available in all of our branches",
              "We have been trading in this town for over forty years",
              "Try the new range free for two weeks, in store",
              "Our new range uses a redesigned packaging format"
            ],
            "Try the new range free for two weeks, in store",
            "Does it give them something they wanted, and something to do?",
            "Three of these are facts about the business. One offers the customer something and says how to take it up, which is the part they can act on.",
            "Message fit"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Audience, message, channel",
              body: "A promotion has three parts and they all have to agree. Who is it for. What does it say. Where does it appear.\n\nPick the audience first, because it decides the other two. A message that means nothing to them is wasted, however well it is written. A channel they do not use cannot deliver it, however popular it is.\n\nKeep it consistent, too. If the same customer meets three different versions of what you are, none of them lands."
            }
          ],
          commonMistakes: [
            {
              mistake: "Choosing a channel because it is popular.",
              whyItFails: "Reaching many people is not the same as reaching yours, and the ones you chose may not be there at all.",
              fix: "Start from where your group already is."
            },
            {
              mistake: "Writing a promotion that just restates the product.",
              whyItFails: "The customer already has to work out why any of it matters to them, which is the part you were meant to do.",
              fix: "Say what they get, and what to do about it."
            }
          ]
        }
      )
    }
  },
  // ---- HOSA MEDICAL TERMINOLOGY: WORD PARTS ------------------------------------------------------
  //
  // Branch A of the approved HOSA curriculum (docs/curriculum/03-hosa-course.md §3A, knowledge-test
  // events), for the one knowledge-test event CompeteReady routes today. Four lessons in the order a
  // beginner needs them: how a term is built, then roots, suffixes and prefixes.
  //
  // CONSISTENT WITH THE PRACTICE BANK. Every part meaning taught here is the meaning the Medical
  // Terminology bank (lib/hosa-medterm.ts) keys, so a learner is never taught one gloss here and
  // marked wrong for it there. The checks are original CompeteReady teaching items, deliberately NOT
  // copies of bank items, and the worked examples say so in the learner's own view.
  //
  // NO OFFICIAL CLAIMS. Nothing here states a HOSA rule, test format, timing, weighting or score. Those
  // belong to the event's current guideline, which the Event HQ attributes; a stable-teaching lesson
  // is never a rules source (docs/curriculum/00-principles-and-sources.md).
  //
  // AUTHORING RECORD. The first entry replaces a thin held draft under the same slug. All four were
  // AI-drafted in a Claude Code session on 2026-09-26 and have NOT yet had a human content review, so
  // their provenance label reads "AI-generated CompeteReady lesson — not yet reviewed by a person"
  // (set in the education registry's HOSA track file). Record a review or an owner waiver here before
  // changing that label.
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-medical-terminology-basics",
    description: "Split a medical term into its parts and read its meaning from them.",
    category: "Health science",
    order: 1,
    lesson: {
      title: "How Medical Words Are Built",
      slug: "hosa-medical-terminology-basics-lesson",
      summary: "Split an unfamiliar medical term into prefix, root and suffix, and read its meaning from the parts.",
      estimatedMinutes: 8,
      content: lesson(
        "Split a medical term into its parts, say what each part means, and put the meaning back together in the right order.",
        "Most medical terms are built from a small set of reusable parts. Learn the parts and how they fit together, and you can read a term you have never seen before.\n\nThere are three kinds of part. The word root carries the core meaning and usually names a body part or a substance: cardi means heart, gastr means stomach, arthr means joint. The suffix is the ending, and it usually says what is going on: -itis means inflammation and -ectomy means surgical removal. A prefix, when there is one, sits at the front and adds detail such as where, when, how many or how fast: peri- means around and brady- means slow.\n\nMost terms have at least one root and end in a suffix, and many have no prefix at all. Arthritis is just arthr (joint) plus -itis (inflammation): inflammation of a joint. A few terms are a prefix and a suffix with no separate root, like anemia: an- (without) plus -emia (a blood condition). Read literally that is “without blood”; the real meaning is a shortage of red blood cells or hemoglobin, so the parts are a clue, not the whole definition.",
        "Nobody memorises every medical term. People who read terms well know the parts and how they fit, so a new word becomes something to work out rather than a blank. The same skill carries into textbooks, health-care conversations and any terminology question you have not seen before.",
        [
          "Find the suffix at the end of the term and say what it means.",
          "Look at the front for a prefix. Many terms do not have one.",
          "Find the root or roots in between, and set aside any combining vowel.",
          "Build the meaning: start with the suffix, then read the rest from the front.",
          "Check that the meaning makes sense where the term appears."
        ],
        {
          prompt: "You meet the term gastroenteritis and have never seen it before. What does it mean? (Our example, not an official test question.)",
          weakAnswer: "Something to do with the stomach. I recognise gastr, so it’s probably a stomach illness.",
          strongAnswer: "Split it: gastr/o + enter/o + -itis. Start with the suffix: -itis is inflammation. Then read from the front: gastr is the stomach and enter is the small intestine. So gastroenteritis is inflammation of the stomach and small intestine.",
          whyItWorks: "The weak answer stops at the first part it recognises, so it loses half the meaning, including the suffix, which is the part that says what is happening. The strong answer names every part and starts the meaning from the suffix, which is how the definition reads in English."
        },
        q(
          "Which part of a medical term tells you what is happening, such as inflammation or removal?",
          ["The prefix", "The word root", "The suffix", "The combining vowel"],
          "The suffix",
          "Compare the endings of arthritis and appendectomy.",
          "The suffix names what is happening: -itis is inflammation and -ectomy is surgical removal. The root says where it is happening, a prefix adds detail such as position or timing, and the combining vowel only joins parts together.",
          "Word structure"
        ),
        [
          q(
            "How does cardiomegaly split into its parts?",
            ["cardi/o + -megaly", "car- + di/o + -megaly", "cardiom- + -egaly", "cardiomeg- + -aly"],
            "cardi/o + -megaly",
            "The root is the part that means heart.",
            "Cardi/o is the combining form for heart: the root cardi plus the combining vowel o. -megaly means enlargement, so cardiomegaly is an enlarged heart. The other splits cut through the middle of a part, which leaves pieces that mean nothing.",
            "Word structure"
          ),
          q(
            "The root gastr joins the suffix -itis. How is the term spelled, and why?",
            [
              "Gastroitis, because a combining vowel is always kept",
              "Gastritis, because gastr never takes a combining vowel",
              "Gastritis, because the vowel drops before a vowel",
              "Gastroitis, because -itis needs a vowel in front of it"
            ],
            "Gastritis, because the vowel drops before a vowel",
            "Look at the first letter of the suffix.",
            "Before a suffix that starts with a vowel, the combining vowel drops: gastr + -itis gives gastritis. Gastr does take a combining vowel elsewhere, as in gastroscopy, where the suffix -scopy starts with a consonant. The reason matters as much as the spelling, because the rule is what you use on the next term.",
            "Combining vowels"
          ),
          q(
            "Why does gastroenteritis keep the o after gastr, even though enter starts with a vowel?",
            [
              "The o is part of the root, which is spelled gastro",
              "A combining vowel stays between two roots",
              "Enter always takes an o in front of it",
              "The o stands for “and”, joining the two organs"
            ],
            "A combining vowel stays between two roots",
            "What comes right after the o: a suffix or another root?",
            "Between two roots the combining vowel stays, whatever letter the next root starts with. It drops only before a suffix that starts with a vowel. The o is not part of the root gastr, and it carries no meaning such as “and”.",
            "Combining vowels"
          ),
          q(
            "Reading the suffix first, what does hepatomegaly mean?",
            ["Inflammation of the liver", "Removal of part of the liver", "Enlargement of the liver", "Pain in the liver"],
            "Enlargement of the liver",
            "Hepat/o is the liver. What does -megaly add?",
            "Start with the suffix: -megaly is enlargement. Then the root: hepat is the liver. Enlargement of the liver. Inflammation would be -itis, removal -ectomy, and pain -algia.",
            "Reading order"
          )
        ],
        [
          q(
            "A student decodes pericarditis as “inflammation around the heart”. What should they do with that meaning?",
            [
              "Stop there, because the parts give the full definition",
              "Use it as a clue and confirm it against the context",
              "Replace it with a guess based on how the word sounds",
              "Drop the prefix, because the root and suffix are enough"
            ],
            "Use it as a clue and confirm it against the context",
            "Is a literal meaning always the whole definition?",
            "Decoding gets you close, and the context confirms the exact meaning: pericarditis is inflammation of the pericardium, the sac around the heart. Stopping at the literal meaning can miss that. Dropping the prefix would lose “around”, which is what points to the sac rather than the heart itself.",
            "Using context"
          )
        ],
        {
          teachingSections: [
            {
              heading: "The combining vowel",
              body: "Parts are often joined by a combining vowel, usually o, to make the term easier to say. A root with its combining vowel attached, like cardi/o, is called a combining form. The vowel adds no meaning of its own.\n\nThree rules decide whether it appears. Keep it before a suffix that starts with a consonant: cardi/o + -megaly gives cardiomegaly, an enlarged heart. Drop it before a suffix that starts with a vowel: arthr/o + -itis gives arthritis, not arthroitis. Keep it between two roots, even when the second root starts with a vowel: gastr/o + enter/o + -itis gives gastroenteritis."
            },
            {
              heading: "Read the suffix first",
              body: "The English meaning of a term usually starts with its suffix. Read the suffix first, then go back to the start of the word and read the rest from left to right.\n\nPericarditis: -itis (inflammation), then peri- (around), then cardi (heart). Inflammation around the heart. Gastroscopy: -scopy (visual examination), then gastr (stomach). A visual examination of the stomach."
            }
          ],
          misconception: {
            wrongModel: "If I know every part, I know exactly what the term means.",
            whyItFails: "Parts give you a literal meaning, and the real definition is often narrower. Pericarditis decodes to inflammation around the heart, but it names one specific structure: the pericardium, the sac around the heart. A few parts also carry two meanings, and only the context can say which one is meant.",
            betterModel: "Use the parts to get close, then confirm the meaning against the context. Decoding is the strongest clue you have, not the final word."
          },
          commonMistakes: [
            {
              mistake: "Stopping at the first part you recognise.",
              whyItFails: "Gastroenteritis is not just a stomach problem. The part you skipped, enter/o, is half of what the term says.",
              fix: "Mark every part before you define any of them."
            },
            {
              mistake: "Giving the combining vowel a meaning.",
              whyItFails: "The o in cardiomegaly only joins cardi to -megaly. Treating it as a part sends you looking for a meaning that is not there.",
              fix: "Set the combining vowel aside, then define what is left."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-medical-word-roots",
    description: "Recognise common word roots and the body parts and substances they name.",
    category: "Health science",
    order: 4,
    lesson: {
      title: "Word Roots: What the Term Is About",
      slug: "hosa-medical-word-roots-lesson",
      summary: "Learn common roots for body parts and substances, grouped by body system, and tell apart the ones that look alike.",
      estimatedMinutes: 8,
      content: lesson(
        "Recognise common word roots and combining forms, name the body part or substance each one refers to, and tell apart roots that look alike.",
        "The word root is the core of a medical term. It tells you what the term is about: which organ, tissue or substance. Most roots come from Greek or Latin, which is why they rarely look like the everyday English word. Nephr means kidney. Hepat means liver.\n\nYou will usually see a root written as a combining form, the root plus its combining vowel: nephr/o, hepat/o, oste/o. The slash shows where the root ends and the vowel begins.\n\nRoots are easier to learn in groups than one at a time. Group them by body system, and learn each one with a real word you can picture, such as dermatology for dermat/o, skin.",
        "The root tells you which part of the body a term is about. If you get it wrong, every other part of your answer is attached to the wrong organ.",
        [
          "Find where the root ends. A combining vowel or the start of the suffix usually marks it.",
          "Read the whole root, not just its first two or three letters.",
          "Name the body part or substance it refers to.",
          "If it looks like another root, check the spelling letter by letter before you decide."
        ],
        {
          prompt: "Two terms appear on the same page: cystitis and cytology. What does each one mean? (Our example, not an official test question.)",
          weakAnswer: "Both are about cysts. Cystitis is an inflamed cyst, and cytology is the study of cysts.",
          strongAnswer: "They use different roots. Cyst/o means the bladder or a fluid-filled sac, so cystitis is inflammation of the bladder. Cyt/o means cell, so cytology is the study of cells.",
          whyItWorks: "The weak answer reads both terms by their first few letters. The strong answer checks the exact spelling of each root before giving it a meaning, which is the only way to tell cyst/o from cyt/o."
        },
        q(
          "Nephrology is the study of which organ?",
          ["The liver", "The kidneys", "The nerves", "The lungs"],
          "The kidneys",
          "Find the root in front of the combining vowel.",
          "Nephr/o means kidney, so nephrology is the study of the kidneys. The liver is hepat/o, a nerve is neur/o, and the lungs are pulmon/o or pneum/o.",
          "Word roots"
        ),
        [
          q(
            "A cystoscopy looks inside which structure?",
            ["A single cell", "The skull", "A blood vessel", "The bladder"],
            "The bladder",
            "Check the spelling of the root: cyst/o or cyt/o?",
            "Cyst/o means the bladder or a sac, and -scopy is a visual examination, so a cystoscopy looks inside the bladder. Cyt/o, one letter shorter, means cell. The skull is crani/o and a vessel is angi/o.",
            "Look-alike roots"
          ),
          q(
            "Enteritis is inflammation of which part of the digestive tract?",
            ["The stomach", "The large intestine", "The small intestine", "The liver"],
            "The small intestine",
            "Enter/o names one specific part of the intestine.",
            "Enter/o is the small intestine specifically. The large intestine, or colon, is col/o, the stomach is gastr/o, and the liver is hepat/o.",
            "Word roots"
          ),
          q(
            "Which combining form would you expect in a term about the ribs?",
            ["cost/o", "crani/o", "oste/o", "cyst/o"],
            "cost/o",
            "The general root for bone is too broad here.",
            "Cost/o means rib, as in intercostal, between the ribs. Crani/o is the skull, oste/o is bone in general, and cyst/o is the bladder or a sac.",
            "Word roots"
          ),
          q(
            "Pneumonia and pulmonary both refer to which organ?",
            ["The heart", "The nose", "The lungs", "The liver"],
            "The lungs",
            "An organ can have a Greek root and a Latin one.",
            "Pneum/o and pulmon/o are two roots for the lungs, one Greek and one Latin; pneum/o can also mean air. The heart is cardi/o, the nose is rhin/o, and the liver is hepat/o.",
            "Word roots"
          )
        ],
        [
          q(
            "What does a lipectomy remove?",
            ["Part of the lips", "Fatty tissue", "A gland", "Part of the liver"],
            "Fatty tissue",
            "Lip/o does not mean what it looks like.",
            "A lipectomy removes fatty tissue: lip/o means fat and -ectomy means surgical removal. The lips have their own root, labi/o. A gland is aden/o and the liver is hepat/o.",
            "Look-alike roots"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Common roots by body system",
              body: "Heart and blood: cardi/o (heart), angi/o (vessel), phleb/o (vein), hem/o or hemat/o (blood).\n\nBreathing: pulmon/o (lung), pneum/o (lung or air), rhin/o (nose).\n\nDigestion: gastr/o (stomach), enter/o (small intestine), col/o (large intestine, the colon), hepat/o (liver).\n\nBones, joints and muscles: oste/o (bone), arthr/o (joint), my/o (muscle), cost/o (rib), crani/o (skull).\n\nNerves and senses: neur/o (nerve), cerebr/o (the cerebrum, the largest part of the brain), myel/o (spinal cord or bone marrow), ophthalm/o (eye), ot/o (ear).\n\nKidneys and bladder: nephr/o (kidney), cyst/o (bladder or sac).\n\nTissues and substances: derm/o or dermat/o (skin), hist/o (tissue), cyt/o (cell), aden/o (gland), lip/o (fat), hydr/o (water)."
            },
            {
              heading: "Roots that look alike",
              body: "Some roots look or sound alike and mean completely different things. Slow down on these.\n\ncyst/o is the bladder or a sac, but cyt/o is a cell. my/o is muscle, but myel/o is the spinal cord or bone marrow. hist/o is tissue, hyster/o is the uterus, and hydr/o is water.\n\nOne more trap: lip/o means fat. It has nothing to do with the lips, which have their own root, labi/o."
            },
            {
              heading: "One organ, two roots",
              body: "Some organs have two roots, one from Greek and one from Latin, and you will meet both. pulmon/o and pneum/o both refer to the lungs, as in pulmonary and pneumonia, and pneum/o can also mean air.\n\nThe reverse happens too. myel/o names two different things, the spinal cord and the bone marrow, and only the rest of the term or its context tells you which."
            }
          ],
          additionalExamples: [
            {
              setup: "Enteritis and colitis both describe inflammation of the intestine. What is the difference?",
              strong: "Enter/o is the small intestine and col/o is the large intestine, so enteritis is inflammation of the small intestine and colitis is inflammation of the colon.",
              explanation: "Both end in -itis, so the suffix cannot tell them apart. The root carries the whole difference."
            },
            {
              setup: "A term contains myel/o. Is it about muscle?",
              weak: "Yes. My/o means muscle, and myel/o starts with my.",
              strong: "No. Myel/o is a separate root meaning the spinal cord or the bone marrow, and the rest of the term decides which.",
              explanation: "My/o and myel/o share their first two letters and nothing else. Read the whole root before you give it a meaning."
            }
          ],
          misconception: {
            wrongModel: "A root means whatever everyday word it looks like.",
            whyItFails: "Roots come from Greek and Latin, not everyday English. Lip/o means fat, not lips, and a guess based on resemblance can send you to the wrong meaning.",
            betterModel: "Treat each root as a new word with its own meaning, and learn it with a real term you can picture: lip/o with liposuction, which removes fat."
          },
          commonMistakes: [
            {
              mistake: "Deciding on a root from its first few letters.",
              whyItFails: "Cyst/o and cyt/o, my/o and myel/o, and hist/o and hyster/o look or sound alike and mean different things.",
              fix: "Find where the root ends, at the combining vowel or the suffix, and read all of it."
            },
            {
              mistake: "Assuming two roots must mean two different organs.",
              whyItFails: "Pulmon/o and pneum/o both refer to the lungs. Many organs have a Greek root and a Latin one.",
              fix: "When two roots seem to name the same organ, learn them as a pair."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-medical-suffixes",
    description: "Use a term’s ending to tell a condition from a procedure or a field, and give its meaning.",
    category: "Health science",
    order: 5,
    lesson: {
      title: "Suffixes: What Is Happening",
      slug: "hosa-medical-suffixes-lesson",
      summary: "Read a term’s ending to tell whether it names a condition, a procedure or test, or a field of study.",
      estimatedMinutes: 8,
      content: lesson(
        "Use a term’s suffix to say whether it names a condition, a procedure or test, or a field or specialist, and give the suffix’s exact meaning.",
        "The suffix is the ending of a medical term, and it is the place to start reading. It tells you what kind of word you are looking at before you know anything else about it.\n\nMany suffixes fall into three groups. Some name a condition: -itis is inflammation and -megaly is enlargement. Some name a procedure or a test: -ectomy is surgical removal and -scopy is a visual examination with a scope. And some name a field or the person who works in it: -ology is the study of something, and -logist is the specialist. A fourth, simpler kind only turns the term into a describing word: -al, -ar, -ary, -ic and -ous all mean “pertaining to”, as in intravenous (within a vein) and pulmonary (of the lungs).\n\nSo even before you know what gastr/o means, gastrectomy tells you it is an operation that removes something.",
        "The suffix can change a term’s meaning completely. Gastritis is an illness and gastrectomy is an operation, and only the ending tells them apart.",
        [
          "Read the whole ending, not just its last few letters.",
          "Decide what kind of word it is: a condition, a procedure or test, a field or specialist, or a describing word.",
          "Give the suffix’s exact meaning.",
          "Attach it to the root: the suffix says what is happening, and the root says where."
        ],
        {
          prompt: "A practice question asks how a colectomy differs from a colostomy. (Our example, not an official test question.)",
          weakAnswer: "They’re the same operation on the colon. Both end in -tomy, so both mean cutting.",
          strongAnswer: "They share the root col/o, the colon, so the suffix decides. -ectomy is surgical removal, so a colectomy removes all or part of the colon. -ostomy is the surgical creation of an opening, so a colostomy makes an opening from the colon to the outside of the body.",
          whyItWorks: "The weak answer reads only the last four letters. The strong answer reads the whole suffix, because -ectomy, -otomy and -ostomy differ by a letter or two and name three different operations."
        },
        q(
          "What kind of word is appendectomy?",
          ["A condition", "A procedure", "A specialist", "A field of study"],
          "A procedure",
          "What does the ending -ectomy describe?",
          "-ectomy means surgical removal, so an appendectomy is a procedure: the appendix is removed. A condition would end in something like -itis or -osis, a specialist in -logist, and a field of study in -ology.",
          "Suffix types"
        ),
        [
          q(
            "Which suffix would you expect in the name of an operation that removes an organ?",
            ["-ectomy", "-otomy", "-ostomy", "-scopy"],
            "-ectomy",
            "Removal, incision and opening are three different endings.",
            "-ectomy is surgical removal. -otomy cuts into a structure without removing it, -ostomy creates an opening, and -scopy is looking inside with a scope.",
            "Procedure suffixes"
          ),
          q(
            "Which term names the specialist rather than the field?",
            ["Dermatology", "Neurology", "Nephrology", "Cardiologist"],
            "Cardiologist",
            "Compare the endings -ology and -logist.",
            "-logist names the person who specializes in a field, so a cardiologist is a heart specialist. The other three end in -ology, which names the field of study itself.",
            "Suffix types"
          ),
          q(
            "Which term names the image itself, not the process of making it?",
            ["Electrocardiography", "Angiogram", "Radiography", "Mammography"],
            "Angiogram",
            "Process or result: -graphy or -gram?",
            "-gram is the record or image produced, so an angiogram is the image of the blood vessels. The other three end in -graphy, the process of recording.",
            "Procedure suffixes"
          ),
          q(
            "Osteomalacia and arteriosclerosis describe opposite changes. Which is which?",
            [
              "Osteomalacia is softening of bone; arteriosclerosis is hardening of the arteries",
              "Osteomalacia is hardening of bone; arteriosclerosis is softening of the arteries",
              "Both describe hardening, in two different tissues",
              "Both describe softening, in two different tissues"
            ],
            "Osteomalacia is softening of bone; arteriosclerosis is hardening of the arteries",
            "-malacia and -sclerosis are opposites.",
            "-malacia means softening, so osteomalacia is softening of bone. -sclerosis means hardening, so arteriosclerosis is hardening of the arteries. The roots, oste/o and arteri/o, say where; the suffixes say what.",
            "Condition suffixes"
          )
        ],
        [
          q(
            "What is a rhinoplasty?",
            ["Inflammation inside the nose", "Repair or reshaping of the nose", "A visual examination of the nose", "Surgical removal of part of the nose"],
            "Repair or reshaping of the nose",
            "Rhin/o is the nose. What does -plasty do to it?",
            "A rhinoplasty repairs or reshapes the nose: -plasty means surgical repair or reshaping. Inflammation would be -itis, a visual examination -scopy, and removal -ectomy.",
            "Procedure suffixes"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Conditions",
              body: "-itis means inflammation (arthritis). -osis means an abnormal condition (dermatosis). -pathy means disease (neuropathy). -algia means pain (myalgia, muscle pain).\n\n-megaly means enlargement (cardiomegaly). -emia means a blood condition (anemia). -oma means a tumor or mass (lipoma, a fatty mass). -malacia means softening (osteomalacia). -sclerosis means hardening (arteriosclerosis)."
            },
            {
              heading: "Procedures and tests",
              body: "-ectomy means surgical removal (appendectomy). -otomy means cutting into, an incision (tracheotomy). -ostomy means surgically creating an opening (colostomy). -plasty means surgical repair or reshaping (rhinoplasty).\n\n-scopy means a visual examination with a scope (gastroscopy). -graphy means the process of recording (radiography), and -gram means the record or image it produces (electrocardiogram)."
            },
            {
              heading: "Fields and people",
              body: "-ology means the study of a subject (cardiology, the study of the heart), and -logist means the specialist in it (cardiologist). You may also see the ending written -logy, with the o counted as a combining vowel. The meaning is the same."
            }
          ],
          additionalExamples: [
            {
              setup: "Cardiology and cardiologist.",
              strong: "Cardiology is the field: the study of the heart. A cardiologist is the specialist who works in it.",
              explanation: "-ology names the field and -logist names the person. The root is the same in both."
            },
            {
              setup: "Neuralgia and neuropathy both involve the nerves. How do they differ?",
              strong: "-algia means pain, so neuralgia is nerve pain. -pathy means disease, so neuropathy is disease of the nerves.",
              explanation: "Same root, different suffix, different meaning."
            },
            {
              setup: "Electrocardiography and an electrocardiogram.",
              strong: "Electrocardiography is the process of recording the heart’s electrical activity. The electrocardiogram is the record that process produces.",
              explanation: "-graphy is the process and -gram is the result, so a question can ask for either one."
            }
          ],
          misconception: {
            wrongModel: "The root is the important part; the suffix is just the ending.",
            whyItFails: "Gastritis, gastrectomy and gastroscopy share one root and describe three different things: an illness, an operation and an examination. Only the suffix tells them apart.",
            betterModel: "Read the suffix first. It tells you what kind of word you have, and the root tells you where it applies."
          },
          commonMistakes: [
            {
              mistake: "Mixing up -ectomy, -otomy and -ostomy.",
              whyItFails: "They differ by a letter or two, and they mean removing a part, cutting into it, and creating an opening.",
              fix: "Anchor each one to its origin: the ec in -ectomy means out, so the part comes out; -ostomy comes from stoma, an opening; and -otomy means an incision, where the part is cut into, not cut out."
            },
            {
              mistake: "Treating -graphy and -gram as the same.",
              whyItFails: "One is the process and the other is the record it produces, and a question can ask for either.",
              fix: "-graphy is making it; -gram is what you get."
            },
            {
              mistake: "Calling every condition an inflammation.",
              whyItFails: "Only -itis means inflammation. -osis is an abnormal condition, -pathy is disease and -megaly is enlargement.",
              fix: "Say “inflammation” only when the term ends in -itis."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-medical-prefixes",
    description: "Read what a prefix adds to a term, and tell apart prefixes that look alike or mean opposite things.",
    category: "Health science",
    order: 6,
    lesson: {
      title: "Prefixes: Where, When and How Much",
      slug: "hosa-medical-prefixes-lesson",
      summary: "Read the front of a term for position, time, number, speed and amount, then put all three kinds of part together.",
      estimatedMinutes: 8,
      content: lesson(
        "Say what a prefix adds to a term’s meaning, tell apart prefixes that look alike or mean opposite things, and decode a term that uses all three kinds of part.",
        "A prefix sits at the front of a term and changes its meaning without changing what the term is about. Tachycardia is tachy- (fast) + cardi (heart) + -ia (a condition): a fast heart rate. Swap the prefix for brady-, which means slow, and you get bradycardia, a slow heart rate. The heart stays the heart.\n\nNot every term has a prefix, so check before you look for one. When there is one, it usually answers one of a few questions: where, when, how many, how fast or how much.",
        "Prefixes often decide between answers that look almost the same. A slow heart rate and a fast one differ only in brady- and tachy-, and intra- (within) and inter- (between) look almost identical on the page.",
        [
          "Check whether the term starts with a prefix. Many do not.",
          "Decide what the prefix adds: where, when, how many, how fast or how much.",
          "If the prefix has an opposite or a look-alike, make sure you have the right one.",
          "Put it together with the root and suffix, starting from the suffix."
        ],
        {
          prompt: "Intravenous and intercostal both begin with int-. What does each one mean? (Our example, not an official test question.)",
          weakAnswer: "Both mean inside. An intravenous line goes inside a vein, and intercostal muscles are inside the ribs.",
          strongAnswer: "They use different prefixes. Intra- means within, so intravenous means within a vein. Inter- means between, so intercostal means between the ribs, which is where those muscles sit.",
          whyItWorks: "The weak answer stops at the three letters the prefixes share. The strong answer reads the whole prefix and then checks it against the root: a muscle can sit between ribs, but not inside one."
        },
        q(
          "What does the prefix in bradycardia tell you?",
          ["The heart is enlarged", "The heart rate is slow", "The heart is inflamed", "The heart rate is fast"],
          "The heart rate is slow",
          "Brady- is the opposite of tachy-.",
          "Brady- means slow, so bradycardia is a slow heart rate; tachy- would make it fast. Enlargement and inflammation come from suffixes, -megaly and -itis, not from a prefix.",
          "Prefixes"
        ),
        [
          q(
            "Where is something that is subcutaneous?",
            ["On top of the skin", "Between two layers of muscle", "Below the skin", "Across the skin"],
            "Below the skin",
            "Sub- is a position prefix. Think about where it puts something.",
            "Sub- means under or below, and cutane refers to the skin, so subcutaneous means below the skin. Epi- would mean upon, inter- between, and trans- across or through.",
            "Position prefixes"
          ),
          q(
            "Which term means “outside the cell”?",
            ["Intracellular", "Intercellular", "Pericellular", "Extracellular"],
            "Extracellular",
            "Four position prefixes, one root. Which prefix means outside?",
            "Extra- means outside, so extracellular means outside the cell. Intra- means within, inter- between and peri- around.",
            "Position prefixes"
          ),
          q(
            "Polyuria describes urine that is:",
            ["Produced in large amounts", "Not produced at all", "Painful or difficult to pass", "Tinged with blood"],
            "Produced in large amounts",
            "Poly- is a number prefix.",
            "Poly- means many or much, and -uria is a urine condition, so polyuria is urine produced in large amounts. No urine at all would take an- (anuria), and painful urination would take dys- (dysuria). Hematuria is blood in the urine: hemat/o means blood.",
            "Number prefixes"
          ),
          q(
            "A patient has difficulty swallowing. Which prefix would you expect in the term for this?",
            ["a-", "hyper-", "dys-", "brady-"],
            "dys-",
            "Difficulty is not the same as absence.",
            "Dys- means difficult or painful, so difficulty swallowing is dysphagia. A- means without, which would describe being unable to swallow at all. Hyper- means above normal and brady- means slow.",
            "Prefixes"
          )
        ],
        [
          q(
            "Put all three kinds of part together. What does polyneuropathy mean?",
            ["Pain in one nerve", "Inflammation of the brain", "Disease of many nerves", "Surgical removal of several nerves"],
            "Disease of many nerves",
            "Start with the suffix, then read from the front.",
            "Start at the end: -pathy is disease. Then read from the front: poly- is many and neur/o is nerve. Disease of many nerves. Pain would be -algia, inflammation -itis, and removal -ectomy.",
            "Putting parts together"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Where: position",
              body: "sub- means under or below (subcutaneous, below the skin). epi- means upon or over (epidermis, the outer layer of the skin). intra- means within (intravenous, within a vein). inter- means between (intercostal, between the ribs).\n\nperi- means around (pericardium, the sac around the heart). trans- means across or through (transdermal, through the skin). extra- means outside (extracellular, outside the cell)."
            },
            {
              heading: "When, how many and how fast",
              body: "pre- means before and post- means after (preoperative, postoperative).\n\nmono- means one, bi- two, tri- three and poly- many (bilateral, affecting both sides; polyuria, producing too much urine). hemi- means half (hemiplegia, paralysis of one side of the body).\n\nbrady- means slow and tachy- means fast (bradycardia, tachycardia)."
            },
            {
              heading: "How much, and how well",
              body: "hyper- means above normal or excessive, and hypo- means below normal or deficient (hypertension, high blood pressure; hypoglycemia, low blood sugar).\n\na- or an- means without (apnea, a pause in breathing). dys- means difficult or painful (dysphagia, difficulty swallowing). mal- means bad or abnormal (malformation)."
            },
            {
              heading: "Pairs to keep apart",
              body: "Some prefixes look alike: intra- (within) and inter- (between). Others are opposites that are easy to swap: hyper- and hypo-, brady- and tachy-, pre- and post-, and ad- (toward) and ab- (away from). Learn these as pairs, so that knowing one tells you the other."
            }
          ],
          additionalExamples: [
            {
              setup: "Hypertension and hypotension.",
              strong: "Hyper- means above normal and hypo- means below normal, so hypertension is high blood pressure and hypotension is low blood pressure.",
              explanation: "They are opposites, and the only difference is the prefix. This pair is worth slowing down for."
            },
            {
              setup: "Apnea.",
              strong: "A- means without, and -pnea means breathing, so apnea is a period without breathing.",
              explanation: "A one-letter prefix is easy to miss. When a term starts with a or an followed by a part you recognise, test whether it means “without”."
            },
            {
              setup: "Preoperative and postoperative instructions.",
              strong: "Pre- means before and post- means after, so preoperative instructions are for before surgery and postoperative ones are for after it.",
              explanation: "The root is the same in both. The prefix alone moves the instructions to the other side of the surgery."
            }
          ],
          misconception: {
            wrongModel: "Every medical term starts with a prefix.",
            whyItFails: "Many terms start with their root: gastritis, cardiology and nephrectomy have no prefix at all. Hunting for one makes you split a root in half.",
            betterModel: "Check whether the first letters match a prefix you know and whether what is left is a real root. If not, the term starts with its root."
          },
          commonMistakes: [
            {
              mistake: "Swapping intra- and inter-.",
              whyItFails: "Within and between are different places. An intravenous injection goes into a vein; the intercostal space is between two ribs.",
              fix: "Say the pair together: intra, within; inter, between."
            },
            {
              mistake: "Flipping an opposite pair.",
              whyItFails: "Hyper- and hypo-, and ad- and ab-, differ by a letter or two, and brady- and tachy- are easy to swap under pressure. Each pair means the reverse of the other, so one slip reverses the answer.",
              fix: "Learn one anchor term for each pair: hypertension is high blood pressure, and bradycardia is a slow heart rate."
            }
          ]
        }
      )
    }
  },
  // ---- HOSA MEDICAL TERMINOLOGY: ANATOMY -----------------------------------------------------------
  //
  // The second module of the same Branch A course (docs/curriculum/03-hosa-course.md §3A), following
  // the word-part lessons above. It teaches the anatomy the Medical Terminology practice bank already
  // asks about (lib/hosa-medterm.ts, area "anatomy", 30 questions), and nothing chosen from general
  // anatomy knowledge: the four lessons were derived from a census of those 30 questions, and
  // scripts/hosa-medterm-anatomy-smoke.ts proves, question by question, that the fact each one needs
  // is taught in the lesson that owns it.
  //
  // STRUCTURE, NOT FUNCTION OR DISEASE. The bank's anatomy area tests structures, locations, regions,
  // cavities, planes, direction terms and structural relationships. These lessons teach those, plus
  // the few plain statements of purpose the bank's anatomy items themselves rely on (the left ventricle
  // pumps blood to the body, the alveoli are where gas is exchanged, most nutrients are absorbed in the
  // small intestine, the nephron is the kidney's filtering unit, the diaphragm is the main muscle of
  // breathing). How the body works (physiology) and how disease changes it (pathophysiology) are not
  // taught here, and nothing diagnoses an illness or describes a treatment. This is preparation for a
  // knowledge test, not medical advice.
  //
  // CONSISTENT WITH THE PRACTICE BANK. Every fact a bank question needs is stated here the way the
  // bank's own reviewed explanation states it. The checks are original CompeteReady teaching items,
  // deliberately NOT copies of bank items, and the worked examples say so in the learner's own view.
  //
  // NO OFFICIAL CLAIMS. Nothing here states a HOSA rule, test format, timing, weighting, score or
  // coverage. A stable-teaching lesson is never a rules source (docs/curriculum/00-principles-and-sources.md).
  //
  // AUTHORING RECORD. All four were AI-drafted in a Claude Code session on 2026-09-26 and have NOT yet
  // had a human content review, so their provenance label says they are AI-generated, not official HOSA
  // material, and not yet reviewed by a person (set in the education registry's HOSA track file). The
  // repository's source policy requires a subject-accuracy review before release; record that review,
  // or an owner waiver, here before changing the label or pushing these lessons.
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-anatomy-body-map",
    description: "Describe where a structure is with paired direction terms, the three body planes and the body cavities.",
    category: "Health science",
    order: 7,
    lesson: {
      title: "Body Map: Directions, Planes and Cavities",
      slug: "hosa-anatomy-body-map-lesson",
      summary: "Use paired direction terms, the three body planes and the main body cavities to say exactly where a structure is.",
      estimatedMinutes: 12,
      content: lesson(
        "Describe where one structure is compared with another using paired direction terms, name the plane that divides the body into given parts, and name the cavity that holds an organ.",
        "Your nose is above your mouth. In anatomy you say the nose is superior to the mouth. Your ears are farther from the middle of your face than your eyes are, so the ears are lateral to the eyes. Anatomy has its own direction words so that everyone describes the same place in the same way, however a person is standing or lying.\n\nEvery direction word assumes one starting pose, called anatomical position: standing upright and facing forward, arms at the sides, palms facing forward. Directions are always given as if the body were in that pose. Left and right always mean the person’s own left and right, not yours as you look at them.\n\nThe direction words come in opposite pairs, so learning one word in a pair tells you the other. If superior means toward the head, inferior means toward the feet. The lesson then adds two more tools for placing a structure: the three planes that divide the body, and the cavities that hold the organs.",
        "Many anatomy questions are really questions about these words. Once you know them, you can place a structure you have only just met. The later lessons in this module use them too, for example to say which side of the heart a chamber is on and where one part of the brain sits.",
        [
          "Picture the body in anatomical position: upright, facing you, arms at the sides, palms forward.",
          "Find the pair the direction word belongs to, and say what its opposite means.",
          "Compare the two structures: which one is nearer the head, the front, the midline or the surface? On an arm or a leg, which one is nearer where the limb joins the trunk?",
          "For a plane, say which two parts it separates. For a cavity, first ask whether the organ is inside the skull (the cranial cavity) or inside the backbone (the spinal cavity). If not, start from the diaphragm: the thoracic cavity is above it, and the abdominal and pelvic cavities are below it."
        ],
        {
          prompt: "A diagram says the shoulder is proximal to the hand. What does that tell you? (Our example, not an official test question.)",
          weakAnswer: "Proximal means close, so the shoulder is close to the hand.",
          strongAnswer: "Proximal and distal compare two places on a limb by how near each one is to where the limb joins the trunk. The shoulder is where the arm joins the trunk, so it is proximal to the hand, even though it is at the other end of the arm. The hand is distal to the shoulder.",
          whyItWorks: "Reading proximal as “close to” leads to a false statement: the shoulder is at the opposite end of the arm from the hand. The strong answer measures both places from the same fixed point, where the limb joins the trunk, which is how the terms are defined."
        },
        q(
          "In anatomical position, where is the chin compared with the nose?",
          ["Superior to the nose", "Lateral to the nose", "Inferior to the nose", "Deep to the nose"],
          "Inferior to the nose",
          "Which of the two is nearer the feet?",
          "Inferior means toward the feet, or below, and the chin is below the nose, so it is inferior to the nose. Superior would put it above. Lateral means away from the midline, but the chin and nose both sit on the midline. Deep describes distance below the body surface, but the chin and the nose are both at the surface.",
          "Direction terms"
        ),
        [
          q(
            "Which pair of direction terms are opposites?",
            ["Superior and anterior", "Superficial and deep", "Medial and proximal", "Lateral and distal"],
            "Superficial and deep",
            "The right pair describes one kind of direction, measured two opposite ways.",
            "Superficial means near the body surface and deep means farther inside, so they are opposites. Superior (toward the head) pairs with inferior, anterior (front) with posterior, medial (toward the midline) with lateral, and proximal with distal.",
            "Direction terms"
          ),
          q(
            "A straight cut across the body at the waist separates the upper part from the lower part. Which plane is that?",
            ["A sagittal plane", "A frontal (coronal) plane", "An anterior plane", "A transverse plane"],
            "A transverse plane",
            "One of these planes is also called the horizontal plane.",
            "A transverse plane divides the body into upper and lower parts. A sagittal plane divides it into left and right, and a frontal (coronal) plane into front and back. Anterior is a direction word meaning toward the front, not the name of a plane.",
            "Body planes"
          ),
          q(
            "What does the thoracic cavity hold?",
            ["The heart and lungs", "The brain and spinal cord", "The stomach and liver", "The urinary bladder"],
            "The heart and lungs",
            "The thoracic cavity is the chest, above the diaphragm.",
            "The thoracic cavity is the chest cavity above the diaphragm, and it holds the heart and lungs. The brain is in the cranial cavity and the spinal cord in the spinal cavity. The stomach and liver are in the abdominal cavity, below the diaphragm, and the urinary bladder is in the pelvic cavity.",
            "Body cavities"
          ),
          q(
            "Where is the knee compared with the ankle?",
            ["Distal to it", "Superficial to it", "Proximal to it", "Deep to it"],
            "Proximal to it",
            "Which of the two is nearer the hip, where the leg joins the trunk?",
            "Proximal means nearer the trunk, or the point where a limb attaches. The knee is nearer the hip, where the leg joins the trunk, than the ankle is, so the knee is proximal to the ankle. Distal is the opposite: the ankle is distal to the knee. Superficial and deep compare how near the body surface two structures are, which does not tell the knee and the ankle apart.",
            "Direction terms"
          ),
          q(
            "The breastbone (sternum) is at the front of the chest and the spinal column (the backbone) is at the back. Where is the sternum compared with the spinal column?",
            ["Posterior to it", "Medial to it", "Deep to it", "Anterior to it"],
            "Anterior to it",
            "Anterior and posterior describe front and back.",
            "Anterior means toward the front of the body, and the sternum is at the front while the spinal column is at the back, so the sternum is anterior to the spinal column. Posterior would put it behind. Deep describes distance from the surface, and medial describes closeness to the midline.",
            "Direction terms"
          )
        ],
        [
          q(
            "In anatomical position the palms face forward. Where is the thumb compared with the little finger?",
            ["Medial to it", "Lateral to it", "Superficial to it", "Posterior to it"],
            "Lateral to it",
            "Stand with your palms forward and look at which side of the hand the thumb is on.",
            "With the palms facing forward, the thumb is on the outer side of the hand, farther from the body’s midline than the little finger, so it is lateral to it. It would look medial only if the palms were turned backward, which is why every direction assumes anatomical position. Superficial describes nearness to the body surface, and the thumb and the little finger are both at the surface of the hand, so it does not tell them apart. Posterior means toward the back.",
            "Anatomical position"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Five pairs of direction terms",
              body: "Superior means toward the head, or above, and inferior means toward the feet, or below. The nose is superior to the mouth.\n\nAnterior means toward the front of the body and posterior toward the back. They are also called ventral and dorsal. The breastbone (sternum) is anterior to the heart, and the spinal column (the backbone) is posterior to it.\n\nMedial means toward the midline, the imaginary line down the middle of the body, and lateral means away from it. The nose is medial to the eyes, and the ears are lateral to them.\n\nProximal means nearer the trunk (the main part of the body: the chest, belly and back), or nearer the point where a limb attaches, and distal means farther from it. They describe places along an arm or a leg. To compare two parts of the head, such as the eyes and the mouth, use the other pairs, such as superior and inferior. The elbow is proximal to the wrist, and the fingers are distal to it.\n\nSuperficial means near the body surface and deep means farther inside. The skin is superficial to the muscles."
            },
            {
              heading: "Three planes",
              body: "A plane is an imaginary flat surface that cuts the body into two parts. Anatomy uses three main planes.\n\nA sagittal plane divides the body into left and right parts. One that runs exactly down the middle, making equal left and right halves, is called the midsagittal plane.\n\nA frontal plane, also called a coronal plane, divides the body into front and back parts.\n\nA transverse plane, also called a horizontal plane, divides the body into upper and lower parts."
            },
            {
              heading: "The body cavities",
              body: "A body cavity is a space inside the body that holds organs.\n\nThe cranial cavity, inside the skull, holds the brain. The spinal cavity, inside the backbone (the column of bones called vertebrae), holds the spinal cord.\n\nThe thoracic cavity is the chest. It holds the heart and lungs, and the rib cage surrounds it. Its floor is the diaphragm, a dome-shaped muscle that separates the thoracic cavity above from the abdominal cavity below.\n\nThe abdominal cavity holds the stomach, the liver and most of the intestines. Below it is the pelvic cavity, inside the pelvis (the ring of bones formed by the hip bones and the base of the spine), which holds organs including the urinary bladder. Together the abdominal and pelvic cavities are called the abdominopelvic cavity."
            }
          ],
          additionalExamples: [
            {
              setup: "Where is the urinary bladder?",
              strong: "In the pelvic cavity, the lowest part of the abdominopelvic cavity, below the abdominal cavity.",
              explanation: "The bladder sits low in the trunk, inside the pelvis, so it is in the pelvic cavity, the lowest part of the abdominopelvic cavity, below the abdominal cavity."
            },
            {
              setup: "A cut down the middle of the body, from between the eyes to between the feet. Which plane?",
              strong: "A sagittal plane, which divides the body into left and right. Because it runs exactly down the middle, it is the midsagittal plane.",
              explanation: "Say which two parts the cut separates, then name the plane: left and right is sagittal, front and back is frontal (coronal), upper and lower is transverse."
            }
          ],
          misconception: {
            wrongModel: "Left and right mean the left and right side of the picture.",
            whyItFails: "Anatomy diagrams usually show a person facing you, so the person’s left side is on your right. Reading left and right from the page puts structures on the wrong side of the body.",
            betterModel: "Always use the person’s own left and right. Picture yourself in the diagram, facing out, and name the sides from there."
          },
          commonMistakes: [
            {
              mistake: "Reading proximal and distal as “close to” and “far from” each other.",
              whyItFails: "Both terms measure distance from where the limb joins the trunk, not from each other. “The wrist is proximal to the fingers” says the wrist is nearer the trunk than the fingers are. It says nothing about how close the wrist is to the fingers.",
              fix: "On an arm or a leg, ask which of the two structures is nearer where the limb joins the trunk. That one is proximal."
            },
            {
              mistake: "Mixing up the frontal and sagittal planes.",
              whyItFails: "They run at right angles to each other. A frontal plane runs from side to side and separates front from back. A sagittal plane runs from front to back and separates left from right.",
              fix: "Say which two parts the plane separates before you name it."
            },
            {
              mistake: "Putting the stomach in the chest cavity.",
              whyItFails: "The diaphragm is the boundary. The heart and lungs are above it, in the thoracic cavity. The stomach and liver are below it, in the abdominal cavity, even though they sit high in the abdomen.",
              fix: "Find the diaphragm first, then ask whether the organ is above it or below it."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-anatomy-heart-and-lungs",
    description: "Name the heart’s chambers, tell the kinds of blood vessels apart, and follow the airway from the nose to the alveoli.",
    category: "Health science",
    order: 8,
    lesson: {
      title: "Heart and Lungs: Where Blood and Air Go",
      slug: "hosa-anatomy-heart-and-lungs-lesson",
      summary: "Name the four chambers of the heart, tell arteries, veins and capillaries apart, and follow air from the nose to the alveoli.",
      estimatedMinutes: 11,
      content: lesson(
        "Name the heart’s four chambers and the wall between its two sides, tell arteries, veins and capillaries apart, and follow air from the nose to the alveoli.",
        "Put your hand flat on the middle of your chest. Behind your breastbone, between your two lungs, is your heart. In the body map lesson’s words, the heart is posterior to the breastbone and medial to the lungs. It is a muscular pump with four hollow chambers. The two upper chambers are the atria (one is called an atrium), and they receive blood coming back to the heart. The two lower chambers are the ventricles, and they pump blood out. Blood passes from each atrium down into the ventricle below it, on the same side. A muscular wall called the septum runs down the middle and separates the right side of the heart from the left side.\n\nEach ventricle sends blood to a different place. The right ventricle pumps blood to the lungs. The left ventricle pumps oxygen-rich blood into the aorta, the largest artery in the body, and from there out to the rest of the body. Right and left mean the person’s own right and left, just as in the body map lesson.\n\nThe lungs sit on either side of the heart, inside the thoracic cavity. Air reaches them through a branching set of tubes that ends in tiny air sacs, and the diaphragm below them is the main muscle of breathing.",
        "Questions on the heart and lungs often turn on one word: atrium or ventricle, artery or vein, trachea or esophagus. Knowing where each structure sits on the path of blood or air lets you tell them apart instead of guessing.",
        [
          "Decide which path the question is about: blood through the heart and vessels, or air through the airway.",
          "Place the structure on that path: what comes before it and what comes after it?",
          "For a heart chamber, say whether it is an atrium (upper) or a ventricle (lower), and which side it is on.",
          "For a blood vessel, ask whether it carries blood away from the heart or back to it."
        ],
        {
          prompt: "A student labels a heart diagram that shows the heart as if the person is facing you. They write “left ventricle” on the lower chamber on the left side of the page. Is the label right? (Our example, not an official test question.)",
          weakAnswer: "Yes. It is the lower chamber and it is on the left, so it is the left ventricle.",
          strongAnswer: "No. When the person faces you, their left side is on your right. The lower chamber on the left of the page is on the person’s right side, so it is the right ventricle. The left ventricle is the lower chamber on the right of the page.",
          whyItWorks: "The weak answer reads left and right from the page. The strong answer uses the person’s own left and right, which is how every heart chamber is named."
        },
        q(
          "Where does the right ventricle pump its blood next?",
          ["The rest of the body", "The aorta", "The lungs", "The left atrium"],
          "The lungs",
          "Each ventricle sends blood to a different place. Which one goes to the body?",
          "The right ventricle pumps blood to the lungs. It is the left ventricle that pumps blood into the aorta and out to the rest of the body. Blood reaches the left atrium only after it has been through the lungs, so the left atrium is not the next stop.",
          "Heart chambers"
        ),
        [
          q(
            "What are the two lower chambers of the heart called?",
            ["The atria", "The ventricles", "The alveoli", "The capillaries"],
            "The ventricles",
            "The upper chambers receive blood. The lower ones pump it out.",
            "The two lower chambers are the ventricles, which pump blood out of the heart. The atria are the two upper chambers. Alveoli are air sacs in the lungs, and capillaries are the smallest blood vessels, so neither is a heart chamber.",
            "Heart chambers"
          ),
          q(
            "A blood vessel carries blood back toward the heart. What kind of vessel is it?",
            ["An artery", "An arteriole", "The aorta", "A vein"],
            "A vein",
            "Arteries and veins are named by direction.",
            "Veins carry blood back toward the heart, so this vessel is a vein. Arteries carry blood away from the heart, arterioles are the smallest arteries, and the aorta is the largest artery, so all three carry blood away.",
            "Blood vessels"
          ),
          q(
            "Put the airway in order, going in from the throat.",
            [
              "Pharynx, larynx, trachea, bronchi, alveoli",
              "Larynx, pharynx, bronchi, trachea, alveoli",
              "Pharynx, trachea, larynx, alveoli, bronchi",
              "Trachea, pharynx, larynx, bronchi, alveoli"
            ],
            "Pharynx, larynx, trachea, bronchi, alveoli",
            "The voice box sits at the top of the windpipe.",
            "Air passes the pharynx, larynx, trachea, bronchi and alveoli in that order. The pharynx is the throat, the larynx (voice box) sits at the top of the trachea (windpipe), the trachea splits into the two bronchi, and the bronchi branch into smaller and smaller tubes that end at the alveoli. The other orders put the larynx before the pharynx, the trachea before the larynx, or the alveoli before the bronchi.",
            "Airway"
          ),
          q(
            "Tiny air sacs sit at the very ends of the smallest airways, each one wrapped in capillaries. What are they called?",
            ["Bronchi", "Pleura", "Alveoli", "Atria"],
            "Alveoli",
            "They are where oxygen and carbon dioxide pass between the air and the blood.",
            "The alveoli are the tiny air sacs at the ends of the airways. Oxygen and carbon dioxide pass between the air inside them and the blood in the capillaries around them. The bronchi are the larger airways that lead toward them. The pleura is the thin membrane that covers each lung, not an air sac, and the atria are heart chambers.",
            "Airway"
          ),
          q(
            "Which structure lies just below the lungs and is the main muscle of breathing?",
            ["The pleura", "The septum", "The trachea", "The diaphragm"],
            "The diaphragm",
            "It is also the boundary between two body cavities.",
            "The diaphragm is the dome-shaped muscle below the lungs, and it is the main muscle of breathing. It also separates the thoracic cavity from the abdominal cavity. The pleura is the thin membrane around each lung, the septum is the wall inside the heart, and the trachea is the windpipe.",
            "Airway"
          )
        ],
        [
          q(
            "Which statement about the aorta is correct?",
            [
              "It is the largest vein, and it returns blood to the heart",
              "It carries blood from the right ventricle to the lungs",
              "It is the largest artery, and it leaves the left ventricle",
              "It is a capillary that joins an artery to a vein"
            ],
            "It is the largest artery, and it leaves the left ventricle",
            "Which ventricle pumps blood out to the body?",
            "The aorta is the largest artery in the body, and it leaves the left ventricle, carrying blood out to the body. It is not a vein, because it carries blood away from the heart. The right ventricle sends blood to the lungs, not into the aorta, and capillaries are the smallest vessels, not the largest.",
            "Blood vessels"
          )
        ],
        {
          teachingSections: [
            {
              heading: "The four chambers and the septum",
              body: "Right atrium and left atrium: the two upper chambers. They receive blood coming back to the heart, and each passes it down to the ventricle below it, on the same side.\n\nRight ventricle and left ventricle: the two lower chambers. They pump blood out. The right ventricle pumps blood to the lungs, and the left ventricle pumps oxygen-rich blood into the aorta and out to the body.\n\nSeptum: the muscular wall that separates the right side of the heart from the left side.\n\nPericardium: the sac that surrounds the heart. You met it in the prefixes lesson: peri- means around."
            },
            {
              heading: "Arteries, veins and capillaries",
              body: "Arteries carry blood away from the heart. The aorta, which leaves the left ventricle, is the largest artery in the body. The smallest arteries are called arterioles.\n\nVeins carry blood back toward the heart. The smallest veins are called venules.\n\nCapillaries are the smallest blood vessels of all, and they connect the arterioles to the venules, forming the bridge between arteries and veins."
            },
            {
              heading: "The airway, from throat to air sacs",
              body: "Air comes in through the nose or mouth and passes the pharynx, the throat. Next is the larynx, the voice box. Below it is the trachea, the windpipe, which carries air down into the chest.\n\nThe trachea splits into two bronchi, one for each lung. The bronchi branch into smaller and smaller tubes, and at their ends are the alveoli, tiny air sacs wrapped in capillaries. The alveoli are where oxygen and carbon dioxide are exchanged with the blood.\n\nEach lung is covered by a thin membrane called the pleura. Below the lungs is the diaphragm, the dome-shaped muscle that is the main muscle of breathing."
            }
          ],
          additionalExamples: [
            {
              setup: "The trachea and the esophagus both run down the neck. Which is which?",
              strong: "The trachea is the windpipe, and it carries air to the lungs. The esophagus is the food tube, and it lies behind the trachea and carries food to the stomach.",
              explanation: "Both are tubes in the neck, so place each on its path: air goes to the lungs, food goes to the stomach."
            },
            {
              setup: "The smallest blood vessels in the body.",
              weak: "Arterioles, because they are the smallest arteries.",
              strong: "Capillaries. Arterioles and venules are small, but the capillaries between them are smaller still.",
              explanation: "Arterioles are the smallest arteries and venules the smallest veins. Capillaries connect the two, and they are the smallest vessels of all."
            }
          ],
          misconception: {
            wrongModel: "Arteries carry oxygen-rich blood and veins carry oxygen-poor blood, so that is how you tell them apart.",
            whyItFails: "Arteries and veins are named by direction, not by oxygen. The vessels that carry blood from the right ventricle to the lungs are arteries, yet the blood in them is oxygen-poor.",
            betterModel: "Ask which way the blood is going. Away from the heart means an artery; back toward the heart means a vein."
          },
          commonMistakes: [
            {
              mistake: "Swapping the atria and the ventricles.",
              whyItFails: "They are different chambers with different jobs. The atria are the upper chambers that receive blood, and the ventricles are the lower chambers that pump it out.",
              fix: "Link the ventricles with pumping out: both the aorta and the vessels to the lungs leave from a ventricle."
            },
            {
              mistake: "Calling the trachea the voice box.",
              whyItFails: "The voice box is the larynx, which sits at the top of the trachea. The trachea is the windpipe below it.",
              fix: "Follow the airway in order: pharynx, larynx, trachea, bronchi, alveoli."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-anatomy-digestive-and-urinary",
    description: "Follow food through the digestive tract and urine through the urinary tract, naming each structure in order.",
    category: "Health science",
    order: 9,
    lesson: {
      title: "Food and Urine: The Digestive and Urinary Tracts",
      slug: "hosa-anatomy-digestive-and-urinary-lesson",
      summary: "Follow food from the mouth to the large intestine and urine from the kidneys to the outside, and tell apart the tubes and tiny units that are easy to mix up.",
      estimatedMinutes: 11,
      content: lesson(
        "Put the organs of the digestive tract and the urinary tract in order, say where along each path a structure sits, and tell apart structures with similar names.",
        "Follow a bite of apple. You chew and swallow it, and it passes the pharynx (throat) and goes down the esophagus, a muscular tube behind the trachea, to the stomach. From the stomach it moves into the small intestine, where most nutrients are absorbed. What is left moves on into the large intestine, and the waste finally leaves the body through the rectum and anus.\n\nThat path is the digestive tract: one long tube from the mouth to the anus. Some digestive organs, such as the liver, the gallbladder and the pancreas, sit beside the tube and connect to it, but food never passes through them.\n\nThe urinary tract is a second, separate path. The kidneys make urine, tubes carry it to the bladder, which stores it, and one more tube carries it out of the body. Learning both paths in order is the quickest way to place any organ on them.",
        "Many anatomy questions ask what connects to what, or where along a path something sits. If you know each path in order, you can answer by position instead of by memorising each organ on its own, and you can see straight away when an answer puts an organ on the wrong path.",
        [
          "Decide which path the question is about: food through the digestive tract, or urine through the urinary tract.",
          "Say the path in order, from start to finish.",
          "Find the structure in the question on that path, and name what comes just before it and just after it.",
          "If two names look alike, such as ureter and urethra, check each one against its place on the path."
        ],
        {
          prompt: "A question asks which tube carries urine from a kidney to the bladder, and a student answers “the urethra”. Is that right? (Our example, not an official test question.)",
          weakAnswer: "Yes. The urethra is the urine tube, so it must carry urine from the kidney.",
          strongAnswer: "No. There are two kinds of urine tube. A ureter runs from each kidney down to the bladder, so there are two ureters. The urethra is a single tube that carries urine from the bladder to the outside of the body. From kidney to bladder is the ureter.",
          whyItWorks: "The weak answer mixes up the two names as if they were one tube. The strong answer places each tube on the urinary path, which is a reliable way to tell apart names that differ by only a few letters."
        },
        q(
          "Food has just left the stomach. Where does it go next?",
          ["The large intestine", "The small intestine", "The esophagus", "The liver"],
          "The small intestine",
          "Say the path in order: esophagus, stomach, then what?",
          "After the stomach comes the small intestine, where most nutrients are absorbed. The large intestine comes after the small intestine, and the esophagus comes before the stomach. Food never passes through the liver, which sits beside the digestive tract.",
          "Digestive tract"
        ),
        [
          q(
            "Which of these organs sits beside the digestive tract instead of being part of the tube that food passes through?",
            ["The esophagus", "The pancreas", "The stomach", "The large intestine"],
            "The pancreas",
            "Food passes through three of these. Which one does it never enter?",
            "The pancreas sits beside the digestive tract and connects to it, but food never passes through it. The esophagus, the stomach and the large intestine are all part of the tube that food moves along.",
            "Digestive tract"
          ),
          q(
            "What is the first part of the large intestine called?",
            ["The appendix", "The rectum", "The cecum", "The esophagus"],
            "The cecum",
            "The appendix hangs from it.",
            "The cecum is the pouch that forms the first part of the large intestine, and the appendix is attached to it. The appendix is a small pouch, not the start of the large intestine itself. The rectum is at the end of the large intestine, and the esophagus is before the stomach.",
            "Digestive tract"
          ),
          q(
            "Why is the small intestine called “small”?",
            [
              "It is shorter than the large intestine",
              "It absorbs fewer nutrients than the large intestine",
              "It comes after the large intestine",
              "It is narrower than the large intestine"
            ],
            "It is narrower than the large intestine",
            "Small does not mean short here.",
            "The small intestine is narrower than the large intestine, and that is what small refers to. It is actually much longer. It is also where most nutrients are absorbed, and it comes before the large intestine, not after it.",
            "Digestive tract"
          ),
          q(
            "Villi are tiny finger-like projections. Where are they found?",
            ["Lining the small intestine", "Inside the kidney", "At the ends of the smallest airways", "In the brain and nerves"],
            "Lining the small intestine",
            "Each of these four places has its own tiny structure with a look-alike name. Which system were villi listed under?",
            "Villi line the small intestine, covering its inner wall. The tiny filtering units inside the kidney are nephrons, the tiny air sacs at the ends of the smallest airways are alveoli, and the working units of the brain and nerves are nerve cells, called neurons.",
            "Tiny units"
          ),
          q(
            "How many ureters does a typical person have, and where do they run?",
            [
              "Two, one from each kidney to the bladder",
              "One, from the bladder to the outside of the body",
              "Two, one from each kidney to the outside of the body",
              "One, from both kidneys to the bladder"
            ],
            "Two, one from each kidney to the bladder",
            "Place the ureter on the urinary path: what comes just before it, and what comes just after it?",
            "There are two ureters, one from each kidney down to the bladder. The single tube from the bladder to the outside is the urethra, not a ureter. Urine always reaches the bladder before it leaves the body.",
            "Urinary tract"
          )
        ],
        [
          q(
            "Put the urinary tract in order, from where urine is made to where it leaves the body.",
            [
              "Kidney, urethra, bladder, ureter",
              "Bladder, kidney, ureter, urethra",
              "Kidney, bladder, ureter, urethra",
              "Kidney, ureter, bladder, urethra"
            ],
            "Kidney, ureter, bladder, urethra",
            "The bladder sits between two different kinds of tube: one brings urine in, and the other carries it out of the body.",
            "Urine is made in the kidney, runs down a ureter to the bladder, is stored in the bladder, and leaves the body through the urethra. The other orders put the bladder before the kidney, the bladder before the ureter, or the urethra before the bladder.",
            "Urinary tract"
          )
        ],
        {
          teachingSections: [
            {
              heading: "The digestive tract, in order",
              body: "Mouth, then pharynx (throat), then esophagus: the muscular tube that carries food down to the stomach. It lies behind the trachea.\n\nStomach, then small intestine. The small intestine is a long, narrow, coiled tube where most nutrients are absorbed. Its lining is covered in tiny finger-like projections called villi.\n\nLarge intestine: wider and shorter than the small intestine, and most of it is the colon. Its first part is a pouch called the cecum, and the appendix, a small narrow pouch, is attached to the cecum. The large intestine ends at the rectum and anus.\n\nBeside the tract, not part of it: the liver, the gallbladder and the pancreas. They connect to the tract, but food does not pass through them."
            },
            {
              heading: "The urinary tract, in order",
              body: "Kidneys: two organs toward the back (posterior) of the abdomen, one on each side of the spine. Each kidney contains a very large number of tiny filtering units called nephrons, which make urine.\n\nUreters: two tubes, one from each kidney down to the bladder.\n\nUrinary bladder: the organ in the pelvic cavity that stores urine.\n\nUrethra: a single tube that carries urine from the bladder out of the body."
            },
            {
              heading: "Four tiny units, four systems",
              body: "Several organs contain huge numbers of one tiny working unit, and the units’ names are easy to mix up.\n\nAlveolus (plural alveoli): a tiny air sac in the lungs.\n\nVillus (plural villi): a tiny finger-like projection lining the small intestine.\n\nNephron: a tiny filtering unit in the kidney.\n\nNeuron: a nerve cell, the working unit of the nervous system.\n\nWhen a question names one of these, check which system it belongs to before you answer."
            }
          ],
          additionalExamples: [
            {
              setup: "The appendix is attached to which part of the digestive tract?",
              weak: "The small intestine, because the appendix is small too.",
              strong: "The large intestine. The appendix hangs from the cecum, which is the first part of the large intestine.",
              explanation: "Place the appendix on the path: it is at the start of the large intestine, just after the small intestine ends."
            },
            {
              setup: "Where are most nutrients absorbed?",
              strong: "In the small intestine, whose lining is covered in villi.",
              explanation: "The large intestine is wider, but most absorption of nutrients happens earlier on the path, in the small intestine."
            }
          ],
          misconception: {
            wrongModel: "The large intestine is longer than the small intestine, so it must be where most nutrients are absorbed.",
            whyItFails: "“Large” and “small” describe width, not length. The small intestine is the narrower tube, but it is much longer, and it is where most nutrients are absorbed.",
            betterModel: "Read small and large as narrow and wide. Then place each part on the path: stomach, small intestine, large intestine."
          },
          commonMistakes: [
            {
              mistake: "Swapping the ureter and the urethra.",
              whyItFails: "The names differ by a few letters, but the tubes are in different places. Two ureters carry urine into the bladder, and one urethra carries it out.",
              fix: "Say the urinary path in order: kidney, ureter, bladder, urethra."
            },
            {
              mistake: "Putting the liver on the path that food travels.",
              whyItFails: "The liver is a digestive organ, but it sits beside the tract. Food goes from the stomach straight into the small intestine.",
              fix: "Keep two lists: the tube food passes through, and the organs beside it."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-anatomy-bones-muscles-nerves-skin",
    description: "Name the main bones by region, tell tendons from ligaments, divide the nervous system, and place the skin among the organs.",
    category: "Health science",
    order: 10,
    lesson: {
      title: "Bones, Muscles, Nerves and Skin",
      slug: "hosa-anatomy-bones-muscles-nerves-skin-lesson",
      summary: "Name the main bones by region, tell tendons, ligaments and cartilage apart, divide the nervous system and the brain, and learn why the skin counts as an organ.",
      estimatedMinutes: 12,
      content: lesson(
        "Name the main bones by body region, say what tendons and ligaments connect, divide the nervous system into its central and peripheral parts, place the parts of the brain, and describe the skin as an organ.",
        "Bend your arm and feel your upper arm. Under the skin is muscle, and under the muscle is bone. Most muscles are attached to bones by tendons, tough cords of tissue. Where two bones meet at a joint, bands called ligaments hold them together. The names matter because questions often ask exactly what joins what.\n\nThis lesson covers four systems: the skeleton that gives the body its frame, the muscles that move it, the nervous system that controls it, and the skin that covers it. The skeletal system is the bones, plus the cartilage and ligaments at the joints. The muscular system is the muscles, most of them attached to the bones by tendons. The nervous system is the brain, the spinal cord and the nerves. The integumentary system is the skin, together with the hair and nails.\n\nThe direction words from the body map lesson come back here. You will use them to say where the cerebellum sits compared with the rest of the brain.",
        "Questions on these systems often offer a very similar wrong answer: a ligament for a tendon, the wrist bones for the ankle bones, the peripheral nervous system for the central one. Knowing what each structure connects to, and where it sits, is what tells the right answer from the near miss.",
        [
          "Decide which system the question is about: bones, muscles, nerves or skin.",
          "For a bone, name the body region first, then the bone in that region.",
          "For a connecting tissue, ask what it joins: muscle to bone is a tendon, bone to bone is a ligament.",
          "For the nervous system, ask whether the structure is the brain or spinal cord (central) or a nerve outside them (peripheral).",
          "For a position question, use the direction pairs from the body map lesson."
        ],
        {
          prompt: "A diagram of the knee labels a tough band that joins the thigh bone to the shinbone. Is it a tendon or a ligament? (Our example, not an official test question.)",
          weakAnswer: "A tendon. Tendons are the tough cords you find around the knee.",
          strongAnswer: "A ligament. Check what it joins: the thigh bone (femur) and the shinbone (tibia) are both bones, and tissue that joins a bone to a bone is a ligament. A tendon joins a muscle to a bone.",
          whyItWorks: "The weak answer goes by where the tissue is, but tendons and ligaments are both found around the knee. The strong answer asks what the band connects, which is the only thing that decides its name."
        },
        q(
          "A tough cord attaches the biceps muscle to a bone of the forearm. What is it called?",
          ["A ligament", "Cartilage", "A tendon", "A nerve"],
          "A tendon",
          "What does it join: muscle to bone, or bone to bone?",
          "A tendon joins a muscle to a bone, and this cord joins the biceps muscle to a bone, so it is a tendon. A ligament joins a bone to a bone. Cartilage is the smooth tissue covering the ends of bones in many joints, and a nerve carries signals rather than joining one structure to another.",
          "Tendons and ligaments"
        ),
        [
          q(
            "Which group of bones sits in the ankle?",
            ["The carpals", "The tarsals", "The phalanges", "The vertebrae"],
            "The tarsals",
            "Carpals and tarsals are a matching pair, one near the hand and one near the foot.",
            "The tarsals are the bones of the ankle. The carpals are the matching bones of the wrist. The phalanges are the bones of the fingers and toes, and the vertebrae form the spinal column.",
            "Bones"
          ),
          q(
            "What do the skull and the rib cage have in common?",
            [
              "Both are made of cartilage",
              "Both are part of the spinal column",
              "Both are found in the limbs",
              "Both enclose and protect organs"
            ],
            "Both enclose and protect organs",
            "Think about what sits inside each one.",
            "The skull encloses and protects the brain, and the rib cage encloses and protects the heart and lungs. Both are made mainly of bone, not cartilage. The spinal column is made of the vertebrae, and neither the skull nor the ribs is in the arms or legs.",
            "Bones"
          ),
          q(
            "Which of these is part of the peripheral nervous system?",
            ["A nerve in the arm", "The brain", "The spinal cord", "The cerebellum"],
            "A nerve in the arm",
            "The central nervous system is the brain and the spinal cord. What is left?",
            "A nerve in the arm is outside the brain and spinal cord, so it is part of the peripheral nervous system, which is all the nerves outside those two. The brain and the spinal cord make up the central nervous system, and the cerebellum is part of the brain.",
            "Nervous system"
          ),
          q(
            "Which part of the brain is the largest?",
            ["The cerebellum", "The brainstem", "The cerebrum", "The spinal cord"],
            "The cerebrum",
            "The cerebellum is a smaller part that sits below and behind the largest one. Which part is that?",
            "The cerebrum is the largest part of the brain. The cerebellum is a smaller part below and behind it, and the brainstem connects the rest of the brain to the spinal cord. The spinal cord is not part of the brain at all, though it is part of the central nervous system.",
            "Nervous system"
          ),
          q(
            "The skin counts as an organ. Which body system is it part of?",
            ["The skeletal system", "The nervous system", "The digestive system", "The integumentary system"],
            "The integumentary system",
            "This system also includes the hair and nails.",
            "The skin belongs to the integumentary system, together with the hair and nails. The skeletal system is the bones and the cartilage and ligaments at the joints, the nervous system is the brain, spinal cord and nerves, and the digestive system is the tract that food passes through, with the organs beside it.",
            "Skin"
          )
        ],
        [
          q(
            "Where is the cerebellum compared with the cerebrum?",
            ["Superior and anterior to it", "Inferior and posterior to it", "Superior and posterior to it", "Inferior and anterior to it"],
            "Inferior and posterior to it",
            "Two direction words give two facts: is it above or below the cerebrum, and in front of it or behind it?",
            "The cerebellum lies below and behind the cerebrum. Below is inferior and behind is posterior, so it is inferior and posterior to the cerebrum. Superior would put it above the cerebrum, and anterior would put it in front, so each other choice gets at least one of the two directions wrong.",
            "Nervous system"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Bones by region",
              body: "Head and trunk: the skull encloses the brain, and the part of the skull around the brain is called the cranium. The vertebrae stack on top of one another to form the spinal column, which encloses the spinal cord. The ribs join the vertebrae at the back, and most of them connect to the breastbone (sternum) at the front through short strips of cartilage. Together they form the rib cage, which encloses and protects the heart and lungs.\n\nUpper limb (shoulder to fingers): the clavicle is the collarbone, which runs from the breastbone to the shoulder. The humerus is the upper arm bone. The carpals are the small bones of the wrist, and the phalanges are the bones of the fingers.\n\nLower limb (thigh to toes): the femur, the thigh bone, is the longest and strongest bone in the body. The tibia is the shinbone. The tarsals are the bones of the ankle, and the toe bones are also called phalanges.\n\nA memory aid: tarsals and toes both start with t, so the tarsals are the ones at the foot end of the body, in the ankle. The carpals are in the wrist."
            },
            {
              heading: "Muscles and what joins them",
              body: "Tendons join muscles to bones. Ligaments join bones to other bones at a joint. Cartilage is a firm, smooth, flexible tissue that covers the ends of bones in many joints.\n\nBy mass, the largest muscle in the body is the gluteus maximus, in the buttock. The longest muscle is a different one: the sartorius, a long, narrow muscle that runs across the front of the thigh. The biceps brachii is on the front of the upper arm. The diaphragm, from the heart and lungs lesson, is a muscle too."
            },
            {
              heading: "The nervous system and the brain",
              body: "The central nervous system (CNS) is the brain and the spinal cord. The peripheral nervous system (PNS) is all the nerves outside them, which reach the rest of the body.\n\nThe cerebrum is the largest part of the brain. The cerebellum is a smaller part that lies below and behind the cerebrum. In the words of the body map lesson, the cerebellum is inferior and posterior to the cerebrum. The brainstem connects the rest of the brain to the spinal cord."
            },
            {
              heading: "Skin: the largest organ",
              body: "The skin is an organ, and it is the largest organ of the body. With the hair and nails, it makes up the integumentary system.\n\nThe outer layer of the skin is the epidermis, and the layer beneath it is the dermis. An organ is a body part made of two or more kinds of tissue working together. The skin’s layers are made of different tissues, which is why it counts as an organ. The word parts from earlier lessons explain the names: epi- means upon, and derm means skin.\n\nDo not confuse the largest organ of all with the largest organ inside the body, which is the liver."
            }
          ],
          additionalExamples: [
            {
              setup: "Where is the cerebellum?",
              strong: "Below and behind the cerebrum. In anatomy terms, it is inferior and posterior to the cerebrum.",
              explanation: "Two direction words give two facts. Check each one against its pair: inferior is toward the feet, and posterior is toward the back."
            },
            {
              setup: "The longest bone in the body.",
              weak: "The humerus, because the arm is long.",
              strong: "The femur, the thigh bone. It is the longest and strongest bone in the body.",
              explanation: "The humerus is the upper arm bone. The thigh bone is longer, so the femur is the answer."
            }
          ],
          misconception: {
            wrongModel: "The biggest thing inside the body must be the largest organ.",
            whyItFails: "The skin is an organ too, and it is the largest organ of all. The liver is only the largest organ inside the body.",
            betterModel: "Read the question closely: “the largest organ” means the skin, and “the largest internal organ” means the liver."
          },
          commonMistakes: [
            {
              mistake: "Swapping tendons and ligaments.",
              whyItFails: "Both are tough bands of tissue near joints, so position does not tell them apart. Only what they join does.",
              fix: "Tendons join muscle to bone. Ligaments join bone to bone."
            },
            {
              mistake: "Swapping the carpals and the tarsals.",
              whyItFails: "They are matching groups of small bones, one in the wrist and one in the ankle, and their names look and sound almost the same.",
              fix: "Learn them as a pair, and use the letter t: tarsals and toes both start with it, so the tarsals are in the ankle and the carpals are in the wrist."
            },
            {
              mistake: "Counting the spinal cord as part of the peripheral nervous system.",
              whyItFails: "The spinal cord runs down the back, away from the head, so it can seem to belong with the nerves. It is part of the central nervous system.",
              fix: "The central nervous system is the brain plus the spinal cord. Everything else is peripheral."
            }
          ]
        }
      )
    }
  },
  // ---- HOSA MEDICAL TERMINOLOGY: PHYSIOLOGY --------------------------------------------------------
  //
  // The third module of the same Branch A course (docs/curriculum/03-hosa-course.md §3A), following
  // the anatomy lessons above. It teaches the normal body function the Medical Terminology practice
  // bank already asks about (lib/hosa-medterm.ts, area "physiology", 30 questions), and nothing chosen
  // from general physiology knowledge: the four lessons were derived from a census of those 30
  // questions, and scripts/hosa-medterm-physiology-smoke.ts proves, question by question, that the
  // fact each one needs is taught in the lesson that owns it.
  //
  // NORMAL FUNCTION ONLY, TO THE BANK'S DEPTH. These lessons teach how the healthy body works: balance
  // and feedback, blood and the heartbeat, breathing and digestion, nerves and muscles. How disease
  // changes the body (pathophysiology) is not taught here, no disease is named, and nothing diagnoses
  // an illness or describes a treatment. This is preparation for a knowledge test, not medical advice.
  //
  // ONE NUMBER. The lessons state exactly one number: a typical resting heart rate of about 60 to 100
  // beats per minute for adults, the range the bank's own reviewed explanation gives, stated with the
  // caveat that it is a general adult range and not a way to judge a particular person's heart. The
  // physiology guard allows digits in that one sentence and nowhere else, and no measured quantity
  // written in words anywhere.
  //
  // CONSISTENT WITH THE PRACTICE BANK. Every fact a bank question needs is stated here the way the
  // bank's own reviewed explanation states it. The checks are original CompeteReady teaching items,
  // deliberately NOT copies of bank items, and the worked examples say so in the learner's own view.
  //
  // NO OFFICIAL CLAIMS. Nothing here states a HOSA rule, test format, timing, weighting, score or
  // coverage. A stable-teaching lesson is never a rules source (docs/curriculum/00-principles-and-sources.md).
  //
  // AUTHORING RECORD. All four were AI-drafted in a Claude Code session on 2026-09-27 and have NOT yet
  // had a human content review, so their provenance label says they are AI-generated, not official HOSA
  // material, and not yet reviewed by a person (set in the education registry's HOSA track file). The
  // repository's source policy requires a subject-accuracy review before release. The owner's plan
  // (2026-09-27) is one qualified human subject-accuracy review of the whole Medical Terminology
  // curriculum before the stack is pushed. Record that review here, by reviewer and date,
  // before changing the label or pushing these lessons. Before the local commit, independent AI
  // reviewers (one per lesson for accuracy, plus bank alignment, product, QA and security) raised 30
  // findings, and most of the wording they flagged was corrected: platelets as cell fragments, why
  // carbon dioxide drives breathing, the cardiac-output feedback, the atrial phases, hints that gave
  // the answer away, and others. That is not a human review and does not replace one.
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-physiology-staying-in-balance",
    description: "Explain how the body keeps its inside conditions steady, using negative feedback, the pancreas and thyroid hormones, and the kidneys.",
    category: "Health science",
    order: 11,
    lesson: {
      title: "Staying in Balance: Feedback, Hormones and the Kidneys",
      slug: "hosa-physiology-staying-in-balance-lesson",
      summary: "Learn how negative feedback keeps the body’s inside conditions steady, what insulin, glucagon, thyroid hormone and ADH do, and how the kidneys filter the blood and take back what the body needs.",
      estimatedMinutes: 14,
      content: lesson(
        "Explain homeostasis and negative feedback with an example, say what insulin, glucagon, thyroid hormone and antidiuretic hormone (ADH) normally do, and describe how the kidneys filter the blood and reabsorb what the body needs.",
        "On a hot day you sweat. On a cold day you shiver. Those two opposite responses have the same purpose: keeping the inside of your body close to the same temperature, whatever the weather is doing. Physiology is the study of how the body works, and this steadiness is one of its first ideas.\n\nHomeostasis is the body’s ability to maintain a stable internal environment. It keeps conditions such as temperature, water, blood glucose (blood sugar) and pH (how acidic a fluid is) within a narrow range, even when things outside the body change. In short, homeostasis means keeping conditions inside the body steady while the outside changes. The body does not hold these conditions perfectly still. It keeps nudging each one back toward a target value, called its set point.\n\nMost of that nudging is done by negative feedback. The body notices that a condition has moved away from its set point and responds in the opposite direction, pushing the condition back. Negative means the response reverses the change. It does not mean that something has gone wrong. The signals travel in two ways, along nerves and as hormones. This lesson looks at hormones and at the kidneys, and the nerves and muscles lesson compares hormones with nerves.",
        "Many questions about how the body works come back to one idea: something changes, the body notices, and it responds to undo the change. If you can name the change and the response, you can often reason out the answer, for example which hormone is released or whether the kidneys keep more water or less.",
        [
          "Name the condition that is changing, such as body temperature, blood glucose or the body’s water.",
          "Say which way it moved: above its set point or below it.",
          "Name the response that pushes it back the other way, and whether the signal is carried by a nerve or a hormone.",
          "Check your answer against the direction. In negative feedback the response always works against the change."
        ],
        {
          prompt: "After lunch a student’s blood glucose goes up. The student says the pancreas releases glucagon to deal with it. Is that right? (Our example, not an official test question.)",
          weakAnswer: "Yes. Glucagon is the pancreas hormone for blood sugar, so the pancreas releases it whenever blood sugar changes.",
          strongAnswer: "No. After a meal, blood glucose rises above its set point, so the body needs to lower it. The pancreas releases insulin, which helps glucose move out of the blood and into the body’s cells, and blood glucose falls back toward its set point. Glucagon does the opposite job: the pancreas releases it when blood glucose is low, and it raises blood glucose.",
          whyItWorks: "The weak answer remembers that glucagon is a pancreas hormone but ignores which way blood glucose moved. The strong answer starts from the direction of the change, a rise, and picks the hormone whose response reverses it. That is how negative feedback works."
        },
        q(
          "A thermostat switches the heating on when a room gets too cold and off when the room warms up again. Which kind of control is that, the same kind the body uses for its temperature?",
          ["Positive feedback", "A set point", "Negative feedback", "Filtration"],
          "Negative feedback",
          "Does the heating push the temperature further the same way, or back the other way?",
          "The heating works against each change: a room that cools is warmed back up, and a room that warms has its heating switched off. A response that reverses the change is negative feedback, the same kind of control the body uses for its temperature. Positive feedback would push the change further the same way. The set point is the target temperature, not the kind of control, and filtration is what the kidneys do to the blood.",
          "Negative feedback"
        ),
        [
          q(
            "Which statement best describes homeostasis?",
            ["Keeping conditions inside the body steady while the outside changes", "Keeping every condition in the body at exactly the same value at all times", "Growing and repairing the body as fast as possible", "Storing extra energy so the body never runs short"],
            "Keeping conditions inside the body steady while the outside changes",
            "Think of sweating and shivering. What are they both for?",
            "Homeostasis is keeping conditions inside the body, such as temperature and blood glucose, steady within a narrow range while the outside world changes. The body does not hold them at exactly one value: it keeps nudging each one back toward its set point. Growing, repairing and storing energy are other things the body does, not homeostasis.",
            "Homeostasis"
          ),
          q(
            "Several hours after eating, a person’s blood glucose has dropped below its set point. Which hormone does the pancreas release to bring it back up?",
            ["Insulin", "Thyroid hormone", "ADH", "Glucagon"],
            "Glucagon",
            "The hormone you need raises blood glucose.",
            "Glucagon raises blood glucose, so the pancreas releases it when glucose is low; it signals the liver to release stored glucose into the blood. Insulin does the opposite and lowers blood glucose, for example after a meal. Thyroid hormone regulates the metabolic rate, and ADH controls how much water the kidneys keep.",
            "Pancreas hormones"
          ),
          q(
            "Thyroid hormone sets the pace at which the body’s cells use energy. What is that pace called?",
            ["The set point", "Blood glucose", "Metabolic rate", "Water balance"],
            "Metabolic rate",
            "Look back at the hormones section: it named the pace that thyroid hormone regulates.",
            "Metabolic rate is the pace at which the body’s cells use energy, and thyroid hormone, made by the thyroid gland in the neck, regulates it. A set point is the target value for a condition, not a pace. Blood glucose is regulated mainly by insulin and glucagon, and water balance by ADH and the kidneys.",
            "Thyroid hormone"
          ),
          q(
            "The kidneys filter a large amount of fluid out of the blood every day, yet only a small part of it leaves the body as urine. What happens to most of the filtered fluid?",
            ["It is stored in the bladder until later", "It is reabsorbed back into the blood", "It is turned into sweat by the skin", "It is sent on to the large intestine"],
            "It is reabsorbed back into the blood",
            "Think about the second of the kidney’s three steps.",
            "After filtration, the kidney tubules reabsorb most of the water and the substances the body needs, such as glucose and salts, so most of the filtered fluid is reabsorbed back into the blood. Only what is left becomes urine. The bladder stores that urine, not the rest of the filtered fluid; sweat is made by the skin from the blood, and the large intestine belongs to the digestive tract, not the urinary tract.",
            "Kidney function"
          ),
          q(
            "A student says the kidneys only get rid of waste. What else do they normally do?",
            ["Help keep the body’s water, salts and pH in balance", "Set the body’s metabolic rate", "Release insulin and glucagon to keep blood glucose steady", "Make the antibodies that defend the body"],
            "Help keep the body’s water, salts and pH in balance",
            "The kidneys decide how much of several things leaves the body in the urine.",
            "Besides removing waste, the kidneys help maintain the body’s fluid, electrolyte and pH balance: they adjust how much water, how much of each electrolyte and how much acid the body loses in the urine. Thyroid hormone sets the metabolic rate, the pancreas, not the kidneys, releases insulin and glucagon, and antibodies are made by white blood cells.",
            "Kidney function"
          )
        ],
        [
          q(
            "A person drinks several large glasses of water, and their body releases less ADH. What do the kidneys normally do next?",
            ["Reabsorb more water, making a small amount of concentrated urine", "Stop filtering the blood until the extra water has been breathed out", "Reabsorb less water, so more urine is made and it is more dilute", "Send the extra water to the pancreas so that insulin can remove it"],
            "Reabsorb less water, so more urine is made and it is more dilute",
            "ADH helps the body save water. What happens when there is less of it?",
            "Less ADH means the kidneys reabsorb less water, so more of it stays in the urine: more urine is made, and it is more dilute. That removes the extra water and brings the body’s water back toward its set point, which is negative feedback. Reabsorbing more water is what happens when ADH is high. The kidneys keep filtering the blood all the time, and insulin acts on glucose, not on water.",
            "ADH and the kidneys"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Homeostasis and negative feedback",
              body: "A feedback loop has three jobs: something detects a condition, something compares it with the set point, and some part of the body responds. In negative feedback the response pushes the condition back toward the set point.\n\nBody temperature control is an example of negative feedback that keeps your temperature near its set point. When your body gets too warm, you sweat and the blood vessels in your skin widen, and both help the body lose heat. When it gets too cold, you shiver, which makes heat. Either way, your temperature is pushed back toward its set point.\n\nPositive feedback, where the response pushes a change further the same way, is much less common. Temperature, blood glucose and the body’s water are all kept steady by negative feedback."
            },
            {
              heading: "Hormones: chemical messengers",
              body: "A hormone is a chemical messenger. A gland releases it into the blood, and the blood carries it around the body to the cells that respond to it.\n\nThe pancreas, an organ beside the digestive tract, regulates blood glucose by releasing two hormones with opposite jobs, insulin and glucagon. Insulin lowers blood glucose: after a meal, when glucose rises, insulin helps glucose move out of the blood and into the body’s cells. Glucagon raises blood glucose: when glucose falls, for example several hours after eating, glucagon signals the liver to release stored glucose into the blood.\n\nThe thyroid gland, in the front of the neck, makes thyroid hormone. Thyroid hormone regulates the body’s metabolic rate, the pace at which cells use energy. That pace affects how much heat the body makes."
            },
            {
              heading: "The kidneys: a balance organ",
              body: "The anatomy lessons showed that each kidney contains a very large number of tiny filtering units called nephrons. Here is what those units do, in three steps.\n\nFiltration: in each nephron, blood passes through a tiny cluster of capillaries, and water and small dissolved substances are pushed out of the blood into the nephron’s tubule. Blood cells and most large proteins normally stay in the blood. The fluid that has been filtered out is called filtrate.\n\nReabsorption: as the filtrate flows along the tubule, water and the substances the body needs, such as glucose and salts, are reabsorbed back into the blood. In normal kidney function, filtration is followed by reabsorption, and most of the filtered water is taken back.\n\nSecretion: the tubule can also move some extra substances out of the blood into the filtrate. What is left at the end is urine, which is carried to the bladder.\n\nAntidiuretic hormone (ADH) adjusts how much water is reabsorbed. When the body needs to save water, more ADH is released, and ADH makes the kidneys increase water reabsorption, so less urine is made and it is more concentrated. When there is extra water, less ADH is released, so more urine is made and it is more dilute.\n\nBesides removing waste, the kidneys help maintain the body’s fluid, electrolyte and pH balance. They adjust how much water, how much of each electrolyte (dissolved minerals such as sodium and potassium) and how much acid the body keeps or loses in the urine."
            }
          ],
          additionalExamples: [
            {
              setup: "Blood glucose falls several hours after breakfast. Which hormone responds, and from where?",
              strong: "Glucagon, from the pancreas. It raises blood glucose back toward its set point.",
              explanation: "The change is a fall, so the response has to raise glucose. Of the pancreas’s two hormones, glucagon is the one that raises it."
            },
            {
              setup: "On a cold morning you start to shiver. What kind of control is that?",
              strong: "Negative feedback. Your body temperature fell, and shivering makes heat that brings it back up toward its set point.",
              explanation: "The response works against the change, which is what makes it negative feedback."
            }
          ],
          misconception: {
            wrongModel: "The kidneys throw away everything they filter out of the blood.",
            whyItFails: "Filtration takes a large amount of fluid out of the blood, including water, glucose and salts the body needs. If all of it left as urine, the body would lose its water and useful substances very quickly.",
            betterModel: "Filtration is followed by reabsorption. Most of the filtered water and nearly all of the useful substances are reabsorbed back into the blood, and only what is left becomes urine."
          },
          commonMistakes: [
            {
              mistake: "Thinking “negative feedback” means something has gone wrong.",
              whyItFails: "Negative describes the direction of the response, not whether it is good or bad. Negative feedback is how the body normally stays in balance, all day long.",
              fix: "Read negative as “reverses the change”: a rise is answered by something that lowers, and a fall by something that raises."
            },
            {
              mistake: "Swapping insulin and glucagon.",
              whyItFails: "Both come from the pancreas and both act on blood glucose, so the organ does not tell them apart. Only the direction does.",
              fix: "Insulin lowers blood glucose, as after a meal. Glucagon raises it, when glucose is low: think “glucose is gone, call glucagon”."
            },
            {
              mistake: "Reading ADH as a hormone that makes more urine.",
              whyItFails: "Anti- means against, and diuresis means making a lot of urine, so an antidiuretic hormone works against urine loss.",
              fix: "ADH saves water: more ADH means more water is reabsorbed and less urine is made."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-physiology-heart-and-blood",
    description: "Say what each part of the blood does, follow one heartbeat from the SA node to the ventricles, and explain the valves and cardiac output.",
    category: "Health science",
    order: 12,
    lesson: {
      title: "Heart and Blood at Work",
      slug: "hosa-physiology-heart-and-blood-lesson",
      summary: "Learn what plasma, red cells, white cells and platelets do, follow the electrical signal through one heartbeat, and see how the valves and cardiac output work.",
      estimatedMinutes: 14,
      content: lesson(
        "Say what plasma, red blood cells, white blood cells and platelets normally do, put the steps of one heartbeat in order from the SA node, explain what the heart valves do, and work out how cardiac output changes when heart rate or stroke volume changes.",
        "Put two fingers on the inside of your wrist, just below the base of your thumb, and you can feel your pulse: one push of blood for every beat of your heart. The anatomy lessons showed the heart’s four chambers and the vessels that carry blood. This lesson shows what the heart and the blood are doing while you feel that pulse.\n\nBlood is a transport system. Its liquid part, plasma, carries things dissolved in it. Red blood cells and white blood cells travel along in the plasma: red blood cells carry oxygen, and white blood cells defend the body. Platelets travel with them; they are small cell fragments, not whole cells, and they help stop bleeding.\n\nThe heart is the pump that keeps the blood moving. Each beat starts with a tiny electrical signal inside the heart itself. The signal makes the upper chambers, the atria, squeeze first and the lower chambers, the ventricles, a moment later, and valves make sure the blood goes only one way.",
        "Questions on the heart often ask what happens in what order, or what a part is for: where the signal goes next, what the valves do, or what a kind of blood cell carries. If you can follow one heartbeat and one drop of blood, you can reason about each part instead of guessing.",
        [
          "For a blood question, name the part of the blood first (plasma, red cells, white cells or platelets) and say its one main job.",
          "For a heartbeat question, say the signal’s path in order: SA node, atria, AV node, bundle of His, bundle branches, Purkinje fibers, ventricles.",
          "Decide whether the question is about contracting (systole) or relaxing and filling (diastole), and which chambers it means.",
          "For cardiac output, multiply in your head: if one factor goes up and the other stays the same, the result goes up."
        ],
        {
          prompt: "A student says the heart valves are what pump blood out of the heart. Is that right? (Our example, not an official test question.)",
          weakAnswer: "Yes. The valves open and shut with every beat, so they must be what pushes the blood.",
          strongAnswer: "No. The heart muscle does the pumping: when the ventricles contract, they push blood out. The valves are flaps that open to let blood pass forward and close to stop it flowing backward. Their job is to keep blood moving in one direction.",
          whyItWorks: "The weak answer sees that the valves move with each beat and assumes they cause the flow. The strong answer separates the two jobs: the muscle pushes, and the valves direct. The valves open and close because of the pressure changes as the muscle squeezes and relaxes."
        },
        q(
          "Which part of the blood carries oxygen from the lungs to the rest of the body?",
          ["Plasma", "White blood cells", "Platelets", "Red blood cells"],
          "Red blood cells",
          "Look for the cells that contain hemoglobin.",
          "Red blood cells carry oxygen from the lungs to the body’s tissues, held by a protein inside them called hemoglobin. Plasma carries the cells, nutrients, hormones and wastes in fluid, white blood cells defend the body, and platelets help stop bleeding.",
          "Parts of the blood"
        ),
        [
          q(
            "Which order does the heartbeat’s electrical signal follow, starting at the SA node?",
            ["SA node, atria, AV node, bundle of His, bundle branches, Purkinje fibers", "SA node, AV node, atria, Purkinje fibers, bundle branches, bundle of His", "SA node, atria, Purkinje fibers, bundle branches, bundle of His, AV node", "SA node, atria, bundle of His, AV node, bundle branches, Purkinje fibers"],
            "SA node, atria, AV node, bundle of His, bundle branches, Purkinje fibers",
            "The signal pauses at one node before it goes on toward the ventricles.",
            "The signal starts in the SA node, then the atria, then the AV node, which holds it back for a moment so the ventricles can finish filling. From there it runs down the bundle of His, splits into the bundle branches, and spreads through the Purkinje fibers in the ventricle walls, so the ventricles contract.",
            "The heartbeat"
          ),
          q(
            "When the ventricles relax after a beat, the blood just pumped into the aorta is under pressure. What stops it from flowing back into the heart?",
            ["The SA node", "A valve that closes", "The septum", "The AV node"],
            "A valve that closes",
            "Which part of the heart has the job of keeping blood moving in one direction?",
            "A valve at the start of the aorta closes when the ventricles relax, so blood cannot flow backward into the heart. Keeping blood moving in one direction is the valves’ job. The SA node and the AV node carry the electrical signal, and the septum is the wall between the heart’s right and left sides.",
            "Heart valves"
          ),
          q(
            "The ventricles contract and push blood out into the aorta and the pulmonary artery. What is that part of the heartbeat called?",
            ["Atrial diastole", "Atrial systole", "Ventricular systole", "Ventricular diastole"],
            "Ventricular systole",
            "Name the chambers, then choose between the word for contracting and the word for relaxing.",
            "Systole means contracting, so the ventricles contracting and ejecting blood is ventricular systole. Diastole means relaxing and filling. Atrial systole is the atria contracting, just before the ventricles contract, and atrial diastole is the atria relaxing and filling, which happens while the ventricles are contracting.",
            "The heartbeat"
          ),
          q(
            "A person’s heart rate stays the same, but each beat now pushes out more blood. What happens to their cardiac output?",
            ["It falls", "It stays the same", "It rises", "It is set by the valves alone"],
            "It rises",
            "Cardiac output is heart rate multiplied by stroke volume.",
            "Cardiac output is heart rate multiplied by stroke volume. Stroke volume, the blood pushed out in each beat, has gone up while heart rate stayed the same, so cardiac output rises. With heart rate unchanged, it would stay the same only if stroke volume stayed the same, and it would fall only if stroke volume went down. The valves direct the blood; they do not set the output.",
            "Cardiac output"
          ),
          q(
            "B cells, a kind of white blood cell, make antibodies. Which body system do white blood cells belong to?",
            ["The endocrine system", "The immune system", "The respiratory system", "The nervous system"],
            "The immune system",
            "What are antibodies for? Name the body system that does that job.",
            "White blood cells, including the B cells that make antibodies, are part of the immune system, which defends the body against germs. The endocrine system is the glands that release hormones, the respiratory system moves air in and out, and the nervous system carries signals along nerves.",
            "Parts of the blood"
          )
        ],
        [
          q(
            "A small cut on a finger bleeds for a moment and then stops. Which describes what the blood does to seal the break?",
            ["Fibrin threads form first, then platelets gather on them", "Platelets clump into a plug, then fibrin threads strengthen it", "Red blood cells clump into a plug, then plasma dries over it", "White blood cells seal the break, then platelets carry oxygen to it"],
            "Platelets clump into a plug, then fibrin threads strengthen it",
            "Think of which part of the blood exists to help stop bleeding.",
            "Platelets clump at the injury site to form a plug, and then fibrin threads form a mesh that strengthens the plug into a clot. Fibrin forms after the platelets gather, not before. Red blood cells carry oxygen and plasma carries dissolved substances; neither makes the plug. White blood cells defend the body, and platelets do not carry oxygen.",
            "Parts of the blood"
          )
        ],
        {
          teachingSections: [
            {
              heading: "What the blood carries",
              body: "Plasma, the liquid part of blood, is mostly water, and its job is to carry cells, nutrients, hormones and wastes in fluid around the body.\n\nRed blood cells carry oxygen from the lungs to the body’s tissues. Inside each one is a protein called hemoglobin, which holds on to the oxygen.\n\nWhite blood cells defend the body against germs, such as bacteria and viruses, and they are part of the immune system. One kind, called B cells, makes antibodies: proteins that attach to one particular germ and help the body destroy it. The immune system is the body system that produces antibodies.\n\nPlatelets are small cell fragments that help stop bleeding. When a small blood vessel is cut, platelets clump at the injury site to form a plug. Then threads of a protein called fibrin form a mesh that strengthens the plug into a clot."
            },
            {
              heading: "One heartbeat, step by step",
              body: "Each heartbeat starts with an electrical signal from the SA node (sinoatrial node), a small patch of special tissue in the wall of the right atrium. It sets the pace of the heartbeat, so it is called the heart’s natural pacemaker.\n\nThe signal spreads across both atria, and they contract, pushing blood down into the ventricles. This is atrial systole.\n\nAfter spreading across the atria, the signal next reaches the AV node (atrioventricular node), between the atria and the ventricles. The AV node holds the signal back for a moment, so the ventricles can finish filling before they contract.\n\nFrom the AV node, the signal runs down the bundle of His, splits into the left and right bundle branches, and spreads through the Purkinje fibers in the walls of the ventricles.\n\nThis is ventricular systole: the ventricles contract and eject blood into the aorta, which carries it to the body, and the pulmonary artery, which carries it to the lungs.\n\nThen the ventricles relax and fill with blood again. This is ventricular diastole. Systole means contracting, and diastole means relaxing and filling."
            },
            {
              heading: "Valves, heart rate and cardiac output",
              body: "The heart has four valves. One sits between each atrium and the ventricle below it, and one sits at the start of each of the two large arteries that leave the ventricles, the aorta and the pulmonary artery. Each valve is a set of flaps that opens to let blood pass forward and closes to stop it flowing back. The valves open and close because of the pressure changes as the heart squeezes and relaxes. The valves’ job is to keep blood moving in one direction. The heart muscle, not the valves, does the pumping.\n\nHeart rate is the number of heartbeats in one minute. For an adult at rest, a typical heart rate is about 60 to 100 beats per minute. That is a general range for adults at rest, not a way to tell whether a particular person’s heart is healthy: heart rate rises with exercise, excitement or fear, and it differs from person to person.\n\nStroke volume is the amount of blood one ventricle pushes out in one beat. Cardiac output is the amount of blood one ventricle pumps out in one minute, and it equals heart rate multiplied by stroke volume. So if heart rate rises while stroke volume stays the same, cardiac output increases, and the same happens if stroke volume rises while heart rate stays the same."
            }
          ],
          additionalExamples: [
            {
              setup: "Which part of the heart sets the pace of the heartbeat?",
              strong: "The SA node, in the wall of the right atrium. It is the heart’s natural pacemaker.",
              explanation: "The heartbeat’s signal starts at the SA node, so the SA node sets the pace. The AV node comes later on the signal’s path."
            },
            {
              setup: "A runner’s heart rate goes up during a race, and each beat also pushes out more blood. What happens to cardiac output?",
              strong: "It increases, because both factors in heart rate multiplied by stroke volume have gone up.",
              explanation: "When either factor rises and the other does not fall, the product rises. Here both rise."
            }
          ],
          misconception: {
            wrongModel: "Cardiac output is just another name for heart rate.",
            whyItFails: "Heart rate counts beats, but each beat can push out more or less blood. Two hearts beating at the same rate pump different amounts if their stroke volumes differ.",
            betterModel: "Cardiac output is heart rate multiplied by stroke volume, so it depends both on how often the heart beats and on how much blood each beat pushes out."
          },
          commonMistakes: [
            {
              mistake: "Swapping systole and diastole.",
              whyItFails: "Both words name a phase of the heartbeat and differ only at the start, so they are easy to swap under pressure.",
              fix: "Systole is the squeeze: contracting and pushing blood out. Diastole is relaxing and filling. Then add which chambers: atrial or ventricular."
            },
            {
              mistake: "Starting the heartbeat at the AV node.",
              whyItFails: "The AV node is on the signal’s path, but the signal starts before it, in the SA node in the right atrium. The AV node is where the signal pauses on its way to the ventricles.",
              fix: "Start at the SA node, the pacemaker, and say the path in order: SA node, atria, AV node, bundle of His, bundle branches, Purkinje fibers."
            },
            {
              mistake: "Thinking plasma carries the oxygen.",
              whyItFails: "Plasma carries the blood cells and many dissolved substances, but very little oxygen travels dissolved in it. Almost all of the oxygen is held by hemoglobin inside the red blood cells.",
              fix: "Oxygen travels in red blood cells, on hemoglobin. Plasma carries the cells, nutrients, hormones and wastes."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-physiology-breathing-and-digestion",
    description: "Explain how the diaphragm moves air, how oxygen and carbon dioxide cross in the alveoli, what drives breathing, and what each part of the digestive tract does.",
    category: "Health science",
    order: 13,
    lesson: {
      title: "Breathing and Digestion at Work",
      slug: "hosa-physiology-breathing-and-digestion-lesson",
      summary: "Learn how breathing moves air, why gases cross between the alveoli and the blood, and what the stomach, small intestine, bile and large intestine each do.",
      estimatedMinutes: 14,
      content: lesson(
        "Explain how the diaphragm moves air in and out, why oxygen and carbon dioxide cross between the alveoli and the blood, what mainly makes you breathe more, and what peristalsis, the small intestine, bile and the large intestine each do.",
        "Take a slow, deep breath with a hand on your belly. As you breathe in, your belly moves out a little. That movement comes from the diaphragm, the dome-shaped muscle below the lungs that the anatomy lessons called the main muscle of breathing: as it contracts, it pushes down on the organs below it.\n\nThe respiratory system’s main job is to exchange oxygen and carbon dioxide: it brings oxygen into the blood and removes carbon dioxide from it. The digestive system’s job is to break food down into pieces small enough for the body to absorb, and to get rid of what is left.\n\nThis lesson follows the air in and out of the lungs, and then the food along the digestive tract, saying what happens at each stop.",
        "Questions on breathing and digestion usually ask what happens at one stop along a path: what the diaphragm does, which way a gas moves, where nutrients are absorbed, or what bile is for. If you know the path and the job at each stop, you can place any step instead of guessing.",
        [
          "Decide which path the question is on: air in and out of the lungs, or food along the digestive tract.",
          "For breathing, ask whether the step is breathing in or breathing out, and what the diaphragm is doing.",
          "For a gas, compare its partial pressure on each side. It diffuses from the higher side to the lower side.",
          "For digestion, find the stop on the path (stomach, small intestine or large intestine) and say that stop’s main job."
        ],
        {
          prompt: "A student says bile is an enzyme that digests fat. Is that right? (Our example, not an official test question.)",
          weakAnswer: "Yes. Bile works on fat in the small intestine, so it must be one of the enzymes that digest it.",
          strongAnswer: "No. Bile is not an enzyme. It emulsifies fats: it breaks big fat drops into many tiny droplets, so enzymes have far more surface to work on. The enzymes that then break the fat down come mostly from the pancreas.",
          whyItWorks: "The weak answer mixes up helping digestion with doing it. The strong answer names bile’s real job, emulsifying, and keeps the enzymes’ job separate."
        },
        q(
          "As you breathe in, what is the diaphragm doing, and what happens to the chest cavity?",
          ["Relaxing and doming up; the chest gets smaller", "Relaxing and flattening; the chest gets bigger", "Contracting and doming up; the chest gets smaller", "Contracting and flattening; the chest gets bigger"],
          "Contracting and flattening; the chest gets bigger",
          "Air flows in when the pressure inside the lungs drops.",
          "Breathing in starts with the diaphragm contracting and flattening downward, which makes the chest cavity bigger and lowers the pressure inside the lungs, so air flows in. Relaxing and doming up is what the diaphragm does when you breathe out, and that makes the chest smaller. A muscle that contracts shortens, so it flattens rather than domes up.",
          "Breathing"
        ),
        [
          q(
            "In the alveoli, the air has a higher partial pressure of oxygen than the blood arriving from the body. What does the oxygen do?",
            ["It stays in the alveoli until the heart pulls it in", "It diffuses from the alveoli into the blood", "It diffuses from the blood into the alveoli", "It is carried across by peristalsis"],
            "It diffuses from the alveoli into the blood",
            "Compare the two sides of the alveolar wall. Which way does a gas move?",
            "Oxygen diffuses from the alveoli into the blood, because a gas spreads from where its partial pressure is higher to where it is lower. Carbon dioxide diffuses the other way, from the blood into the alveoli. Nothing pumps or pulls the gases across, and peristalsis moves food, not air.",
            "Gas exchange"
          ),
          q(
            "You hold your breath, and the urge to breathe grows stronger and stronger. What is mainly causing that urge?",
            ["A rise in carbon dioxide", "A fall in blood glucose levels", "A rise in blood calcium", "A tiring diaphragm muscle"],
            "A rise in carbon dioxide",
            "Think about what the sensors in the brainstem and neck are most sensitive to.",
            "Holding your breath lets carbon dioxide build up in the blood, because it is no longer being breathed out, and a rise in carbon dioxide is the main chemical signal to breathe. Blood glucose and calcium do not drive breathing, and the urge does not come from the diaphragm getting tired.",
            "Control of breathing"
          ),
          q(
            "Food keeps moving along your intestines even when you are lying down. What moves it?",
            ["Gravity", "Bile from the gallbladder", "Peristalsis", "The diaphragm"],
            "Peristalsis",
            "The walls of the digestive tract contain muscle. What does that muscle do?",
            "Peristalsis, waves of muscle contraction in the walls of the digestive tract, squeezes food along, which is why it keeps moving even when you lie down. Gravity cannot be what moves it, or food would stop when you lie flat. Bile emulsifies fats, and the diaphragm is a breathing muscle.",
            "Digestion"
          ),
          q(
            "A nutrient from your lunch has just passed from the digestive tract into the body. Where did that most likely happen?",
            ["In the stomach", "In the small intestine", "In the large intestine", "In the gallbladder"],
            "In the small intestine",
            "Its lining is covered in villi.",
            "The small intestine completes most digestion and absorbs most nutrients through the villi that line it, so that is where a nutrient most likely entered the body. The stomach begins protein digestion, the large intestine mainly reabsorbs water and electrolytes, and the gallbladder stores bile; food never passes through it.",
            "Digestion"
          ),
          q(
            "By the time material reaches the large intestine, most nutrients have already been absorbed. What does the large intestine mainly take back?",
            ["Most of the protein and fat", "Carbon dioxide", "Glucose from the meal", "Water and electrolytes"],
            "Water and electrolytes",
            "Think of what the body still needs from what is left.",
            "Water and electrolytes are what the large intestine mainly takes back as material passes through it, and the waste becomes firmer before it leaves the body. Protein, fat and glucose are absorbed earlier, in the small intestine, and carbon dioxide leaves the body through the lungs.",
            "Digestion"
          )
        ],
        [
          q(
            "Which pairing of a part and its normal job is correct?",
            ["Small intestine: completes most digestion and absorbs most nutrients", "Bile: an enzyme that breaks fats into their building blocks", "Large intestine: completes most digestion and absorbs most nutrients", "Diaphragm: relaxes and domes up to pull air in"],
            "Small intestine: completes most digestion and absorbs most nutrients",
            "Check each pairing against that stop’s main job.",
            "The small intestine completes most digestion and absorbs most nutrients, so that pairing is correct. The large intestine mainly reabsorbs water and electrolytes. Bile emulsifies fats but is not an enzyme, and the diaphragm contracts and flattens to pull air in; relaxing is breathing out.",
            "Digestion"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Breathing in and out",
              body: "Moving air in and out of the lungs is called ventilation. Breathing in is inhalation, and breathing out is exhalation.\n\nWhen you breathe in, the diaphragm contracts and flattens downward, which makes the chest cavity bigger. Muscles between the ribs help by lifting the ribs up and out. A bigger chest lowers the air pressure inside the lungs below the pressure of the air outside, so air flows in. In short, contracting and flattening means the chest gets bigger and air comes in.\n\nWhen you breathe out quietly, the diaphragm relaxes and domes back up, the chest gets smaller, the pressure inside the lungs rises, and air flows out. Quiet breathing out is passive: it needs no extra muscle work."
            },
            {
              heading: "Gas exchange in the alveoli",
              body: "The alveoli are tiny air sacs, each wrapped in capillaries. Their walls and the capillary walls are so thin that gases pass straight through them.\n\nGases move by diffusion: a gas spreads from where its partial pressure is higher to where it is lower. Partial pressure is the share of the air’s pressure that comes from one gas; the more of that gas there is, the higher its partial pressure. A difference in partial pressure between two places is called a partial-pressure gradient, and moving down the gradient means moving from the higher side to the lower side.\n\nIn the alveoli, oxygen moves into the blood by diffusion down a partial-pressure gradient: the air in the alveoli has a higher partial pressure of oxygen than the blood arriving from the body, so oxygen diffuses from the alveoli into the blood. Carbon dioxide moves the opposite way, from the blood into the alveoli, down its own gradient, and you breathe it out. Diffusion needs no pump and no energy from the cells."
            },
            {
              heading: "What makes you breathe more",
              body: "Your breathing speeds up and slows down on its own. Sensors called chemoreceptors, in the brainstem and in large arteries in the neck and chest, keep track of the chemistry of the blood.\n\nIn a healthy person at rest, the main chemical signal to breathe more is a rise in carbon dioxide in the blood, not a fall in oxygen. The sensors are very sensitive to carbon dioxide, because even a small rise makes the blood slightly more acidic. When carbon dioxide rises, you breathe faster and deeper, which increases ventilation and removes more of it. That is negative feedback, the same idea as in the balance lesson."
            },
            {
              heading: "Food along the digestive tract",
              body: "Peristalsis moves food through the digestive tract: waves of muscle contraction in the walls of the tube squeeze the food along, from the esophagus all the way through the intestines. It works even when you are lying down.\n\nThe stomach churns food and mixes it with acid and an enzyme that begin to digest protein.\n\nThe small intestine’s main job is to complete most digestion and absorb most nutrients. Enzymes, many of them from the pancreas, finish breaking food down into small molecules, and the villi lining the small intestine take those molecules into the body.\n\nBile helps with fats. It is made in the liver and stored in the gallbladder, which releases it into the small intestine. Bile is not an enzyme: its job is to emulsify fats, breaking big fat drops into tiny droplets so that enzymes can break them down faster.\n\nThe large intestine receives what is left. As material passes through it, the large intestine reabsorbs water and electrolytes (dissolved minerals such as sodium and potassium), and the waste becomes firmer before it leaves the body."
            }
          ],
          additionalExamples: [
            {
              setup: "Where is bile made, and where does it do its job?",
              strong: "It is made in the liver and stored in the gallbladder, which releases it into the small intestine, where it emulsifies fats.",
              explanation: "Bile does its job in the small intestine, where most digestion is completed. The liver makes it and the gallbladder stores it, but food never passes through either."
            },
            {
              setup: "Which way does carbon dioxide move in the alveoli?",
              strong: "Out of the blood and into the alveoli, because its partial pressure is higher in the blood arriving from the body than in the air in the alveoli. Then you breathe it out.",
              explanation: "Each gas diffuses down its own partial-pressure gradient, from the higher side to the lower side, so the two gases cross in opposite directions."
            }
          ],
          misconception: {
            wrongModel: "You breathe because your body notices that it is running low on oxygen.",
            whyItFails: "Oxygen does fall when you stop breathing, but the sensors respond strongly to oxygen only after it has fallen a long way. They are much more sensitive to carbon dioxide: even a small rise makes the blood slightly more acidic, and that strongly drives breathing.",
            betterModel: "At rest, the main chemical signal to breathe more is a rise in carbon dioxide. That is why the urge to breathe grows while you hold your breath."
          },
          commonMistakes: [
            {
              mistake: "Thinking the lungs pull air in by themselves.",
              whyItFails: "The lungs do not pull in air on their own. They expand because the diaphragm and the rib muscles make the chest bigger, which lowers the pressure inside them.",
              fix: "Start every breathing question with the diaphragm: contracting and flattening means breathing in, and relaxing and doming up means breathing out."
            },
            {
              mistake: "Thinking the large intestine absorbs most nutrients.",
              whyItFails: "By the time food reaches the large intestine, most nutrients have already been taken into the body in the small intestine. The large intestine mainly takes back water and electrolytes.",
              fix: "Small intestine: finish digestion and take in most nutrients. Large intestine: reabsorb water and electrolytes."
            },
            {
              mistake: "Mixing up which way each gas moves in the lungs.",
              whyItFails: "Oxygen and carbon dioxide cross the same thin walls, but in opposite directions.",
              fix: "Each gas moves from where its partial pressure is higher to where it is lower: oxygen from the alveoli into the blood, and carbon dioxide from the blood into the alveoli."
            }
          ]
        }
      )
    }
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-physiology-nerves-and-muscles",
    description: "Follow a nerve signal across a synapse, explain a reflex and the two branches that ready the body for action or rest, compare nerves with hormones, and put a muscle contraction in order.",
    category: "Health science",
    order: 14,
    lesson: {
      title: "Nerves and Muscles: Fast Signals",
      slug: "hosa-physiology-nerves-and-muscles-lesson",
      summary: "Learn how nerve cells pass signals on, why a reflex moves you before you feel anything, how the body switches between action and rest, and how calcium lets a muscle contract.",
      estimatedMinutes: 14,
      content: lesson(
        "Explain how a nerve signal crosses a synapse, why a withdrawal reflex happens before the brain processes the sensation, what the sympathetic and parasympathetic branches do, how hormones differ from nerve signals, and what lets a muscle fiber contract.",
        "If you ever touch something very hot by accident, your hand jerks away before you even feel the heat. That fast, automatic movement is a reflex, and it shows how quickly nerves can work.\n\nThe anatomy lessons divided the nervous system into the central nervous system (the brain and spinal cord) and the peripheral nervous system (the nerves outside them). The working units of both are nerve cells, called neurons. A neuron carries an electrical signal along its length, and at its end it passes the signal on to the next cell.\n\nThis lesson follows that signal: across the gap to the next cell, through a reflex, into the branches that ready the body for action or for rest, and finally into a muscle, where it makes the muscle contract.",
        "Questions on nerves and muscles often ask about a sequence: what happens at the gap between two cells, which way a reflex signal travels, or which step lets a muscle contract. If you can tell the story in order, you can find the step a question is asking about.",
        [
          "Decide what the question is about: a signal passing between cells, a reflex, the body getting ready for action or rest, or a muscle contracting.",
          "Tell the signal’s story in order, from where it starts to where it ends.",
          "For action or rest, ask which branch is working: sympathetic for action, parasympathetic for rest and digestion.",
          "For a muscle, say what calcium does before you say what actin and myosin do."
        ],
        {
          prompt: "A student touches a hot pan and says, “My brain felt the heat and then told my hand to move.” Is that the right order? (Our example, not an official test question.)",
          weakAnswer: "Yes. The brain is in charge of the body, so it has to decide before the hand can move.",
          strongAnswer: "No. In a withdrawal reflex, the signal from the skin goes to the spinal cord, and the spinal cord sends a signal straight back out to the arm muscles. The hand moves through the spinal cord, before the brain processes the sensation. The signal also travels up to the brain, which is why you feel the heat, but by then the hand is already moving.",
          whyItWorks: "The weak answer assumes every movement starts with a decision in the brain. The strong answer follows the reflex path, from the skin to the spinal cord and back out to the muscle, which is shorter and faster, and explains why the feeling comes after the movement."
        },
        q(
          "A signal has reached the end of a neuron, where a tiny gap separates it from the next cell. What carries the signal across that gap?",
          ["An electrical spark that jumps the gap", "A neurotransmitter released into the gap", "Blood flowing between the two cells", "The neuron growing until it touches the next cell"],
          "A neurotransmitter released into the gap",
          "At a chemical synapse, the two cells do not touch.",
          "The sending neuron releases a neurotransmitter, a chemical messenger, into the gap, which is called the synaptic cleft. The neurotransmitter crosses the cleft and attaches to receptors on the next cell. At a typical chemical synapse the cells do not touch, no electrical spark jumps the gap, and blood does not carry the signal across.",
          "Synapses"
        ),
        [
          q(
            "After a meal, as you sit and rest, one branch of the nervous system slows your heart and helps digestion. Which branch is it?",
            ["The sympathetic branch", "The central nervous system", "The parasympathetic branch", "The endocrine system"],
            "The parasympathetic branch",
            "One branch is for action, and the other is for rest and digestion.",
            "The parasympathetic branch supports rest and digestion: it slows the heart and helps digestion work. The sympathetic branch does the opposite and prepares the body for exertion. The central nervous system is the brain and spinal cord, and the endocrine system works through hormones.",
            "Action and rest"
          ),
          q(
            "A message travels in the blood, takes a while to have an effect, and keeps working for a long time. What kind of messenger is it most likely to be?",
            ["A hormone", "A reflex", "A signal along a neuron", "A neurotransmitter crossing a synapse"],
            "A hormone",
            "Nerve signals are fast and brief. The other kind of messenger is carried in the blood.",
            "A hormone travels in the bloodstream and acts more slowly but for longer than a nerve signal, so a slow, long-lasting message carried in the blood is most likely a hormone. A reflex, a signal along a neuron and a neurotransmitter crossing a synapse are all part of nerve signalling, which acts within a fraction of a second.",
            "Nerves and hormones"
          ),
          q(
            "Inside a muscle fiber, which two protein filaments slide past each other to shorten it?",
            ["Troponin and tropomyosin", "Tendons and ligaments", "Neurons and synapses", "Actin and myosin"],
            "Actin and myosin",
            "One filament is thin and the other is thick.",
            "Actin and myosin are the two filaments that slide: the myosin heads attach to the actin and pull it along, which shortens the fiber. Troponin and tropomyosin are attached to the actin and move with it, but they are control proteins that decide whether myosin can attach; the filaments that slide past each other are actin and myosin. Tendons and ligaments are outside the fiber, and neurons carry the signal to it.",
            "Muscle contraction"
          ),
          q(
            "You step on a sharp stone and lift your foot before you even feel it. Which route did that reflex signal take?",
            ["Skin to the brain, which then signals the leg muscles", "Skin to the spinal cord, then back to the leg muscles", "Skin to the leg muscles directly, with no nerve involved", "Skin to a gland, which releases a hormone into the blood"],
            "Skin to the spinal cord, then back to the leg muscles",
            "Where does a withdrawal reflex signal turn back toward the muscles?",
            "In a withdrawal reflex the signal goes from the skin to the spinal cord, and the spinal cord sends it straight back to the leg muscles, so the foot moves before the brain processes the feeling. The signal travels to the brain too, but by the time the brain has processed it and you feel it, the foot is already moving. A reflex needs nerves, and a hormone in the blood would be far too slow.",
            "Reflexes"
          ),
          q(
            "You sprint to catch a bus. Which change does the sympathetic branch normally make?",
            ["Your heart slows so that it does not tire out during the run", "Your digestion speeds up to release more energy from the food you ate", "Your heart rate rises and more blood goes to your skeletal muscles", "Your kidneys make more urine to lighten your load"],
            "Your heart rate rises and more blood goes to your skeletal muscles",
            "This branch gets the body ready for exertion.",
            "The sympathetic branch raises your heart rate and shifts more blood toward your skeletal muscles, preparing you for exertion. Slowing the heart and speeding up digestion are what the parasympathetic branch does during rest, and the sympathetic branch actually slows digestion for a while. Making more urine does not help you run.",
            "Action and rest"
          )
        ],
        [
          q(
            "A nerve signal reaches a skeletal muscle fiber. Which order of events follows?",
            ["Calcium is released, calcium binds to troponin, the binding sites on actin are exposed, myosin pulls the actin", "Myosin pulls the actin, calcium is released, calcium binds to troponin, the binding sites on actin are exposed", "Calcium is released, the binding sites on actin are exposed, calcium binds to troponin, myosin pulls the actin", "Calcium binds to troponin, myosin pulls the actin, calcium is released, the binding sites on actin are exposed"],
            "Calcium is released, calcium binds to troponin, the binding sites on actin are exposed, myosin pulls the actin",
            "Something must uncover the binding sites before myosin can attach.",
            "First calcium is released inside the fiber, then calcium binds to troponin, which moves the tropomyosin aside, so the binding sites on actin are exposed, myosin attaches and pulls the actin. Myosin cannot pull before the sites are uncovered, and the sites are uncovered only after calcium has bound to troponin.",
            "Muscle contraction"
          )
        ],
        {
          teachingSections: [
            {
              heading: "Passing a signal across a synapse",
              body: "Most neurons do not touch the next cell. The place where a signal passes from one cell to the next is called a synapse, and at a typical chemical synapse there is a tiny gap between the two cells, called the synaptic cleft.\n\nWhen the signal reaches the end of the sending neuron, the neuron releases a neurotransmitter into the synaptic cleft. A neurotransmitter is a chemical messenger. Once it is released into the gap, it crosses the cleft and attaches to receptors on the next cell, which can start a new signal in that cell or make one more or less likely. The neurotransmitter is then quickly cleared from the gap, so each signal is brief. So at a chemical synapse, a chemical carries the signal across the gap."
            },
            {
              heading: "Reflexes",
              body: "A reflex is a fast, automatic response that you do not have to think about. In a withdrawal reflex, such as pulling your hand off something hot, the signal travels from sensors in the skin to the spinal cord, and the spinal cord sends a signal straight back to the muscles that move the hand. The protective movement happens through the spinal cord, before the brain processes the sensation. The signal also travels up to the brain, so you feel the heat a moment later. Stepping on something sharp works the same way: the spinal cord signals the leg muscles to lift your foot before you feel it."
            },
            {
              heading: "Ready for action, or ready to rest",
              body: "Part of the nervous system works without you thinking about it, controlling things like heart rate and digestion. It is called the autonomic nervous system, and it has two branches that usually work in opposite directions.\n\nThe sympathetic branch prepares the body for exertion, sometimes called “fight or flight”. Sympathetic activity prepares the body by raising heart rate and shifting blood toward skeletal muscle, the muscles that move the skeleton. When the sympathetic branch is active, your heart rate rises and more blood goes to your skeletal muscles. It also slows digestion for a while.\n\nThe parasympathetic branch supports rest and digestion. It slows the heart rate and helps digestion work."
            },
            {
              heading: "Nerves and hormones compared",
              body: "Nerves and hormones both carry messages, but in different ways. A nerve signal travels along neurons and acts within a fraction of a second, on the exact cells it reaches. Compared with nerve signals, hormones travel in the bloodstream and act more slowly but for longer. A hormone reaches every part of the body the blood does, but only cells with the right receptors respond to it."
            },
            {
              heading: "How a muscle contracts",
              body: "A skeletal muscle is made of long cells called muscle fibers. Inside each fiber are two kinds of protein filament: thin ones called actin and thick ones called myosin. When the muscle contracts, the actin and myosin filaments slide past each other, which shortens the fiber.\n\nAt rest, a protein called tropomyosin lies along the actin and covers the binding sites, the places where myosin could attach.\n\nWhen a nerve signal reaches the fiber, calcium is released from a store inside the fiber called the sarcoplasmic reticulum. Calcium binds to troponin, a protein attached to the tropomyosin, which shifts the tropomyosin aside and exposes the binding sites on actin. Once the binding sites on actin are exposed, the heads of the myosin filaments attach to the actin, pull it, let go and attach again, over and over, using energy. This is called cross-bridge cycling, and myosin pulls the actin along with every cycle.\n\nWhen the nerve signal stops, calcium is pumped back into its store, the tropomyosin covers the binding sites again, and the muscle relaxes."
            }
          ],
          additionalExamples: [
            {
              setup: "In a withdrawal reflex, where does the signal turn back toward the muscles?",
              strong: "In the spinal cord. The signal comes in from the skin, and the spinal cord sends one straight back out to the muscles without waiting for the brain.",
              explanation: "That short path through the spinal cord is why a withdrawal reflex is so fast, and why you feel the sensation only after you have already moved."
            },
            {
              setup: "Why does a hormone’s effect usually last longer than a nerve signal’s?",
              strong: "A hormone stays in the blood and keeps reaching the cells that respond to it until the body breaks it down or removes it, which can take minutes or hours. At a synapse, the neurotransmitter is cleared from the gap almost at once, so a nerve signal’s effect is soon over.",
              explanation: "The reason is how long the messenger stays around: a hormone lingers in the blood, while a neurotransmitter is cleared from the synapse within a fraction of a second."
            }
          ],
          misconception: {
            wrongModel: "A nerve signal jumps straight across the gap to the next cell as electricity.",
            whyItFails: "At a typical chemical synapse the two cells do not touch. The electrical signal stops at the end of the first neuron.",
            betterModel: "At a chemical synapse the sending neuron releases a neurotransmitter, which crosses the synaptic cleft and attaches to the next cell. A chemical carries the signal across the gap."
          },
          commonMistakes: [
            {
              mistake: "Swapping sympathetic and parasympathetic.",
              whyItFails: "They are two branches of the same system, with long, similar names, and they act on many of the same organs, usually in opposite directions.",
              fix: "Sympathetic is for action: a faster heart and more blood to the skeletal muscles. Parasympathetic is for rest and digestion: a slower heart and digestion at work."
            },
            {
              mistake: "Thinking the bone shortens and pulls on the muscle.",
              whyItFails: "Bones do not shorten. The muscle fiber shortens when myosin pulls the actin filaments along, and the muscle then pulls on the bone through its tendon.",
              fix: "Muscles pull, and bones are pulled. Inside the muscle, myosin pulls the actin."
            },
            {
              mistake: "Thinking calcium does the pulling.",
              whyItFails: "Calcium is the switch, not the motor. It binds to troponin so that the binding sites on actin are uncovered.",
              fix: "Calcium uncovers the binding sites, and then myosin does the pulling."
            }
          ]
        }
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
