// HOSA Medical Terminology knowledge engine.
//
// PROVENANCE: The six knowledge areas below are the topic taxonomy documented in the HOSA Medical
// Terminology event guidelines (prefixes, suffixes, word roots, anatomy, physiology,
// pathophysiology, and health occupations). We treat them as sourced from the guidelines the
// registry spec references. The QUESTIONS are ORIGINAL, hand-authored items that test transferable
// word-part meaning and construction concepts — they are NOT reproduced from any HOSA test, sample
// item, or other protected source. This mirrors the app's standing rule: teach the concept, never
// copy protected exam wording.

export const MEDTERM_SKILL_SLUG = "hosa-medical-terminology";

export type MedTermArea =
  | "word-roots"
  | "prefixes"
  | "suffixes"
  | "anatomy"
  | "physiology"
  | "pathophysiology";

export const MEDTERM_AREAS: Array<{ id: MedTermArea; label: string; description: string }> = [
  { id: "word-roots", label: "Word roots", description: "Core meaning of a term (e.g. cardi-, nephr-, hepat-)." },
  { id: "prefixes", label: "Prefixes", description: "Word beginnings that modify meaning (e.g. hyper-, brady-, peri-)." },
  { id: "suffixes", label: "Suffixes", description: "Word endings, often the procedure or condition (e.g. -ectomy, -itis, -megaly)." },
  { id: "anatomy", label: "Anatomy", description: "Structures and their locations." },
  { id: "physiology", label: "Physiology", description: "Normal function of structures and systems." },
  { id: "pathophysiology", label: "Pathophysiology", description: "How disease alters normal function." }
];

