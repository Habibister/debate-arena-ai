/**
 * Central debate-AI service.
 *
 * This is the single entry point routes should use for live debate AI. All prompt construction lives
 * in `lib/ai.ts` (which logs "Using OpenAI <label>" vs "Using fallback <label> because: <reason>" and
 * only falls back when OpenAI is missing, invalid, or errors). Routes must NOT build their own prompts.
 *
 * - generateOpponentSpeech: a sharp, human-sounding opposition speech responsive to the latest student speech.
 * - generateJudgeDecision: full-rubric ballot (12 scoring dimensions + compact summary + breakdown fields).
 * - generateModelRewrite: turn a student's weak line into a stronger claim-warrant-impact sentence.
 *
 * Each uses live OpenAI when a usable OPENAI_API_KEY is present and the call succeeds; otherwise the
 * local fallback runs (development only) and tags the result with a fallbackNotice for the UI banner.
 */
export {
  generateOpponentResponse as generateOpponentSpeech,
  judgeDebate as generateJudgeDecision,
  judgeDecaRoleplay,
  judgeHosaPerformance,
  generateModelRewrite
} from "@/lib/ai";
