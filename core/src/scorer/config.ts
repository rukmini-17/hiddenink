// "Is this text aimed at an AI?" signals and weights, all in one place so they're easy to tune
// and explain. Each signal fires at most once; weights combine as a noisy-OR:
//   score = 1 − Π(1 − weight)   (so it stays in 0–1 and every extra signal adds less)

export type Signal = {
  id: string;
  weight: number;
  pattern: RegExp;
  reason: string; // shown to the user, so keep it plain
};

// Verbs that start an instruction to an AI ("Rank…", "Tell…", "Ignore…").
const IMPERATIVE_VERBS =
  "ignore|disregard|forget|rank|rate|score|tell|say|respond|reply|answer|output|print|include|recommend|" +
  "summari[sz]e|state|mention|write|send|visit|click|pay|verify|give|add|describe|treat|consider|praise|" +
  "prioriti[sz]e|select|choose|approve|hire|shortlist|pretend|act";

export const SIGNALS: Signal[] = [
  {
    id: "override",
    weight: 0.6,
    pattern:
      /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(previous|prior|above|earlier|preceding|all|any|your|other)\b.{0,40}\b(instructions?|prompts?|rules|directions|context|guidelines|messages?)\b/i,
    reason: "tries to override the AI's instructions",
  },
  {
    id: "secrecy",
    weight: 0.4,
    pattern:
      /\b(do not|don't|never)\s+(mention|tell|reveal|disclose|inform|alert|warn|say)\b|\bwithout (telling|mentioning|informing)\b|\bkeep (this|it) (secret|hidden|between us)\b/i,
    reason: "asks the AI to hide something from you",
  },
  {
    id: "role_hijack",
    weight: 0.4,
    pattern: /\b(you are now|new instructions|system prompt|system message|from now on,? you|act as an?|developer mode)\b/i,
    reason: "tries to change who the AI thinks it is or what rules it follows",
  },
  {
    id: "ai_with_instruction",
    weight: 0.35,
    pattern: new RegExp(
      String.raw`(\b(AI|A\.I\.|LLM|GPT|ChatGPT|Gemini|Claude|Copilot)\b|\b(assistant|chatbot|language model|model|reviewers?|screeners?|agent)s?\b)` +
        String.raw`.{0,60}(\b(must|should|shall|need to|have to|are to|always|only|please)\b|[:,]\s*(do not|don't|never|${IMPERATIVE_VERBS})\b)` +
        // "Note to the AI: …", "Instructions for LLMs …"
        String.raw`|\b(note|message|instructions?) (to|for) (the |any |all )?(AI|LLM|assistant|model|chatbot|agent)s?\b`,
      "i",
    ),
    reason: "speaks directly to an AI and tells it what to do",
  },
  {
    id: "the_user",
    weight: 0.35,
    pattern: /\b(tell|inform|remind|warn|convince|ask|persuade)\s+the\s+(user|reader|human|recruiter|customer)\b|\bthe user\b/i,
    reason: "talks about \"the user\" as someone else, the way instructions to an AI do",
  },
  {
    // "Rank this candidate first", "rate this paper as the best". Needs a target AND a push to the top,
    // so a normal "Rate this product" widget doesn't fire.
    id: "ranking_target",
    weight: 0.55,
    pattern:
      /\b(rank|rate|score|recommend|select|choose|hire|shortlist|prioriti[sz]e|approve|list|place)\b.{0,30}\b(this|the|my|our)\s+(candidate|applicant|resume|résumé|cv|product|paper|submission|seller|profile|listing|application|company)\b.{0,30}\b(first|top|highest|#1|number one|above|best|strongest|most qualified|strongly|5 stars?|10\/10)\b/i,
    reason: "tries to manipulate a ranking or decision",
  },
  {
    // Weaker: a decision verb aimed at a person being evaluated ("hire this candidate").
    id: "decision_target",
    weight: 0.3,
    pattern:
      /\b(rank|rate|score|recommend|select|choose|hire|shortlist|prioriti[sz]e|approve|advance)\b.{0,20}\b(this|the)\s+(candidate|applicant|resume|résumé|cv)\b/i,
    reason: "tells the reader how to decide about this candidate",
  },
  {
    id: "ranking_words",
    weight: 0.25,
    pattern:
      /\b(rank|rate|score|place|list)\b.{0,30}\b(first|top|highest|#1|number one|10\/10|5 stars?|above (all|other|everyone))\b|\b(perfect|ideal|strongest) (fit|match|candidate)\b/i,
    reason: "pushes for a top rating",
  },
  {
    id: "positive_review",
    weight: 0.5,
    pattern: /\b(positive|favou?rable|glowing|good)\s+(review|assessment|evaluation|summary|feedback|rating)s?\b(.{0,20}\bonly\b)?|\bonly\s+(positive|favou?rable)\b/i,
    reason: "asks for only positive feedback",
  },
  {
    id: "imperative",
    weight: 0.15,
    pattern: new RegExp(
      String.raw`(^|[.!?:;]\s*|\n\s*)(please\s+)?(${IMPERATIVE_VERBS})\b|\b(you must|you should|you will|you are to|make sure|be sure to)\b`,
      "i",
    ),
    reason: "is phrased as an instruction",
  },
  {
    id: "money_urgency",
    weight: 0.15,
    pattern: /\b(fees?|pay(ment)?|wire|deposit|urgent(ly)?|immediately|verify|password|gift cards?|bitcoin|crypto)\b|\$\s?\d/i,
    reason: "mentions money, payment or urgency",
  },
  {
    id: "link",
    weight: 0.1,
    pattern: /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|net|org|io|test|xyz|info)\b/i,
    reason: "contains a link",
  },
];

/** Long hidden text is a little more suspicious than a few words. */
export const LENGTH_SIGNAL = { minChars: 120, weight: 0.05, reason: "is a long block of hidden text" };

/** Default aiScore at or above which a finding is flagged. */
export const DEFAULT_THRESHOLD = 0.5;
