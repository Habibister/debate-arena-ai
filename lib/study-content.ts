export type StudyOrganization = "DECA" | "HOSA" | "DEBATE";

export type Flashcard = {
  id: string;
  organization: Exclude<StudyOrganization, "DEBATE">;
  deck: string;
  deckSlug: string;
  term: string;
  definition: string;
  beginnerExplanation: string;
  example: string;
  commonMistake: string;
  quickCheck: string;
  quickCheckAnswer: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  tags: string[];
  relatedSkills: string[];
};

export type ResourceVideo = {
  id: string;
  title: string;
  topic: string;
  sourceName: string;
  estimatedDuration: string;
  url: string;
  organization: StudyOrganization | "GENERAL";
  skillTags: string[];
  followUp: "flashcards" | "quick quiz" | "writing practice" | "explain it back" | "mastery check";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const decaTerms: Record<string, string[]> = {
  Marketing: [
    "target market",
    "customer segment",
    "value proposition",
    "brand positioning",
    "promotion mix",
    "conversion rate",
    "customer journey",
    "market research",
    "competitive advantage",
    "product differentiation",
    "customer retention",
    "loyalty program",
    "channel strategy",
    "market share",
    "call to action"
  ],
  "Business Management": [
    "operations plan",
    "key performance indicator",
    "employee onboarding",
    "workflow",
    "organizational culture",
    "change management",
    "stakeholder",
    "process improvement",
    "quality control",
    "customer service standard",
    "delegation",
    "risk mitigation",
    "training plan",
    "resource allocation",
    "performance review"
  ],
  Finance: [
    "cash flow",
    "gross margin",
    "net income",
    "budget variance",
    "credit utilization",
    "interest rate",
    "liquidity",
    "break-even point",
    "return on investment",
    "risk tolerance",
    "collateral",
    "debt-to-income ratio",
    "compound interest",
    "financial statement",
    "opportunity cost"
  ],
  "Hospitality and Tourism": [
    "guest experience",
    "service recovery",
    "occupancy rate",
    "average daily rate",
    "front-of-house",
    "event logistics",
    "revenue management",
    "reservation system",
    "customer satisfaction",
    "brand standard",
    "concierge",
    "upselling",
    "destination marketing",
    "tourism demand",
    "hospitality operations"
  ],
  Entrepreneurship: [
    "minimum viable product",
    "customer discovery",
    "business model",
    "startup cost",
    "pitch",
    "market validation",
    "revenue stream",
    "scalability",
    "prototype",
    "customer acquisition cost",
    "early adopter",
    "unit economics",
    "founder-market fit",
    "problem-solution fit",
    "lean experiment"
  ],
  "Sports and Entertainment Marketing": [
    "sponsorship activation",
    "fan engagement",
    "ticket bundle",
    "merchandise revenue",
    "event promotion",
    "audience segment",
    "brand partnership",
    "in-game experience",
    "impressions",
    "media rights",
    "community outreach",
    "venue operations",
    "promotional calendar",
    "season ticket holder",
    "experience economy"
  ],
  "Personal Financial Literacy": [
    "emergency fund",
    "credit score",
    "deductible",
    "checking account",
    "savings goal",
    "automatic transfer",
    "simple interest",
    "compound interest",
    "needs vs wants",
    "insurance premium",
    "net pay",
    "spending plan",
    "identity theft",
    "secured credit card",
    "financial goal"
  ],
  "Economics basics": [
    "scarcity",
    "supply",
    "demand",
    "equilibrium price",
    "opportunity cost",
    "incentive",
    "competition",
    "consumer surplus",
    "producer surplus",
    "economic utility"
  ],
  Promotion: [
    "advertising objective",
    "public relations",
    "sales promotion",
    "earned media",
    "paid media",
    "owned media",
    "message consistency",
    "promotion calendar",
    "brand awareness",
    "campaign reach"
  ],
  Pricing: [
    "price elasticity",
    "cost-plus pricing",
    "value-based pricing",
    "penetration pricing",
    "premium pricing",
    "break-even price",
    "discount strategy",
    "price sensitivity",
    "margin protection",
    "competitive pricing"
  ],
  Distribution: [
    "supply chain",
    "channel partner",
    "inventory turnover",
    "last-mile delivery",
    "wholesaler",
    "retailer",
    "direct distribution",
    "logistics cost",
    "fulfillment",
    "stockout"
  ],
  "Market research": [
    "survey bias",
    "sample size",
    "focus group",
    "primary research",
    "secondary research",
    "customer insight",
    "data validity",
    "research objective",
    "trend analysis",
    "competitive scan"
  ],
  "Customer relations": [
    "customer lifetime value",
    "service recovery",
    "complaint resolution",
    "customer satisfaction",
    "net promoter score",
    "relationship marketing",
    "customer touchpoint",
    "loyalty driver",
    "retention tactic",
    "customer expectation"
  ],
  Operations: [
    "standard operating procedure",
    "capacity planning",
    "bottleneck",
    "quality assurance",
    "process map",
    "cycle time",
    "resource constraint",
    "vendor reliability",
    "continuous improvement",
    "operational risk"
  ],
  "Financial analysis": [
    "profit margin",
    "cash conversion cycle",
    "liability",
    "asset",
    "working capital",
    "variance analysis",
    "forecast",
    "fixed cost",
    "variable cost",
    "solvency"
  ],
  "Business law basics": [
    "contract",
    "liability",
    "warranty",
    "intellectual property",
    "employment law",
    "consumer protection",
    "disclosure",
    "compliance",
    "negligence",
    "terms of service"
  ],
  Ethics: [
    "conflict of interest",
    "transparency",
    "fair dealing",
    "privacy",
    "stakeholder trust",
    "ethical sourcing",
    "truthful advertising",
    "data responsibility",
    "professional integrity",
    "accountability"
  ],
  "Human resources": [
    "recruitment",
    "onboarding",
    "employee engagement",
    "performance feedback",
    "workplace policy",
    "training needs",
    "retention",
    "workplace culture",
    "conflict resolution",
    "compensation"
  ]
};

const hosaTerms: Record<string, string[]> = {
  "Medical Terminology": [
    "tachycardia",
    "bradycardia",
    "hypertension",
    "hypoglycemia",
    "hyperthermia",
    "dermatology",
    "neurology",
    "cardiology",
    "hematology",
    "gastroenterology",
    "respiration",
    "triage",
    "contraindication",
    "prognosis",
    "asepsis"
  ],
  "Health Science Concepts": [
    "homeostasis",
    "pathogen",
    "infection control",
    "vital signs",
    "nutrition",
    "hydration",
    "immunity",
    "inflammation",
    "metabolism",
    "body system",
    "prevention",
    "screening",
    "health literacy",
    "risk factor",
    "wellness"
  ],
  "Anatomy and Physiology": [
    "circulatory system",
    "respiratory system",
    "skeletal system",
    "muscular system",
    "nervous system",
    "digestive system",
    "renal system",
    "endocrine system",
    "joint",
    "alveoli",
    "neuron",
    "artery",
    "vein",
    "ligament",
    "tendon"
  ],
  "Patient Communication": [
    "active listening",
    "teach-back",
    "plain language",
    "empathy",
    "open-ended question",
    "nonverbal cue",
    "confidentiality",
    "rapport",
    "patient education",
    "informed question",
    "cultural humility",
    "clarifying question",
    "emotional validation",
    "health instruction",
    "communication barrier"
  ],
  "Healthcare Ethics": [
    "confidentiality",
    "informed consent",
    "scope of practice",
    "professional boundary",
    "patient autonomy",
    "beneficence",
    "nonmaleficence",
    "justice",
    "privacy",
    "mandatory reporting",
    "conflict of interest",
    "documentation",
    "ethical dilemma",
    "respect",
    "accountability"
  ],
  "Public Health": [
    "population health",
    "epidemiology",
    "prevention",
    "risk communication",
    "vaccination",
    "community resource",
    "health campaign",
    "incidence",
    "prevalence",
    "social determinant",
    "outbreak",
    "screening program",
    "health equity",
    "surveillance",
    "credible source"
  ],
  "Clinical Skills": [
    "hand hygiene",
    "standard precautions",
    "patient identification",
    "pulse",
    "respiratory rate",
    "temperature",
    "blood pressure",
    "personal protective equipment",
    "sterile field",
    "measurement accuracy",
    "room preparation",
    "documentation",
    "safety checklist",
    "equipment cleaning",
    "reporting abnormal findings"
  ],
  "Body Systems": [
    "cardiovascular system",
    "respiratory system",
    "integumentary system",
    "endocrine system",
    "lymphatic system",
    "urinary system",
    "reproductive system",
    "immune response",
    "homeostatic balance",
    "organ system interaction"
  ],
  "Infection Control": [
    "chain of infection",
    "hand hygiene",
    "standard precautions",
    "transmission-based precautions",
    "personal protective equipment",
    "disinfection",
    "sterilization",
    "pathogen reservoir",
    "exposure control",
    "isolation protocol"
  ],
  "Vital Signs": [
    "pulse",
    "respiration",
    "blood pressure",
    "temperature",
    "oxygen saturation",
    "pain scale",
    "normal range",
    "baseline",
    "abnormal finding",
    "measurement technique"
  ],
  "Medical Abbreviations": [
    "BP",
    "HR",
    "RR",
    "PRN",
    "NPO",
    "BID",
    "TID",
    "STAT",
    "SOB",
    "ROM"
  ],
  "Emergency Care Basics": [
    "scene safety",
    "primary assessment",
    "airway",
    "breathing",
    "circulation",
    "bleeding control",
    "shock",
    "activation of EMS",
    "triage priority",
    "recovery position"
  ],
  Nutrition: [
    "macronutrient",
    "micronutrient",
    "hydration",
    "calorie",
    "balanced diet",
    "fiber",
    "protein",
    "electrolyte",
    "portion size",
    "dietary restriction"
  ],
  "Epidemiology Basics": [
    "incidence",
    "prevalence",
    "risk factor",
    "outbreak",
    "surveillance",
    "case definition",
    "transmission rate",
    "prevention strategy",
    "population sample",
    "public health data"
  ],
  "Healthcare Careers": [
    "scope of practice",
    "licensed professional",
    "medical assistant",
    "nurse",
    "physician",
    "pharmacist",
    "physical therapist",
    "public health worker",
    "interprofessional team",
    "professional credential"
  ],
  "Safety Procedures": [
    "patient identification",
    "fall prevention",
    "hazard communication",
    "sharps safety",
    "fire safety",
    "body mechanics",
    "incident report",
    "emergency exit",
    "equipment check",
    "safe transfer"
  ]
};

// A real, plain-language glossary so every flashcard starts with an actual definition (not
// "Applying X means..."). `def` is one clear sentence with no scenario language; `plain` explains it
// for a beginner. Medical entries stay descriptive and within a student's scope (no treatment advice).
type GlossaryEntry = { def: string; plain: string; mistake?: string };

const GLOSSARY: Record<string, GlossaryEntry> = {
  // DECA — Marketing
  "target market": { def: "The specific group of customers a business wants to reach.", plain: "A business does not sell to everyone the same way; it focuses on the people most likely to want the product." },
  "customer segment": { def: "A smaller group of customers who share similar needs or traits.", plain: "Businesses split a big audience into groups so they can speak to each one better." },
  "value proposition": { def: "The clear reason a customer should choose your product over others.", plain: "In one line, it says what you offer and why it is worth it." },
  "brand positioning": { def: "How a brand wants customers to see it compared to competitors.", plain: "It is the spot a brand tries to own in your mind, like 'cheapest' or 'most reliable'." },
  "promotion mix": { def: "The combination of methods a business uses to promote a product.", plain: "It blends things like ads, sales, social posts, and public relations." },
  "conversion rate": { def: "The percentage of people who take a desired action, such as buying.", plain: "If 100 people visit and 5 buy, the conversion rate is 5%." },
  "customer journey": { def: "The full path a customer takes from first learning about a product to buying and beyond.", plain: "It maps every step, not just the moment of sale." },
  "market research": { def: "Gathering information about customers, competitors, and the market.", plain: "It is how a business learns what people want before deciding." },
  "competitive advantage": { def: "Something a business does better than its competitors.", plain: "It is the edge that makes customers pick you instead of someone else." },
  "product differentiation": { def: "Making a product clearly different from similar products.", plain: "It is what makes your product stand out on the shelf." },
  "customer retention": { def: "Keeping existing customers so they buy again.", plain: "It is usually cheaper to keep a customer than to find a new one." },
  "loyalty program": { def: "A reward system that encourages repeat purchases.", plain: "Points, perks, or discounts that bring customers back." },
  "channel strategy": { def: "The plan for how products reach customers.", plain: "It decides where and how people can buy, like online or in stores." },
  "market share": { def: "The portion of total sales in a market that one business holds.", plain: "Sell 100 of a market's 1,000 units and your market share is 10%." },
  "call to action": { def: "A clear instruction telling the customer what to do next.", plain: "Phrases like 'Buy now' or 'Sign up today'." },
  // DECA — Business Management
  "operations plan": { def: "A plan for how a business will run its day-to-day work.", plain: "It lays out the steps, people, and resources needed to deliver." },
  "key performance indicator": { def: "A measurable value that shows how well a goal is being met.", plain: "A KPI is the number you watch to know if you are succeeding, like sales per week." },
  "employee onboarding": { def: "The process of welcoming and training new employees.", plain: "It helps a new hire learn the job and the workplace." },
  workflow: { def: "The sequence of steps used to complete a task.", plain: "It is the order work moves through, from start to finish." },
  "organizational culture": { def: "The shared values and behaviors of the people in a company.", plain: "It is 'how things are done here'." },
  "change management": { def: "Guiding people and processes through a change.", plain: "It helps a team adjust smoothly when something new is introduced." },
  stakeholder: { def: "Anyone affected by or interested in a business decision.", plain: "Customers, employees, owners, and the community can all be stakeholders." },
  "process improvement": { def: "Making a work process faster, cheaper, or higher quality.", plain: "It is fixing the steps so the job goes better." },
  "quality control": { def: "Checking products or services to make sure they meet a standard.", plain: "It catches problems before customers do." },
  "customer service standard": { def: "A set rule for how customers should be treated.", plain: "It defines what good service looks like, so it is consistent." },
  delegation: { def: "Assigning a task or authority to someone else.", plain: "A manager hands work to the right person instead of doing it all." },
  "risk mitigation": { def: "Reducing the chance or impact of something going wrong.", plain: "It is planning ahead so problems hurt less." },
  "training plan": { def: "A schedule for teaching employees needed skills.", plain: "It says who learns what, and when." },
  "resource allocation": { def: "Deciding how to use limited money, people, or time.", plain: "It is choosing where your resources go." },
  "performance review": { def: "A regular evaluation of an employee's work.", plain: "It gives feedback on what went well and what to improve." },
  // DECA — Finance
  "cash flow": { def: "The money moving into and out of a business.", plain: "Even a profitable business can fail if more cash leaves than comes in." },
  "gross margin": { def: "Sales revenue minus the direct cost of the product, shown as a percentage.", plain: "It shows how much of each sale is left after making the product." },
  "net income": { def: "What a business keeps after all costs and taxes are paid.", plain: "It is the bottom-line profit." },
  "budget variance": { def: "The difference between planned and actual amounts.", plain: "It shows whether you spent more or less than expected." },
  "credit utilization": { def: "The share of available credit a person is using.", plain: "Using a small part of your credit limit is better for your score." },
  "interest rate": { def: "The cost of borrowing money, shown as a percentage.", plain: "It is what a lender charges, or a saver earns, over time." },
  liquidity: { def: "How easily an asset can be turned into cash.", plain: "Cash is very liquid; a building is not." },
  "break-even point": { def: "The sales level where total revenue equals total cost.", plain: "Below it you lose money; above it you start to profit." },
  "return on investment": { def: "The gain from an investment compared to its cost.", plain: "ROI tells you whether spending the money paid off." },
  "risk tolerance": { def: "How much risk a person or business is willing to accept.", plain: "It guides how cautious or bold your choices should be." },
  collateral: { def: "An asset a borrower pledges to secure a loan.", plain: "If the loan is not repaid, the lender can take the collateral." },
  "debt-to-income ratio": { def: "Monthly debt payments divided by monthly income.", plain: "It shows how much of your income already goes to debt." },
  "compound interest": { def: "Interest earned on both the original amount and past interest.", plain: "Your money grows faster because interest earns more interest." },
  "financial statement": { def: "A formal report of a business's financial results.", plain: "Examples include the income statement and balance sheet." },
  "opportunity cost": { def: "The value of the next-best option you give up when you choose.", plain: "Picking one thing means missing what you could have done instead." },
  // DECA — Hospitality and Tourism
  "guest experience": { def: "The overall impression a guest forms during their visit.", plain: "It is every interaction added up, not just one moment." },
  "service recovery": { def: "Fixing a problem after a customer has a bad experience.", plain: "A good apology and quick fix can keep the customer." },
  "occupancy rate": { def: "The percentage of available rooms that are filled.", plain: "It shows how full a hotel is." },
  "average daily rate": { def: "The average price paid per occupied room per night.", plain: "ADR shows what guests pay on a typical night." },
  "front-of-house": { def: "The staff and areas guests interact with directly.", plain: "Think check-in desks and servers, not the kitchen." },
  "event logistics": { def: "The planning and coordination of an event's details.", plain: "It covers setup, timing, staffing, and supplies." },
  "revenue management": { def: "Setting prices and availability to maximize income.", plain: "Prices change based on demand to earn the most." },
  "reservation system": { def: "The tool used to book and track customer reservations.", plain: "It keeps bookings organized and avoids double-booking." },
  "customer satisfaction": { def: "How happy a customer is with a product or service.", plain: "It measures whether you met or beat expectations." },
  "brand standard": { def: "A consistent rule a brand follows everywhere.", plain: "It keeps the experience the same at every location." },
  concierge: { def: "A staff member who helps guests with requests and recommendations.", plain: "They arrange things like tickets, dining, and directions." },
  upselling: { def: "Encouraging a customer to buy a higher-value option.", plain: "Suggesting a room upgrade is upselling." },
  "destination marketing": { def: "Promoting a place to attract visitors.", plain: "It sells a city or region as a place to visit." },
  "tourism demand": { def: "How many people want to travel to a place.", plain: "It rises and falls with seasons, prices, and events." },
  "hospitality operations": { def: "The daily running of a hospitality business.", plain: "It covers the work that keeps service flowing." },
  // DECA — Entrepreneurship
  "minimum viable product": { def: "The simplest version of a product that can be tested with real users.", plain: "An MVP lets you learn quickly without building everything first." },
  "customer discovery": { def: "Talking to potential customers to learn their real needs.", plain: "It tests your idea before you build it." },
  "business model": { def: "How a business creates, delivers, and earns value.", plain: "It explains who pays, for what, and how you make money." },
  "startup cost": { def: "The money needed to launch a business.", plain: "It is what you spend before earning your first dollar." },
  pitch: { def: "A short, persuasive presentation of a business idea.", plain: "It quickly explains the idea and why it matters." },
  "market validation": { def: "Evidence that real customers want your product.", plain: "It is proof, like sales or sign-ups, that demand exists." },
  "revenue stream": { def: "A source of income for a business.", plain: "A business can have several, like sales plus subscriptions." },
  scalability: { def: "How well a business can grow without costs rising just as fast.", plain: "A scalable business can serve many more customers without doubling effort." },
  prototype: { def: "An early model of a product used for testing.", plain: "It lets you try the idea before mass production." },
  "customer acquisition cost": { def: "The average cost to gain one new customer.", plain: "CAC is your marketing and sales spend divided by new customers." },
  "early adopter": { def: "A customer who tries a new product before most people.", plain: "They give early feedback and help spread the word." },
  "unit economics": { def: "The profit or loss from a single product or customer.", plain: "It checks whether each sale actually makes money." },
  "founder-market fit": { def: "How well a founder's skills match the market they chose.", plain: "It asks whether you are the right person to solve this problem." },
  "problem-solution fit": { def: "Evidence that your solution actually solves a real problem.", plain: "It confirms the problem is real and your fix works." },
  "lean experiment": { def: "A small, fast test of a business assumption.", plain: "You test cheaply before betting big." },
  // DECA — Sports and Entertainment Marketing
  "sponsorship activation": { def: "Turning a sponsorship into real fan engagement.", plain: "It is what a sponsor actually does to be noticed, not just putting up a logo." },
  "fan engagement": { def: "How actively fans interact with a team or brand.", plain: "Likes, attendance, and participation all show engagement." },
  "ticket bundle": { def: "Several tickets or perks sold together as a package.", plain: "Bundling can raise value and sales." },
  "merchandise revenue": { def: "Income from selling branded goods.", plain: "Jerseys and hats are merchandise revenue." },
  "event promotion": { def: "Marketing used to drive attendance at an event.", plain: "It gets people to show up." },
  "audience segment": { def: "A defined group within a larger audience.", plain: "Teens and families may be different segments at one event." },
  "brand partnership": { def: "Two brands working together for mutual benefit.", plain: "Each brand reaches the other's audience." },
  "in-game experience": { def: "What fans see and do during a live event.", plain: "Music, screens, and contests shape it." },
  impressions: { def: "The number of times content is seen.", plain: "It counts views, even if no one clicks." },
  "media rights": { def: "The legal right to broadcast or stream an event.", plain: "Networks pay for the right to show games." },
  "community outreach": { def: "Activities that build goodwill with the local community.", plain: "It connects an organization to the people around it." },
  "venue operations": { def: "The work of running an event location.", plain: "It covers safety, staffing, and logistics on site." },
  "promotional calendar": { def: "A schedule of planned promotions over time.", plain: "It keeps marketing organized across the season." },
  "season ticket holder": { def: "A fan who buys tickets for a whole season.", plain: "They are loyal, repeat customers." },
  "experience economy": { def: "An economy where people pay for memorable experiences, not just goods.", plain: "Customers value what they feel and do, not only what they own." },
  // DECA — Personal Financial Literacy
  "emergency fund": { def: "Savings set aside for unexpected expenses.", plain: "It covers surprises like a car repair without borrowing." },
  "credit score": { def: "A number that rates how reliably a person repays debt.", plain: "A higher score makes borrowing cheaper and easier." },
  deductible: { def: "The amount you pay before insurance starts to pay.", plain: "A higher deductible usually means a lower monthly premium." },
  "checking account": { def: "A bank account for everyday spending.", plain: "You use it for daily purchases and bills." },
  "savings goal": { def: "A specific amount you plan to save by a date.", plain: "It gives your saving a clear target." },
  "automatic transfer": { def: "A scheduled move of money between accounts.", plain: "It saves for you without you remembering." },
  "simple interest": { def: "Interest calculated only on the original amount.", plain: "Unlike compound interest, it does not earn interest on interest." },
  "needs vs wants": { def: "The difference between things you must have and things you would like.", plain: "Rent is a need; a new game is a want." },
  "insurance premium": { def: "The regular payment you make to keep insurance.", plain: "It is the price of being covered." },
  "net pay": { def: "The money you take home after taxes and deductions.", plain: "It is your paycheck after subtractions, not the full salary." },
  "spending plan": { def: "A plan for how you will use your money.", plain: "A budget that matches spending to income and goals." },
  "identity theft": { def: "When someone uses your personal information without permission.", plain: "Thieves use your details to open accounts or steal money." },
  "secured credit card": { def: "A credit card backed by a cash deposit.", plain: "It helps people build credit with less risk to the lender." },
  "financial goal": { def: "A specific money target you want to reach.", plain: "Saving for college is a financial goal." },
  // DECA — Economics basics
  scarcity: { def: "Limited resources cannot meet unlimited wants.", plain: "Because there is not enough of everything, we must choose." },
  supply: { def: "The amount of a product sellers offer at each price.", plain: "Usually, higher prices lead sellers to offer more." },
  demand: { def: "The amount of a product buyers want at each price.", plain: "Usually, lower prices lead buyers to want more." },
  "equilibrium price": { def: "The price where supply equals demand.", plain: "It is where the amount offered matches the amount wanted." },
  incentive: { def: "Something that motivates a person to act.", plain: "Rewards and penalties both shape choices." },
  competition: { def: "Rivalry between sellers for customers.", plain: "It tends to lower prices and improve quality." },
  "consumer surplus": { def: "The difference between what buyers will pay and what they actually pay.", plain: "It is the bonus value buyers get from a good deal." },
  "producer surplus": { def: "The difference between the price sellers get and the least they would accept.", plain: "It is the extra benefit sellers get from a sale." },
  "economic utility": { def: "The satisfaction or usefulness a product provides.", plain: "It is how much value a good gives a customer." },
  // DECA — Promotion
  "advertising objective": { def: "The specific goal of an advertising effort.", plain: "It states what the ad should achieve, like more sign-ups." },
  "public relations": { def: "Managing how the public sees an organization.", plain: "PR shapes reputation through news, events, and messaging." },
  "sales promotion": { def: "A short-term offer that boosts sales.", plain: "Coupons and limited-time deals are sales promotions." },
  "earned media": { def: "Publicity you get for free, like news coverage or shares.", plain: "You earn it through good work, not by paying for it." },
  "paid media": { def: "Promotion you pay for, like ads.", plain: "You buy the space or placement." },
  "owned media": { def: "Channels a business controls, like its website or social accounts.", plain: "You own and run these yourself." },
  "message consistency": { def: "Keeping the same core message across channels.", plain: "It avoids confusing customers with mixed signals." },
  "brand awareness": { def: "How well customers recognize and recall a brand.", plain: "It is whether people know you exist." },
  "campaign reach": { def: "The number of unique people who see a campaign.", plain: "Reach counts people, not repeat views." },
  "promotion calendar": { def: "A schedule of planned promotions over time.", plain: "It keeps marketing organized so offers do not overlap or clash." },
  // DECA — Pricing
  "price elasticity": { def: "How much demand changes when price changes.", plain: "If a small price rise loses many buyers, demand is elastic." },
  "cost-plus pricing": { def: "Setting price by adding a markup to cost.", plain: "You take what it costs and add a set profit." },
  "value-based pricing": { def: "Setting price based on the value customers see.", plain: "You charge what it is worth to the buyer, not just cost." },
  "penetration pricing": { def: "Setting a low starting price to win market share.", plain: "You price low to attract buyers fast, then may raise it." },
  "premium pricing": { def: "Setting a high price to signal quality.", plain: "A high price can make a product feel exclusive." },
  "break-even price": { def: "The price at which revenue covers all costs.", plain: "Sell at this price and you neither gain nor lose." },
  "discount strategy": { def: "A plan for when and how to reduce prices.", plain: "It decides which discounts protect profit and which hurt it." },
  "price sensitivity": { def: "How strongly buyers react to price changes.", plain: "Sensitive buyers leave quickly when prices rise." },
  "margin protection": { def: "Keeping enough profit on each sale.", plain: "It avoids discounting so much that you lose money." },
  "competitive pricing": { def: "Setting prices based on what rivals charge.", plain: "You price in line with competitors to stay attractive." },
  // DECA — Distribution
  "supply chain": { def: "The full network that makes and delivers a product.", plain: "It runs from raw materials to the customer's hands." },
  "channel partner": { def: "A company that helps sell or deliver your product.", plain: "Retailers and distributors are channel partners." },
  "inventory turnover": { def: "How often inventory is sold and replaced in a period.", plain: "High turnover means products sell quickly." },
  "last-mile delivery": { def: "The final step of getting a product to the customer.", plain: "It is the trip from the local hub to the doorstep." },
  wholesaler: { def: "A business that buys in bulk and sells to retailers.", plain: "They sit between makers and stores." },
  retailer: { def: "A business that sells products directly to consumers.", plain: "Stores and online shops are retailers." },
  "direct distribution": { def: "Selling straight to customers with no middlemen.", plain: "The maker sells directly, like a brand's own website." },
  "logistics cost": { def: "The cost of moving and storing goods.", plain: "Shipping and warehousing are logistics costs." },
  fulfillment: { def: "The process of preparing and shipping an order.", plain: "It is picking, packing, and sending what a customer bought." },
  stockout: { def: "When an item is out of stock.", plain: "A stockout means you cannot sell what customers want." },
  // DECA — Market research
  "survey bias": { def: "An error that skews survey results away from the truth.", plain: "Leading questions can push people toward an answer." },
  "sample size": { def: "The number of people included in research.", plain: "Too few people makes results unreliable." },
  "focus group": { def: "A small, guided discussion used to gather opinions.", plain: "A moderator asks a group about a product or idea." },
  "primary research": { def: "Original data you collect yourself.", plain: "Surveys and interviews you run are primary research." },
  "secondary research": { def: "Existing data collected by someone else.", plain: "Reports and articles you look up are secondary research." },
  "customer insight": { def: "A useful understanding of customer needs or behavior.", plain: "It is a finding you can act on." },
  "data validity": { def: "Whether data actually measures what it claims to.", plain: "Valid data answers the real question." },
  "research objective": { def: "The specific question research aims to answer.", plain: "It keeps research focused on what you need to know." },
  "trend analysis": { def: "Studying data over time to spot patterns.", plain: "It shows whether something is rising or falling." },
  "competitive scan": { def: "A review of what competitors are doing.", plain: "It checks rivals' prices, products, and messaging." },
  // DECA — Customer relations
  "customer lifetime value": { def: "The total profit expected from a customer over time.", plain: "CLV shows what a long-term customer is really worth." },
  "complaint resolution": { def: "Solving a customer's problem to their satisfaction.", plain: "It turns an unhappy customer back into a happy one." },
  "net promoter score": { def: "A measure of how likely customers are to recommend you.", plain: "NPS asks 'would you recommend us?' on a 0–10 scale." },
  "relationship marketing": { def: "Building long-term customer relationships, not just single sales.", plain: "It focuses on loyalty over time." },
  "customer touchpoint": { def: "Any moment a customer interacts with a brand.", plain: "Ads, the website, and support calls are all touchpoints." },
  "loyalty driver": { def: "A factor that makes customers stay loyal.", plain: "Great service or rewards can drive loyalty." },
  "retention tactic": { def: "A specific action used to keep customers.", plain: "Follow-up emails or perks are retention tactics." },
  "customer expectation": { def: "What a customer believes they will receive.", plain: "Meeting it builds trust; missing it loses it." },
  // DECA — Operations
  "standard operating procedure": { def: "A written, step-by-step way to do a task consistently.", plain: "An SOP keeps everyone doing the job the same correct way." },
  "capacity planning": { def: "Making sure you have enough resources to meet demand.", plain: "It avoids being overwhelmed or wasting resources." },
  bottleneck: { def: "The step that slows down a whole process.", plain: "It is the narrowest point that limits everything else." },
  "quality assurance": { def: "Preventing defects by improving the process itself.", plain: "QA stops problems before they happen, not just after." },
  "process map": { def: "A diagram of the steps in a process.", plain: "It shows how work flows so you can improve it." },
  "cycle time": { def: "The time to complete one full process from start to finish.", plain: "Shorter cycle time usually means faster service." },
  "resource constraint": { def: "A limit on the money, people, or time available.", plain: "It is what you do not have enough of." },
  "vendor reliability": { def: "How dependable a supplier is.", plain: "A reliable vendor delivers on time and as promised." },
  "continuous improvement": { def: "Making steady, ongoing improvements over time.", plain: "Small fixes add up to big gains." },
  "operational risk": { def: "The chance of loss from failed processes or systems.", plain: "It is the risk that day-to-day operations go wrong." },
  // DECA — Financial analysis
  "profit margin": { def: "The percentage of revenue that is profit.", plain: "It shows how much you keep from each dollar of sales." },
  "cash conversion cycle": { def: "The time it takes to turn spending into cash from sales.", plain: "Shorter is better because cash comes back faster." },
  liability: { def: "Something a business owes, like a debt.", plain: "Loans and unpaid bills are liabilities." },
  asset: { def: "Something a business owns that has value.", plain: "Cash, equipment, and inventory are assets." },
  "working capital": { def: "Current assets minus current liabilities.", plain: "It shows whether you can cover short-term bills." },
  "variance analysis": { def: "Comparing actual results to the budget to explain differences.", plain: "It asks why you spent or earned more or less than planned." },
  forecast: { def: "An estimate of future results.", plain: "It predicts sales or costs to help you plan." },
  "fixed cost": { def: "A cost that stays the same no matter how much you produce.", plain: "Rent is a fixed cost; it does not change with sales." },
  "variable cost": { def: "A cost that changes with how much you produce.", plain: "Materials cost more as you make more." },
  solvency: { def: "A business's ability to pay its long-term debts.", plain: "A solvent business can cover what it owes over time." },
  // DECA — Business law basics
  contract: { def: "A legally binding agreement between parties.", plain: "It sets promises each side must keep." },
  warranty: { def: "A promise about the quality or repair of a product.", plain: "It says what the seller will fix or replace." },
  "intellectual property": { def: "Creations of the mind that the law protects.", plain: "Logos, inventions, and writing can be intellectual property." },
  "employment law": { def: "Rules governing the relationship between employers and workers.", plain: "It covers things like pay, safety, and fair treatment." },
  "consumer protection": { def: "Laws that guard buyers from unfair or unsafe practices.", plain: "They keep businesses honest with customers." },
  disclosure: { def: "Sharing important information honestly.", plain: "It means telling customers what they need to know." },
  compliance: { def: "Following the laws and rules that apply to a business.", plain: "It is staying within the rules to avoid penalties." },
  negligence: { def: "Failing to take reasonable care, causing harm.", plain: "It is carelessness that hurts someone." },
  "terms of service": { def: "The rules a user agrees to when using a product.", plain: "It is the agreement you accept to use an app or site." },
  // DECA — Ethics
  "conflict of interest": { def: "When personal interests could improperly influence a decision.", plain: "It is when what helps you might hurt the people you serve." },
  transparency: { def: "Being open and honest about actions and information.", plain: "It means not hiding things that matter." },
  "fair dealing": { def: "Treating customers and partners honestly and equally.", plain: "It is playing straight with everyone." },
  privacy: { def: "A person's right to control their personal information.", plain: "It means keeping someone's data safe and not sharing it without permission." },
  "stakeholder trust": { def: "The confidence stakeholders have in an organization.", plain: "It is earned by acting honestly over time." },
  "ethical sourcing": { def: "Buying materials in responsible, fair ways.", plain: "It avoids harm to workers or the environment." },
  "truthful advertising": { def: "Advertising that is honest and not misleading.", plain: "It does not promise what the product cannot do." },
  "data responsibility": { def: "Handling people's data carefully and lawfully.", plain: "It means protecting and respecting the data you collect." },
  "professional integrity": { def: "Doing the right thing in your work, even when it is hard.", plain: "It is honesty and strong ethics on the job." },
  accountability: { def: "Taking responsibility for your actions and results.", plain: "It means owning outcomes instead of blaming others." },
  // DECA — Human resources
  recruitment: { def: "Finding and attracting people to fill jobs.", plain: "It is how a company brings in candidates." },
  onboarding: { def: "Welcoming and preparing a new employee to start.", plain: "Good onboarding helps a new hire succeed faster." },
  "employee engagement": { def: "How committed and motivated employees feel.", plain: "Engaged workers care about their work and stay longer." },
  "performance feedback": { def: "Information given to help someone improve their work.", plain: "It is clear, specific input on what to keep or change." },
  "workplace policy": { def: "An official rule guiding behavior at work.", plain: "It tells everyone the expected way to act." },
  "training needs": { def: "The skills employees still need to learn.", plain: "Spotting them shows what training to provide." },
  retention: { def: "Keeping employees so they do not leave.", plain: "Good retention saves the cost of constant rehiring." },
  "workplace culture": { def: "The shared attitudes and behaviors at a company.", plain: "It is what it feels like to work there." },
  "conflict resolution": { def: "Settling disagreements fairly.", plain: "It helps people work out problems calmly." },
  compensation: { def: "The pay and benefits an employee receives.", plain: "It is salary plus things like insurance and bonuses." },
  // HOSA — Medical Terminology
  tachycardia: { def: "An abnormally fast heart rate.", plain: "It means the heart is beating faster than expected.", mistake: "Don't treat tachycardia as a diagnosis by itself. It is a sign that needs context." },
  bradycardia: { def: "An abnormally slow heart rate.", plain: "It means the heart is beating slower than expected." },
  hypertension: { def: "High blood pressure.", plain: "Blood pushes against artery walls with more force than is healthy." },
  hypoglycemia: { def: "Low blood sugar.", plain: "It means the level of glucose in the blood is below normal." },
  hyperthermia: { def: "An abnormally high body temperature.", plain: "The body is hotter than its normal range." },
  dermatology: { def: "The branch of medicine focused on the skin.", plain: "It is the study and care of skin, hair, and nails." },
  neurology: { def: "The branch of medicine focused on the nervous system.", plain: "It deals with the brain, spinal cord, and nerves." },
  cardiology: { def: "The branch of medicine focused on the heart.", plain: "It studies and cares for the heart and blood vessels." },
  hematology: { def: "The branch of medicine focused on blood.", plain: "It studies blood and blood-related conditions." },
  gastroenterology: { def: "The branch of medicine focused on the digestive system.", plain: "It deals with the stomach, intestines, and related organs." },
  respiration: { def: "The process of breathing — moving air in and out of the lungs.", plain: "It is how the body takes in oxygen and releases carbon dioxide." },
  triage: { def: "Sorting patients by how urgently they need care.", plain: "The most serious cases are seen first." },
  contraindication: { def: "A reason a treatment should not be used.", plain: "It is a condition that makes a normally helpful action unsafe." },
  prognosis: { def: "The likely course or outcome of a condition.", plain: "It is the expected outlook, not a guarantee." },
  asepsis: { def: "The absence of germs that cause infection.", plain: "It means keeping things clean to prevent infection." },
  // HOSA — Health Science Concepts
  homeostasis: { def: "The body's ability to keep a stable internal balance.", plain: "It is how the body holds steady, like keeping a normal temperature." },
  pathogen: { def: "A germ that can cause disease.", plain: "Bacteria and viruses are pathogens." },
  "infection control": { def: "Practices that prevent the spread of infection.", plain: "Steps like hand hygiene stop germs from spreading." },
  "vital signs": { def: "Basic body measurements that show how the body is working.", plain: "They include pulse, breathing, temperature, and blood pressure." },
  nutrition: { def: "How the body uses food for energy and health.", plain: "It is about getting the nutrients the body needs." },
  hydration: { def: "Having enough water in the body.", plain: "Good hydration keeps the body working properly." },
  immunity: { def: "The body's ability to resist a disease.", plain: "It is the defense that protects you from getting sick." },
  inflammation: { def: "The body's response to injury or infection, with redness, heat, or swelling.", plain: "It is a normal sign the body is reacting to a problem." },
  metabolism: { def: "All the chemical processes that keep the body alive.", plain: "It is how the body turns food into energy." },
  "body system": { def: "A group of organs that work together for a function.", plain: "The digestive system is one example." },
  prevention: { def: "Action taken to stop a problem before it starts.", plain: "Vaccines and handwashing are prevention." },
  screening: { def: "Checking for a condition before symptoms appear.", plain: "It catches problems early so they are easier to manage." },
  "health literacy": { def: "The ability to understand and use health information.", plain: "It helps people make good decisions about their care." },
  "risk factor": { def: "Something that raises the chance of a disease.", plain: "Smoking is a risk factor for many illnesses." },
  wellness: { def: "An active state of good overall health.", plain: "It is more than not being sick — it is feeling well in body and mind." },
  // HOSA — Anatomy and Physiology
  "circulatory system": { def: "The system that moves blood through the body.", plain: "The heart and blood vessels deliver oxygen and nutrients." },
  "respiratory system": { def: "The system that handles breathing.", plain: "The lungs take in oxygen and remove carbon dioxide." },
  "skeletal system": { def: "The bones that support and protect the body.", plain: "It is the body's framework." },
  "muscular system": { def: "The muscles that allow movement.", plain: "Muscles pull on bones to move the body." },
  "nervous system": { def: "The system that sends signals to control the body.", plain: "The brain, spinal cord, and nerves carry messages." },
  "digestive system": { def: "The system that breaks down food for the body to use.", plain: "It turns food into nutrients and removes waste." },
  "renal system": { def: "The system that filters blood and makes urine.", plain: "The kidneys remove waste and balance fluids." },
  "endocrine system": { def: "The system of glands that release hormones.", plain: "Hormones act as chemical messengers that control body functions." },
  joint: { def: "A place where two bones meet.", plain: "Joints like the knee let the body bend and move." },
  alveoli: { def: "Tiny air sacs in the lungs where gas exchange happens.", plain: "Oxygen and carbon dioxide are swapped here." },
  neuron: { def: "A nerve cell that carries signals.", plain: "Neurons send messages through the nervous system." },
  artery: { def: "A blood vessel that carries blood away from the heart.", plain: "Arteries usually carry oxygen-rich blood." },
  vein: { def: "A blood vessel that carries blood back to the heart.", plain: "Veins usually return blood that has given up its oxygen." },
  ligament: { def: "Tissue that connects bone to bone.", plain: "Ligaments hold joints together." },
  tendon: { def: "Tissue that connects muscle to bone.", plain: "Tendons let muscles move bones." },
  // HOSA — Patient Communication
  "active listening": { def: "Fully focusing on, understanding, and responding to a speaker.", plain: "You pay close attention and show you understood." },
  "teach-back": { def: "Asking a patient to repeat information in their own words.", plain: "It checks that they truly understood." },
  "plain language": { def: "Clear, simple wording anyone can understand.", plain: "It avoids jargon so the message is easy to follow." },
  empathy: { def: "Understanding and sharing another person's feelings.", plain: "It is showing you care about how someone feels." },
  "open-ended question": { def: "A question that invites a full answer, not just yes or no.", plain: "It encourages people to explain in their own words." },
  "nonverbal cue": { def: "A message sent without words, like body language.", plain: "Facial expressions and posture are nonverbal cues." },
  confidentiality: { def: "Keeping private information private.", plain: "It means not sharing someone's information without permission." },
  rapport: { def: "A friendly, trusting connection with someone.", plain: "Good rapport helps people feel comfortable." },
  "patient education": { def: "Teaching patients about their health in a way they understand.", plain: "It helps people care for themselves correctly." },
  "informed question": { def: "A thoughtful question based on understanding the situation.", plain: "It shows you have listened and want the right details." },
  "cultural humility": { def: "Respecting and learning about others' cultures and beliefs.", plain: "It means staying open instead of assuming." },
  "clarifying question": { def: "A question asked to make sure you understood correctly.", plain: "It double-checks the meaning before you act." },
  "emotional validation": { def: "Acknowledging that someone's feelings are real and understandable.", plain: "It is saying 'that makes sense' instead of dismissing them." },
  "health instruction": { def: "Clear directions that help someone manage their health.", plain: "Simple steps a patient can actually follow." },
  "communication barrier": { def: "Anything that makes understanding harder.", plain: "Language, noise, or jargon can be barriers." },
  // HOSA — Healthcare Ethics
  "informed consent": { def: "A patient's agreement to care after understanding it.", plain: "People must understand the choice before they say yes." },
  "scope of practice": { def: "The tasks a person is trained and allowed to do.", plain: "It is the limit of what your role permits." },
  "professional boundary": { def: "A healthy limit between a professional and a patient.", plain: "It keeps the relationship safe and appropriate." },
  "patient autonomy": { def: "A patient's right to make their own care decisions.", plain: "People get to choose what happens to their own body." },
  beneficence: { def: "Acting for the good of the patient.", plain: "It means doing what helps the patient." },
  nonmaleficence: { def: "Avoiding harm to the patient.", plain: "It means 'first, do no harm'." },
  justice: { def: "Treating people fairly and equally.", plain: "It means fair access and fair treatment for all." },
  "mandatory reporting": { def: "A legal duty to report certain harms, like abuse.", plain: "Some situations must be reported to authorities." },
  documentation: { def: "Recording information accurately and clearly.", plain: "Good records show what happened and when." },
  "ethical dilemma": { def: "A situation where values or duties conflict.", plain: "It is a hard choice with no perfectly right answer." },
  respect: { def: "Treating people with dignity and consideration.", plain: "It means valuing each person." },
  // HOSA — Public Health
  "population health": { def: "The health outcomes of a group of people.", plain: "It looks at whole communities, not just individuals." },
  epidemiology: { def: "The study of how disease spreads in populations.", plain: "It tracks who gets sick, where, and why." },
  "risk communication": { def: "Sharing health risk information clearly with the public.", plain: "It helps people understand a danger and what to do." },
  vaccination: { def: "Giving a vaccine to build immunity to a disease.", plain: "It trains the body to fight a germ before exposure." },
  "community resource": { def: "A local service that supports people's health or needs.", plain: "Clinics and food banks are community resources." },
  "health campaign": { def: "An organized effort to improve health behavior.", plain: "It promotes things like handwashing or check-ups." },
  incidence: { def: "The number of new cases of a disease in a period.", plain: "It counts new cases, not all existing ones." },
  prevalence: { def: "The total number of cases at a given time.", plain: "It counts everyone who has the condition right now." },
  "social determinant": { def: "A non-medical factor that affects health, like income or housing.", plain: "Life conditions shape health, not just medical care." },
  outbreak: { def: "A sudden rise in cases of a disease.", plain: "More people get sick than expected in an area." },
  "screening program": { def: "An organized effort to check many people for a condition.", plain: "It finds problems early across a population." },
  "health equity": { def: "Everyone having a fair chance to be healthy.", plain: "It means removing unfair gaps in health." },
  surveillance: { def: "Ongoing tracking of health data to spot problems.", plain: "It watches for trends so officials can respond." },
  "credible source": { def: "A trustworthy, reliable source of information.", plain: "It is information you can rely on, like a health agency." },
  // HOSA — Clinical Skills / Vital Signs
  "hand hygiene": { def: "Cleaning your hands to prevent the spread of germs.", plain: "Washing or sanitizing hands is the top way to stop infection." },
  "standard precautions": { def: "Basic infection-control steps used with every patient.", plain: "They protect both patient and worker, every time." },
  "patient identification": { def: "Confirming you have the correct patient.", plain: "Checking name and details prevents dangerous mix-ups." },
  pulse: { def: "The beat of the heart felt in an artery.", plain: "It tells you how fast the heart is beating." },
  "respiratory rate": { def: "The number of breaths taken per minute.", plain: "It measures how fast someone is breathing." },
  temperature: { def: "A measure of body heat.", plain: "It shows whether the body is warmer or cooler than normal." },
  "blood pressure": { def: "The force of blood against artery walls.", plain: "It is recorded as two numbers and shows how hard the heart works." },
  "personal protective equipment": { def: "Gear that protects against exposure to hazards.", plain: "Gloves, masks, and gowns are PPE." },
  "sterile field": { def: "An area kept free of all germs for a procedure.", plain: "Nothing unclean is allowed to touch it." },
  "measurement accuracy": { def: "How close a measurement is to the true value.", plain: "Accurate readings lead to safe decisions." },
  "room preparation": { def: "Getting a space ready and clean for care.", plain: "It sets up supplies and safety before a patient arrives." },
  "safety checklist": { def: "A list of steps used to confirm safe practice.", plain: "It makes sure nothing important is missed." },
  "equipment cleaning": { def: "Removing germs and dirt from equipment.", plain: "Clean equipment prevents the spread of infection." },
  "reporting abnormal findings": { def: "Telling the right person when a result is outside the normal range.", plain: "If something looks off, you report it promptly." },
  "oxygen saturation": { def: "The percentage of oxygen carried in the blood.", plain: "It shows how well oxygen is reaching the body." },
  "pain scale": { def: "A tool patients use to rate their pain.", plain: "It turns pain into a number, often 0 to 10." },
  "normal range": { def: "The expected healthy span for a measurement.", plain: "Readings inside it are typical; outside it needs attention." },
  baseline: { def: "A person's normal measurement used for comparison.", plain: "It is the starting point you compare later readings to." },
  "abnormal finding": { def: "A result outside the normal range.", plain: "It is a sign that may need closer attention or reporting." },
  "measurement technique": { def: "The correct method for taking a measurement.", plain: "Proper technique gives accurate, comparable results." },
  // HOSA — Body Systems
  "cardiovascular system": { def: "The heart and blood vessels that circulate blood.", plain: "It pumps blood to deliver oxygen and nutrients." },
  "integumentary system": { def: "The skin, hair, and nails that cover and protect the body.", plain: "It is the body's outer barrier." },
  "lymphatic system": { def: "The network that drains fluid and supports immunity.", plain: "It helps fight infection and balance body fluids." },
  "urinary system": { def: "The organs that make and remove urine.", plain: "The kidneys and bladder clear waste and balance fluids." },
  "reproductive system": { def: "The organs involved in producing offspring.", plain: "It is the body system responsible for reproduction." },
  "immune response": { def: "The body's defense reaction against a pathogen.", plain: "It is how the body fights off germs." },
  "homeostatic balance": { def: "The body's steady internal state.", plain: "It is the balance the body works to maintain." },
  "organ system interaction": { def: "How body systems work together.", plain: "Systems depend on each other to keep you alive." },
  // HOSA — Infection Control
  "chain of infection": { def: "The steps by which infection spreads.", plain: "Breaking any link in the chain stops the spread." },
  "transmission-based precautions": { def: "Extra precautions used for specific contagious infections.", plain: "They add to standard precautions when needed." },
  disinfection: { def: "Killing most germs on surfaces.", plain: "It reduces germs but is not as complete as sterilization." },
  sterilization: { def: "Destroying all germs, including spores.", plain: "It makes equipment completely free of living germs." },
  "pathogen reservoir": { def: "A place where a germ lives and multiplies.", plain: "People, animals, or surfaces can be reservoirs." },
  "exposure control": { def: "Steps that limit contact with infectious material.", plain: "It reduces the chance of catching or spreading germs." },
  "isolation protocol": { def: "Rules for separating a contagious patient from others.", plain: "It keeps an infection from spreading to other people." },
  // HOSA — Medical Abbreviations
  BP: { def: "Blood pressure.", plain: "BP is the force of blood against artery walls." },
  HR: { def: "Heart rate.", plain: "HR is how many times the heart beats per minute." },
  RR: { def: "Respiratory rate.", plain: "RR is how many breaths a person takes per minute." },
  PRN: { def: "As needed (from Latin 'pro re nata').", plain: "PRN means do it only when it is needed." },
  NPO: { def: "Nothing by mouth (from Latin 'nil per os').", plain: "NPO means the patient should not eat or drink." },
  BID: { def: "Twice a day.", plain: "BID means a schedule of two times daily." },
  TID: { def: "Three times a day.", plain: "TID means a schedule of three times daily." },
  STAT: { def: "Immediately.", plain: "STAT means do it right now." },
  SOB: { def: "Shortness of breath.", plain: "SOB describes difficulty breathing." },
  ROM: { def: "Range of motion.", plain: "ROM is how far a joint can move." },
  // HOSA — Emergency Care Basics
  "scene safety": { def: "Making sure an emergency scene is safe before helping.", plain: "You protect yourself first so you can help others." },
  "primary assessment": { def: "The first quick check of a patient's most urgent needs.", plain: "It checks the basics like airway, breathing, and circulation." },
  airway: { def: "The passage that lets air reach the lungs.", plain: "A clear airway is needed to breathe." },
  breathing: { def: "Moving air in and out of the lungs.", plain: "Checking breathing is a basic first step in an emergency." },
  circulation: { def: "The movement of blood through the body.", plain: "It checks whether blood is reaching the body." },
  "bleeding control": { def: "Stopping or slowing blood loss.", plain: "Pressure on a wound helps control bleeding." },
  shock: { def: "A dangerous state when the body is not getting enough blood flow.", plain: "It is a medical emergency that needs fast help." },
  "activation of EMS": { def: "Calling emergency medical services for help.", plain: "It means getting professional responders on the way." },
  "triage priority": { def: "The order in which patients are treated by urgency.", plain: "The most serious are treated first." },
  "recovery position": { def: "A safe on-the-side position for an unconscious but breathing person.", plain: "It helps keep the airway clear." },
  // HOSA — Nutrition
  macronutrient: { def: "A nutrient the body needs in large amounts.", plain: "Carbohydrates, proteins, and fats are macronutrients." },
  micronutrient: { def: "A nutrient the body needs in small amounts.", plain: "Vitamins and minerals are micronutrients." },
  calorie: { def: "A unit of energy from food.", plain: "It measures how much energy a food provides." },
  "balanced diet": { def: "Eating the right mix of nutrients for health.", plain: "It includes a variety of foods in healthy amounts." },
  fiber: { def: "A plant nutrient that aids digestion.", plain: "It helps the digestive system work well." },
  protein: { def: "A nutrient used to build and repair the body.", plain: "It helps grow and maintain muscles and tissues." },
  electrolyte: { def: "A mineral that helps balance fluids and nerve signals.", plain: "Sodium and potassium are electrolytes." },
  "portion size": { def: "The amount of food eaten at one time.", plain: "It is how much you put on your plate." },
  "dietary restriction": { def: "A limit on certain foods for health or other reasons.", plain: "Allergies or beliefs can require restrictions." },
  // HOSA — Epidemiology Basics
  "case definition": { def: "The standard criteria used to count a case of a disease.", plain: "It sets exactly what counts as a case." },
  "transmission rate": { def: "How quickly a disease spreads from person to person.", plain: "A higher rate means it spreads faster." },
  "prevention strategy": { def: "A plan to reduce the spread or risk of disease.", plain: "It is the approach used to keep people from getting sick." },
  "population sample": { def: "A smaller group chosen to represent a population.", plain: "Studying a sample stands in for studying everyone." },
  "public health data": { def: "Information used to track and protect community health.", plain: "Officials use it to spot and respond to problems." },
  // HOSA — Healthcare Careers
  "licensed professional": { def: "A worker with official permission to practice.", plain: "A license proves they meet required standards." },
  "medical assistant": { def: "A healthcare worker who supports clinical and office tasks.", plain: "They help with both patient care and paperwork." },
  nurse: { def: "A licensed professional who provides patient care.", plain: "Nurses care for patients and support treatment." },
  physician: { def: "A medical doctor who diagnoses and treats patients.", plain: "Physicians lead medical care and decisions." },
  pharmacist: { def: "A professional who prepares and dispenses medications.", plain: "They make sure medicines are correct and safe." },
  "physical therapist": { def: "A professional who helps patients restore movement.", plain: "They guide exercises and recovery after injury." },
  "public health worker": { def: "A professional who protects community health.", plain: "They focus on prevention across whole populations." },
  "interprofessional team": { def: "A team of different healthcare professionals working together.", plain: "Each role adds expertise to patient care." },
  "professional credential": { def: "An official qualification, like a license or certification.", plain: "It shows someone is trained for their role." },
  // HOSA — Safety Procedures
  "fall prevention": { def: "Steps taken to keep patients from falling.", plain: "Clear floors and support reduce fall risk." },
  "hazard communication": { def: "Sharing information about workplace hazards.", plain: "Labels and warnings tell people about dangers." },
  "sharps safety": { def: "Handling needles and sharp tools safely.", plain: "It prevents cuts and needle-stick injuries." },
  "fire safety": { def: "Practices that prevent and respond to fires.", plain: "It includes knowing exits and how to react." },
  "body mechanics": { def: "Using your body correctly to move safely.", plain: "Good body mechanics prevent injury when lifting." },
  "incident report": { def: "A record of an accident or unsafe event.", plain: "It documents what happened so it can be reviewed." },
  "emergency exit": { def: "A marked route out of a building in an emergency.", plain: "It is the safe way out when you must leave fast." },
  "equipment check": { def: "Inspecting equipment to confirm it works and is safe.", plain: "It catches problems before equipment is used." },
  "safe transfer": { def: "Moving a patient safely from one place to another.", plain: "Proper technique protects both patient and worker." }
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// One clear, beginner-friendly card per term, in a fixed order: definition, plain explanation,
// scenario use, common mistake, and a quick check that tests the actual term.
function flashcardFor(organization: "DECA" | "HOSA", deck: string, term: string, index: number): Flashcard {
  const entry = GLOSSARY[term];
  const definition = entry?.def ?? `${capitalizeFirst(term)} is a key ${deck} term every competitor should be able to define in plain words.`;
  const beginnerExplanation = entry?.plain ?? `Start by learning what ${term} means in simple words, then practice using it.`;
  const isDeca = organization === "DECA";

  const example = isDeca
    ? `In a DECA roleplay, bring up ${term} when you explain the problem, your recommendation, or a number that backs it up.`
    : `In a HOSA scenario, ${term} may come up. Explain it in plain language and choose a safe next step that stays within a student competitor's role.`;

  const commonMistake = isDeca
    ? `Don't just name ${term}. Show how it changes the recommendation, the customer, or the numbers.`
    : entry?.mistake ?? `Don't just state ${term}. Explain it in plain language and stay within a student competitor's scope — describe and report rather than diagnose or treat.`;

  return {
    id: `${isDeca ? "deca" : "hosa"}-${slugify(deck)}-${slugify(term)}`,
    organization,
    deck,
    deckSlug: `${isDeca ? "deca" : "hosa"}-${slugify(deck)}`,
    term,
    definition,
    beginnerExplanation,
    example,
    commonMistake,
    quickCheck: `What does ${term} mean?`,
    quickCheckAnswer: definition,
    difficulty: (["BEGINNER", "INTERMEDIATE", "ELITE"] as const)[index % 3],
    tags: [deck, term],
    relatedSkills: [deck, isDeca ? "Business reasoning" : "Patient communication"]
  };
}

function buildFlashcards() {
  const decaCards = Object.entries(decaTerms).flatMap(([deck, terms]) =>
    terms.map((term, index) => flashcardFor("DECA", deck, term, index))
  );

  const hosaCards = Object.entries(hosaTerms).flatMap(([deck, terms]) =>
    terms.map((term, index) => flashcardFor("HOSA", deck, term, index))
  );

  // A term can appear in more than one deck; keep one card per unique id.
  const all = [...decaCards, ...hosaCards];
  const seen = new Set<string>();
  return all.filter((card) => {
    if (seen.has(card.id)) {
      return false;
    }
    seen.add(card.id);
    return true;
  });
}

export const FLASHCARDS = buildFlashcards();

export const RESOURCE_VIDEOS: ResourceVideo[] = [
  {
    id: "official-deca-competitive-events",
    title: "Official DECA competitive events hub",
    topic: "Event families, exam blueprints, roleplays, case studies, and preparation resources",
    sourceName: "DECA",
    estimatedDuration: "Reference page",
    url: "https://www.deca.org/compete",
    organization: "DECA",
    skillTags: ["Performance indicators", "Roleplay", "Exam blueprint", "Business Management", "Marketing", "Finance"],
    followUp: "mastery check"
  },
  {
    id: "official-deca-performance-indicators",
    title: "Official DECA performance indicators",
    topic: "Performance indicator language for roleplays and case recommendations",
    sourceName: "DECA",
    estimatedDuration: "Reference page",
    url: "https://www.deca.org/compete/performance-indicators",
    organization: "DECA",
    skillTags: ["Performance indicators", "Professional communication", "Roleplay"],
    followUp: "explain it back"
  },
  {
    id: "official-hosa-guidelines",
    title: "Official HOSA event guidelines",
    topic: "Event guideline reference for HOSA categories and competition expectations",
    sourceName: "HOSA",
    estimatedDuration: "Reference page",
    url: "https://hosa.org/guidelines/",
    organization: "HOSA",
    skillTags: ["Clinical Skills", "Medical Terminology", "Healthcare Ethics", "Patient Communication"],
    followUp: "mastery check"
  },
  {
    id: "ka-economics",
    title: "Khan Academy economics and finance unit",
    topic: "Economics, finance, market reasoning",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/economics-finance-domain",
    organization: "DECA",
    skillTags: ["Finance", "Business Management", "Personal Financial Literacy"],
    followUp: "quick quiz"
  },
  {
    id: "ka-personal-finance",
    title: "Khan Academy personal finance unit",
    topic: "Budgeting, credit, saving, financial choices",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/college-careers-more/personal-finance",
    organization: "DECA",
    skillTags: ["Personal Financial Literacy", "Finance"],
    followUp: "flashcards"
  },
  {
    id: "yt-deca-marketing",
    title: "Search: DECA marketing performance indicators",
    topic: "Marketing roleplay vocabulary and indicators",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+marketing+performance+indicators+roleplay",
    organization: "DECA",
    skillTags: ["Marketing", "Performance indicators", "Roleplay"],
    followUp: "explain it back"
  },
  {
    id: "yt-deca-entrepreneurship",
    title: "Search: DECA entrepreneurship roleplay practice",
    topic: "Entrepreneurship case structure",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+entrepreneurship+roleplay+practice",
    organization: "DECA",
    skillTags: ["Entrepreneurship", "Feasibility", "Pitch"],
    followUp: "mastery check"
  },
  {
    id: "yt-deca-finance",
    title: "Search: DECA finance roleplay practice",
    topic: "Cash flow, margins, credit, and financial reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+finance+roleplay+practice+cash+flow+margin",
    organization: "DECA",
    skillTags: ["Finance", "Financial analysis", "Personal Financial Literacy"],
    followUp: "quick quiz"
  },
  {
    id: "yt-deca-management",
    title: "Search: DECA business management case study",
    topic: "Operations, HR, customer relations, and business reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+business+management+case+study+roleplay",
    organization: "DECA",
    skillTags: ["Business Management", "Operations", "Human resources"],
    followUp: "explain it back"
  },
  {
    id: "ka-health",
    title: "Khan Academy health and medicine unit",
    topic: "Human body systems and health science foundations",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/science/health-and-medicine",
    organization: "HOSA",
    skillTags: ["Anatomy and Physiology", "Health Science Concepts"],
    followUp: "quick quiz"
  },
  {
    id: "yt-hosa-medical-terms",
    title: "Search: medical terminology basics",
    topic: "Prefixes, suffixes, and common clinical terms",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=medical+terminology+basics+prefix+suffix+root",
    organization: "HOSA",
    skillTags: ["Medical Terminology"],
    followUp: "flashcards"
  },
  {
    id: "yt-hosa-patient-communication",
    title: "Search: patient communication teach-back",
    topic: "Patient communication and plain-language checks",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=patient+communication+teach+back+healthcare",
    organization: "HOSA",
    skillTags: ["Patient Communication", "Healthcare Ethics"],
    followUp: "explain it back"
  },
  {
    id: "yt-hosa-anatomy",
    title: "Search: anatomy and physiology body systems overview",
    topic: "Body systems, structure/function, and physiology reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=anatomy+and+physiology+body+systems+overview",
    organization: "HOSA",
    skillTags: ["Anatomy and Physiology", "Body Systems", "Vital Signs"],
    followUp: "quick quiz"
  },
  {
    id: "yt-hosa-public-health",
    title: "Search: public health basics epidemiology",
    topic: "Outbreaks, prevention, incidence, prevalence, and risk communication",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=public+health+basics+epidemiology+incidence+prevalence",
    organization: "HOSA",
    skillTags: ["Public Health", "Epidemiology Basics", "Prevention"],
    followUp: "explain it back"
  },
  {
    id: "yt-hosa-ethics",
    title: "Search: healthcare ethics patient privacy consent",
    topic: "Confidentiality, consent, boundaries, and professional communication",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=healthcare+ethics+patient+privacy+consent+communication",
    organization: "HOSA",
    skillTags: ["Healthcare Ethics", "Patient Communication", "Professionalism"],
    followUp: "mastery check"
  },
  {
    id: "yt-debate-refutation",
    title: "Search: debate refutation drills",
    topic: "Refutation, rebuttal, and clash",
    sourceName: "YouTube",
    estimatedDuration: "5-12 min videos",
    url: "https://www.youtube.com/results?search_query=debate+refutation+rebuttal+clash+tutorial",
    organization: "DEBATE",
    skillTags: ["Refutation", "Clash", "Rebuttal"],
    followUp: "writing practice"
  },
  {
    id: "yt-debate-weighing",
    title: "Search: weighing arguments in debate",
    topic: "Impact comparison and ballot writing",
    sourceName: "YouTube",
    estimatedDuration: "5-12 min videos",
    url: "https://www.youtube.com/results?search_query=weighing+arguments+debate+magnitude+probability+timeframe",
    organization: "DEBATE",
    skillTags: ["Weighing", "Persuasion", "Organization"],
    followUp: "writing practice"
  },
  {
    id: "yt-debate-signposting",
    title: "Search: signposting in debate speeches",
    topic: "Speech structure and flow clarity",
    sourceName: "YouTube",
    estimatedDuration: "5-10 min videos",
    url: "https://www.youtube.com/results?search_query=signposting+debate+speech+organization",
    organization: "DEBATE",
    skillTags: ["Signposting", "Organization"],
    followUp: "mastery check"
  }
];

export function deckSummaries() {
  const decks = new Map<string, { deck: string; deckSlug: string; organization: "DECA" | "HOSA"; count: number }>();

  for (const card of FLASHCARDS) {
    const existing = decks.get(card.deckSlug);
    decks.set(card.deckSlug, {
      deck: card.deck,
      deckSlug: card.deckSlug,
      organization: card.organization,
      count: (existing?.count ?? 0) + 1
    });
  }

  return Array.from(decks.values());
}

export function flashcardsForDeck(deckSlug: string) {
  return FLASHCARDS.filter((card) => card.deckSlug === deckSlug);
}

// `organization` accepts any track organization (e.g. MODEL_UN); tracks with no dedicated videos
// surface only shared "GENERAL" foundations. When an organization filter is set we NEVER fall back to
// the full list — an empty result is an honest empty state, not an excuse to leak another track's
// resources. The all-videos fallback only applies to the no-organization browse-all case.
export function recommendedResources(input: { organization?: string; skillTags?: string[]; limit?: number }) {
  const tags = (input.skillTags ?? []).map((tag) => tag.toLowerCase());
  const matches = RESOURCE_VIDEOS.filter((resource) => {
    const organizationMatches = !input.organization || resource.organization === input.organization || resource.organization === "GENERAL";
    const tagMatches =
      tags.length === 0 ||
      resource.skillTags.some((tag) => tags.some((requested) => tag.toLowerCase().includes(requested) || requested.includes(tag.toLowerCase())));

    return organizationMatches && tagMatches;
  });

  const pool = matches.length > 0 || input.organization ? matches : RESOURCE_VIDEOS;
  return pool.slice(0, input.limit ?? 3);
}

export function studyDeckForSkill(skillTag: string, organization: "DECA" | "HOSA") {
  const normalized = skillTag.toLowerCase();
  const match = deckSummaries().find(
    (deck) => deck.organization === organization && (deck.deck.toLowerCase().includes(normalized) || normalized.includes(deck.deck.toLowerCase()))
  );

  return match ?? deckSummaries().find((deck) => deck.organization === organization);
}