export type MedTermQuestion = {
  id: string;
  area: MedTermArea;
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

// Original item bank. Each item teaches a transferable concept; distractors are plausible but
// clearly wrong on the explanation. IDs are stable so review scheduling can reference them.
export const MEDTERM_BANK: MedTermQuestion[] = [
  // --- Word roots ---
  { id: "wr-01", area: "word-roots", question: "The root 'nephr' most directly refers to which organ?", choices: ["Liver", "Kidney", "Lung", "Stomach"], correctAnswer: "Kidney", explanation: "'Nephr' means kidney, as in nephrology (study of the kidneys). 'Hepat' is liver, 'pneum' is lung, 'gastr' is stomach." },
  { id: "wr-02", area: "word-roots", question: "A term containing 'oste' concerns which tissue?", choices: ["Bone", "Blood", "Skin", "Muscle"], correctAnswer: "Bone", explanation: "'Oste' means bone (osteoporosis, osteomyelitis). 'Hem' is blood, 'derm' is skin, 'my' is muscle." },
  { id: "wr-03", area: "word-roots", question: "Which root refers to the heart?", choices: ["Cardi", "Cerebr", "Cost", "Cyst"], correctAnswer: "Cardi", explanation: "'Cardi' means heart (cardiology). 'Cerebr' is brain, 'cost' is rib, 'cyst' is bladder/sac." },
  { id: "wr-04", area: "word-roots", question: "The root 'pulmon' relates to the:", choices: ["Lungs", "Pancreas", "Bladder", "Spleen"], correctAnswer: "Lungs", explanation: "'Pulmon' means lung (pulmonary). Do not confuse with 'pneum' (also lung/air) — both are valid lung roots." },
  { id: "wr-05", area: "word-roots", question: "'Hepat' in a medical term points to the:", choices: ["Liver", "Heart", "Kidney", "Brain"], correctAnswer: "Liver", explanation: "'Hepat' means liver (hepatitis = liver inflammation)." },
  { id: "wr-06", area: "word-roots", question: "A word built on 'neur' concerns the:", choices: ["Nerves", "Nose", "Nails", "Neck"], correctAnswer: "Nerves", explanation: "'Neur' means nerve (neurology, neuropathy)." },
  { id: "wr-07", area: "word-roots", question: "The root 'derm' refers to the:", choices: ["Skin", "Teeth", "Ear", "Eye"], correctAnswer: "Skin", explanation: "'Derm' means skin (dermatology). 'Dent' is teeth, 'ot' is ear, 'ophthalm' is eye." },
  { id: "wr-08", area: "word-roots", question: "'Gastr' combined with a suffix describes the:", choices: ["Stomach", "Gallbladder", "Gums", "Glands"], correctAnswer: "Stomach", explanation: "'Gastr' means stomach (gastritis, gastroscopy)." },
  { id: "wr-09", area: "word-roots", question: "Which root means 'blood'?", choices: ["Hem", "Hydr", "Hist", "Hyster"], correctAnswer: "Hem", explanation: "'Hem'/'hemat' means blood (hematology). 'Hydr' is water, 'hist' is tissue, 'hyster' is uterus." },

  // --- Prefixes ---
  { id: "pr-01", area: "prefixes", question: "The prefix 'brady-' means:", choices: ["Fast", "Slow", "Absent", "Painful"], correctAnswer: "Slow", explanation: "'Brady-' means slow (bradycardia = slow heart rate). Its opposite, 'tachy-', means fast." },
  { id: "pr-02", area: "prefixes", question: "'Hyper-' indicates a condition that is:", choices: ["Below normal", "Above normal", "Normal", "Reversed"], correctAnswer: "Above normal", explanation: "'Hyper-' means excessive/above (hypertension = high blood pressure). 'Hypo-' means below." },
  { id: "pr-03", area: "prefixes", question: "A structure described as 'peri-' is:", choices: ["Around", "Through", "Within", "Below"], correctAnswer: "Around", explanation: "'Peri-' means around (pericardium = sac around the heart). 'Intra-' is within, 'infra-' is below." },
  { id: "pr-04", area: "prefixes", question: "The prefix 'dys-' signals function that is:", choices: ["Easy", "Difficult or painful", "Fast", "Doubled"], correctAnswer: "Difficult or painful", explanation: "'Dys-' means bad/difficult/painful (dysphagia = difficulty swallowing)." },
  { id: "pr-05", area: "prefixes", question: "'Tachy-' means:", choices: ["Slow", "Rapid", "Irregular", "Weak"], correctAnswer: "Rapid", explanation: "'Tachy-' means fast/rapid (tachycardia = rapid heart rate)." },
  { id: "pr-06", area: "prefixes", question: "The prefix 'a-' or 'an-' means:", choices: ["Toward", "Without or absence of", "After", "Again"], correctAnswer: "Without or absence of", explanation: "'A-/an-' means without (anemia = without enough blood; apnea = without breathing)." },
  { id: "pr-07", area: "prefixes", question: "'Poly-' in a medical term means:", choices: ["Few", "Many", "Half", "Equal"], correctAnswer: "Many", explanation: "'Poly-' means many/much (polyuria = excessive urination)." },
  { id: "pr-08", area: "prefixes", question: "The prefix 'intra-' means:", choices: ["Between", "Within", "Outside", "Beyond"], correctAnswer: "Within", explanation: "'Intra-' means within (intravenous = within a vein). 'Inter-' means between." },
  { id: "pr-09", area: "prefixes", question: "'Sub-' indicates a position that is:", choices: ["Above", "Under or below", "Beside", "Behind"], correctAnswer: "Under or below", explanation: "'Sub-' means under/below (subcutaneous = below the skin)." },

  // --- Suffixes ---
  { id: "sf-01", area: "suffixes", question: "The suffix '-itis' means:", choices: ["Removal", "Inflammation", "Enlargement", "Study of"], correctAnswer: "Inflammation", explanation: "'-itis' means inflammation (arthritis = joint inflammation)." },
  { id: "sf-02", area: "suffixes", question: "A term ending in '-ectomy' describes:", choices: ["Surgical removal", "Visual exam", "Cutting into", "Repair"], correctAnswer: "Surgical removal", explanation: "'-ectomy' is surgical removal (appendectomy). '-otomy' is cutting into; '-ostomy' is a new opening." },
  { id: "sf-03", area: "suffixes", question: "The suffix '-megaly' means:", choices: ["Shrinkage", "Enlargement", "Pain", "Hardening"], correctAnswer: "Enlargement", explanation: "'-megaly' means enlargement (cardiomegaly = enlarged heart)." },
  { id: "sf-04", area: "suffixes", question: "'-ology' at the end of a word means:", choices: ["Study of", "Disease of", "Flow of", "Fear of"], correctAnswer: "Study of", explanation: "'-ology' means the study of (cardiology = study of the heart)." },
  { id: "sf-05", area: "suffixes", question: "The suffix '-emia' refers to a condition of the:", choices: ["Urine", "Blood", "Bile", "Lymph"], correctAnswer: "Blood", explanation: "'-emia' means a blood condition (leukemia, anemia). '-uria' refers to urine." },
  { id: "sf-06", area: "suffixes", question: "A procedure ending in '-scopy' involves:", choices: ["Recording", "Visual examination", "Measurement", "Removal"], correctAnswer: "Visual examination", explanation: "'-scopy' is visual examination with a scope (endoscopy). '-graphy' is the process of recording." },
  { id: "sf-07", area: "suffixes", question: "The suffix '-pathy' means:", choices: ["Surgical repair", "Disease", "Paralysis", "Formation"], correctAnswer: "Disease", explanation: "'-pathy' means disease (neuropathy = nerve disease)." },
  { id: "sf-08", area: "suffixes", question: "'-plasty' indicates:", choices: ["Surgical repair or reshaping", "Puncture", "Fixation", "Crushing"], correctAnswer: "Surgical repair or reshaping", explanation: "'-plasty' means surgical repair/reshaping (rhinoplasty = reshaping the nose)." },
  { id: "sf-09", area: "suffixes", question: "A word ending in '-algia' describes:", choices: ["Weakness", "Pain", "Swelling", "Discharge"], correctAnswer: "Pain", explanation: "'-algia' means pain (neuralgia = nerve pain; myalgia = muscle pain)." },

  // --- Anatomy ---
  { id: "an-01", area: "anatomy", question: "Which chamber of the heart pumps oxygen-rich blood to the body?", choices: ["Right atrium", "Right ventricle", "Left ventricle", "Left atrium"], correctAnswer: "Left ventricle", explanation: "The left ventricle pumps oxygenated blood into the aorta and out to the body; the right ventricle sends blood to the lungs." },
  { id: "an-02", area: "anatomy", question: "The diaphragm is a muscle primarily involved in:", choices: ["Digestion", "Breathing", "Circulation", "Filtration"], correctAnswer: "Breathing", explanation: "The diaphragm contracts to draw air into the lungs; it is the primary muscle of respiration." },
  { id: "an-03", area: "anatomy", question: "Which structure connects muscle to bone?", choices: ["Ligament", "Tendon", "Cartilage", "Fascia"], correctAnswer: "Tendon", explanation: "Tendons connect muscle to bone; ligaments connect bone to bone." },
  { id: "an-04", area: "anatomy", question: "The largest organ of the human body is the:", choices: ["Liver", "Skin", "Lungs", "Brain"], correctAnswer: "Skin", explanation: "The skin (integumentary system) is the body's largest organ by surface area and weight." },
  { id: "an-05", area: "anatomy", question: "Where does most nutrient absorption occur?", choices: ["Stomach", "Small intestine", "Large intestine", "Esophagus"], correctAnswer: "Small intestine", explanation: "The small intestine, with its villi, absorbs most nutrients; the large intestine mainly reabsorbs water." },
  { id: "an-06", area: "anatomy", question: "The functional filtering unit of the kidney is the:", choices: ["Alveolus", "Nephron", "Neuron", "Villus"], correctAnswer: "Nephron", explanation: "The nephron is the kidney's filtering unit. The alveolus is in the lung, the neuron in the nervous system, the villus in the intestine." },
  { id: "an-07", area: "anatomy", question: "Which bones protect the lungs and heart?", choices: ["Vertebrae", "Ribs", "Pelvis", "Femurs"], correctAnswer: "Ribs", explanation: "The rib cage encloses and protects the thoracic organs, including the heart and lungs." },
  { id: "an-08", area: "anatomy", question: "The trachea is commonly known as the:", choices: ["Voice box", "Windpipe", "Food pipe", "Air sac"], correctAnswer: "Windpipe", explanation: "The trachea (windpipe) carries air to the bronchi. The larynx is the voice box; the esophagus is the food pipe." },
  { id: "an-09", area: "anatomy", question: "Gas exchange in the lungs takes place in the:", choices: ["Bronchi", "Alveoli", "Pleura", "Trachea"], correctAnswer: "Alveoli", explanation: "Alveoli are the tiny air sacs where oxygen and carbon dioxide are exchanged with the blood." },

  // --- Physiology ---
  { id: "ph-01", area: "physiology", question: "Homeostasis refers to the body's ability to:", choices: ["Grow continuously", "Maintain a stable internal environment", "Fight all infection", "Store fat"], correctAnswer: "Maintain a stable internal environment", explanation: "Homeostasis is maintaining stable internal conditions (temperature, pH, glucose) despite external change." },
  { id: "ph-02", area: "physiology", question: "Which hormone lowers blood glucose?", choices: ["Glucagon", "Insulin", "Cortisol", "Adrenaline"], correctAnswer: "Insulin", explanation: "Insulin moves glucose into cells, lowering blood sugar. Glucagon raises it." },
  { id: "ph-03", area: "physiology", question: "Red blood cells primarily transport:", choices: ["Hormones", "Oxygen", "Nutrients", "Waste enzymes"], correctAnswer: "Oxygen", explanation: "Red blood cells carry oxygen via hemoglobin from the lungs to tissues." },
  { id: "ph-04", area: "physiology", question: "The normal resting adult heart rate range is about:", choices: ["20-40 bpm", "60-100 bpm", "120-160 bpm", "180-220 bpm"], correctAnswer: "60-100 bpm", explanation: "A typical resting adult heart rate is 60-100 beats per minute; below 60 is bradycardia, above 100 is tachycardia." },
  { id: "ph-05", area: "physiology", question: "Which system is chiefly responsible for producing antibodies?", choices: ["Endocrine", "Immune", "Respiratory", "Muscular"], correctAnswer: "Immune", explanation: "The immune system produces antibodies (via B lymphocytes) to target pathogens." },
  { id: "ph-06", area: "physiology", question: "The primary role of the respiratory system is to:", choices: ["Filter blood", "Exchange oxygen and carbon dioxide", "Digest food", "Produce hormones"], correctAnswer: "Exchange oxygen and carbon dioxide", explanation: "The respiratory system brings in oxygen and removes carbon dioxide through gas exchange." },
  { id: "ph-07", area: "physiology", question: "Peristalsis is the process that:", choices: ["Filters blood in the kidney", "Moves food through the digestive tract", "Contracts the heart", "Cools the body"], correctAnswer: "Moves food through the digestive tract", explanation: "Peristalsis is the wave-like muscle contraction that propels food through the GI tract." },
  { id: "ph-08", area: "physiology", question: "Which organ regulates blood glucose by releasing insulin and glucagon?", choices: ["Liver", "Pancreas", "Spleen", "Thyroid"], correctAnswer: "Pancreas", explanation: "The pancreas releases insulin and glucagon to regulate blood glucose." },
  { id: "ph-09", area: "physiology", question: "Body temperature regulation is an example of:", choices: ["Digestion", "A negative feedback loop", "Cellular division", "Passive diffusion only"], correctAnswer: "A negative feedback loop", explanation: "Temperature control uses negative feedback: a rise triggers cooling responses that return the body toward its set point." },

  // --- Pathophysiology ---
  { id: "pp-01", area: "pathophysiology", question: "Hypertension is best described as:", choices: ["Low blood sugar", "Persistently high blood pressure", "Rapid breathing", "Low red cell count"], correctAnswer: "Persistently high blood pressure", explanation: "Hypertension is chronically elevated blood pressure, a risk factor for heart disease and stroke." },
  { id: "pp-02", area: "pathophysiology", question: "Anemia most directly results in reduced:", choices: ["Oxygen-carrying capacity", "Clotting ability", "Nerve conduction", "Bone density"], correctAnswer: "Oxygen-carrying capacity", explanation: "Anemia is too few healthy red blood cells or hemoglobin, lowering the blood's oxygen-carrying capacity." },
  { id: "pp-03", area: "pathophysiology", question: "In type 1 diabetes, the body fails to produce enough:", choices: ["Glucagon", "Insulin", "Cortisol", "Bile"], correctAnswer: "Insulin", explanation: "Type 1 diabetes is loss of insulin-producing beta cells, so blood glucose stays high." },
  { id: "pp-04", area: "pathophysiology", question: "An 'infarction' refers to tissue death caused by:", choices: ["Overhydration", "Loss of blood supply", "Excess oxygen", "Nerve overstimulation"], correctAnswer: "Loss of blood supply", explanation: "An infarction is tissue death (necrosis) from interrupted blood supply, as in a myocardial infarction (heart attack)." },
  { id: "pp-05", area: "pathophysiology", question: "'Edema' is the medical term for:", choices: ["Fluid buildup and swelling", "Rapid heartbeat", "Muscle wasting", "Excess sweating"], correctAnswer: "Fluid buildup and swelling", explanation: "Edema is swelling from excess fluid trapped in tissues." },
  { id: "pp-06", area: "pathophysiology", question: "A 'benign' tumor is one that:", choices: ["Spreads aggressively", "Does not invade or spread", "Is always fatal", "Only affects bone"], correctAnswer: "Does not invade or spread", explanation: "Benign tumors do not invade nearby tissue or metastasize; malignant tumors do." },
  { id: "pp-07", area: "pathophysiology", question: "Ischemia refers to:", choices: ["Inadequate blood flow to tissue", "Excess white blood cells", "Bone inflammation", "High blood calcium"], correctAnswer: "Inadequate blood flow to tissue", explanation: "Ischemia is reduced blood flow (and oxygen) to tissue; prolonged ischemia can cause infarction." },
  { id: "pp-08", area: "pathophysiology", question: "Which term describes abnormally low blood oxygen?", choices: ["Hypoxia", "Hyperkalemia", "Hypertrophy", "Hemostasis"], correctAnswer: "Hypoxia", explanation: "'Hypoxia' is low oxygen in tissue. 'Hypertrophy' is enlargement; 'hemostasis' is stopping bleeding." },
  { id: "pp-09", area: "pathophysiology", question: "An acute condition is one that:", choices: ["Develops slowly over years", "Comes on suddenly and is short-lived", "Never causes symptoms", "Only affects children"], correctAnswer: "Comes on suddenly and is short-lived", explanation: "Acute means sudden onset and short duration; chronic means long-lasting or recurring." }
];

export type MedTermMode = "official" | "generic";

export type MedTermSessionQuestion = MedTermQuestion; // full question incl. answer, for immediate feedback

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Draw a session of `count` original questions, spread across areas as evenly as the bank allows.
export function buildMedTermSession(count: number, areas?: MedTermArea[]): MedTermSessionQuestion[] {
  const pool = areas && areas.length > 0 ? MEDTERM_BANK.filter((q) => areas.includes(q.area)) : MEDTERM_BANK;
  const shuffled = shuffle(pool);
  if (count <= shuffled.length) {
    return shuffled.slice(0, count);
  }
  // Only repeat if the caller asks for more than the bank holds (keeps a full 50 possible as the
  // bank grows); repeats are drawn from a fresh shuffle so the order still varies.
  const result = [...shuffled];
  while (result.length < count) {
    result.push(...shuffle(pool));
  }
  return result.slice(0, count);
}

export type MedTermAnswer = { id: string; selected: string; confidence?: "low" | "medium" | "high" };

export type MedTermGradedItem = {
  id: string;
  area: MedTermArea;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  confidence?: "low" | "medium" | "high";
};

export type MedTermResult = {
  total: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean; // >= 70% is the practice pass threshold (same as skill practice)
  items: MedTermGradedItem[];
  weakAreas: Array<{ area: MedTermArea; label: string; missed: number; total: number }>;
};

const PASS_THRESHOLD = 70;

// Server-authoritative grading from the bank — the client's submitted answers are scored against
// the canonical questions here so review scheduling can trust the result.
export function gradeMedTermAnswers(answers: MedTermAnswer[]): MedTermResult {
  const byId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));
  const items: MedTermGradedItem[] = [];
  const areaTally = new Map<MedTermArea, { missed: number; total: number }>();

  for (const answer of answers) {
    const question = byId.get(answer.id);
    if (!question) continue;
    const correct = answer.selected === question.correctAnswer;
    items.push({
      id: question.id,
      area: question.area,
      correct,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      confidence: answer.confidence
    });
    const tally = areaTally.get(question.area) ?? { missed: 0, total: 0 };
    tally.total += 1;
    if (!correct) tally.missed += 1;
    areaTally.set(question.area, tally);
  }

  const total = items.length;
  const correctCount = items.filter((item) => item.correct).length;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const weakAreas = Array.from(areaTally.entries())
    .filter(([, tally]) => tally.missed > 0)
    .map(([area, tally]) => ({
      area,
      label: MEDTERM_AREAS.find((a) => a.id === area)?.label ?? area,
      missed: tally.missed,
      total: tally.total
    }))
    .sort((a, b) => b.missed - a.missed);

  return { total, correctCount, scorePercent, passed: scorePercent >= PASS_THRESHOLD, items, weakAreas };
}
