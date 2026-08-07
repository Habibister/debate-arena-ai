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

  // M14 Phase 2a (audit G2): word roots extended 9 -> 30 so a focused session meets new items across
  // a spaced cycle instead of re-showing the same nine. Every root below already appeared in this
  // bank as a distractor or inside an existing explanation, so nothing widens the event's scope.
  // AI-ASSISTED authoring, HUMAN-REVIEWED AND APPROVED 2026-08-06: the repository owner read all
  // 21 items and approved them for medical accuracy, clarity, distractor quality, originality and
  // explanation correctness. `CLAUDE.md` requires AI-generated material to stay labelled, so the
  // authoring method is recorded here permanently — the approval is what changed, not the label.
  { id: "wr-10", area: "word-roots", question: "A term built on 'my' concerns which tissue?", choices: ["Muscle", "Bone", "Nerve", "Skin"], correctAnswer: "Muscle", explanation: "'My'/'myo' means muscle (myalgia = muscle pain; myocardium = heart muscle). 'Oste' is bone, 'neur' is nerve, 'derm' is skin." },
  { id: "wr-11", area: "word-roots", question: "The combining form 'cerebr/o' refers to the:", choices: ["Cerebrum (brain)", "Heart", "Ribs", "Bladder"], correctAnswer: "Cerebrum (brain)", explanation: "'Cerebr/o' names the cerebrum, the largest part of the brain (cerebral, cerebrovascular). For the brain as a whole the combining form is 'encephal/o'. 'Cardi/o' is heart, 'cost/o' is rib, 'cyst/o' is bladder/sac." },
  { id: "wr-12", area: "word-roots", question: "Which root refers to a rib?", choices: ["Cost", "Crani", "Cyst", "Col"], correctAnswer: "Cost", explanation: "'Cost' means rib (intercostal = between the ribs). 'Crani' is skull, 'cyst' is bladder/sac, 'col' is colon." },
  { id: "wr-13", area: "word-roots", question: "'Cyst' in a medical term most directly means:", choices: ["Bladder or fluid-filled sac", "Cell", "Skull", "Joint"], correctAnswer: "Bladder or fluid-filled sac", explanation: "'Cyst' means bladder or a fluid-filled sac (cystitis = bladder inflammation). 'Cyt' means cell — one letter apart with a different meaning." },
  { id: "wr-14", area: "word-roots", question: "A term containing 'hyster' concerns the:", choices: ["Uterus", "Stomach", "Liver", "Spleen"], correctAnswer: "Uterus", explanation: "'Hyster' means uterus (hysterectomy = surgical removal of the uterus). 'Gastr' is stomach, 'hepat' is liver, 'splen' is spleen." },
  { id: "wr-15", area: "word-roots", question: "The root 'hist' refers to:", choices: ["Tissue", "Water", "Blood", "Bone"], correctAnswer: "Tissue", explanation: "'Hist' means tissue (histology = the study of tissues). 'Hydr' is water, 'hem' is blood, 'oste' is bone." },
  { id: "wr-16", area: "word-roots", question: "Which root means 'water'?", choices: ["Hydr", "Hist", "Hem", "Hyster"], correctAnswer: "Hydr", explanation: "'Hydr' means water (hydration; hydrocephalus = fluid in the brain). 'Hist' is tissue, 'hem' is blood, 'hyster' is uterus." },
  { id: "wr-17", area: "word-roots", question: "A word built on 'ot' concerns the:", choices: ["Ear", "Eye", "Nose", "Mouth"], correctAnswer: "Ear", explanation: "'Ot' means ear (otitis = ear inflammation; otoscope). 'Ophthalm' is eye, 'rhin' is nose, 'stomat' is mouth." },
  { id: "wr-18", area: "word-roots", question: "The root 'ophthalm' refers to the:", choices: ["Eye", "Ear", "Skin", "Skull"], correctAnswer: "Eye", explanation: "'Ophthalm' means eye (ophthalmology). 'Ot' is ear, 'derm' is skin, 'crani' is skull." },
  { id: "wr-19", area: "word-roots", question: "'Dent' in a medical term points to the:", choices: ["Teeth", "Gums", "Tongue", "Jaw"], correctAnswer: "Teeth", explanation: "'Dent' means teeth (dentin, dentist). 'Gingiv' is gums, 'gloss'/'lingu' is tongue, 'gnath' is jaw." },
  { id: "wr-20", area: "word-roots", question: "The root 'pneum' most directly refers to:", choices: ["Lung or air", "Blood", "Bone", "Nerve"], correctAnswer: "Lung or air", explanation: "'Pneum'/'pneumon' means lung or air (pneumonia; pneumothorax = air in the chest cavity). 'Pulmon' is the other lung root." },
  { id: "wr-21", area: "word-roots", question: "A term containing 'arthr' concerns a:", choices: ["Joint", "Muscle", "Vein", "Gland"], correctAnswer: "Joint", explanation: "'Arthr' means joint (arthritis = joint inflammation; arthroscopy). 'My' is muscle, 'phleb' is vein, 'aden' is gland." },
  { id: "wr-22", area: "word-roots", question: "Which root refers to the nose?", choices: ["Rhin", "Ot", "Ophthalm", "Dent"], correctAnswer: "Rhin", explanation: "'Rhin' means nose (rhinoplasty = reshaping the nose; rhinitis). 'Ot' is ear, 'ophthalm' is eye, 'dent' is teeth." },
  { id: "wr-23", area: "word-roots", question: "The root 'angi' refers to a:", choices: ["Vessel", "Valve", "Chamber", "Nerve"], correctAnswer: "Vessel", explanation: "'Angi' means vessel (angiography = imaging of blood vessels; angioplasty). It names the vessel itself, not a valve or a chamber." },
  { id: "wr-24", area: "word-roots", question: "'Phleb' in a medical term means:", choices: ["Vein", "Artery", "Capillary", "Lymph node"], correctAnswer: "Vein", explanation: "'Phleb' means vein (phlebotomy = drawing blood from a vein; phlebitis). 'Arteri' is artery." },
  { id: "wr-25", area: "word-roots", question: "The combining form 'enter/o' refers specifically to the:", choices: ["Small intestine", "Large intestine", "Stomach", "Esophagus"], correctAnswer: "Small intestine", explanation: "'Enter/o' names the small intestine specifically (enteritis; gastroenteritis = stomach and small intestine). The large intestine has its own combining form, 'col/o'. 'Gastr/o' is stomach, 'esophag/o' is esophagus." },
  { id: "wr-26", area: "word-roots", question: "The combining form 'col/o' refers to the:", choices: ["Large intestine (colon)", "Small intestine", "Gallbladder", "Kidney"], correctAnswer: "Large intestine (colon)", explanation: "'Col/o' names the large intestine, or colon (colitis, colostomy). The small intestine has its own combining form, 'enter/o'. Do not confuse 'col/o' with 'colp/o', which is a different structure entirely." },
  { id: "wr-27", area: "word-roots", question: "'Crani' points to the:", choices: ["Skull", "Ribs", "Spine", "Pelvis"], correctAnswer: "Skull", explanation: "'Crani' means skull (craniotomy = surgical opening of the skull). 'Cost' is rib, 'vertebr'/'spondyl' is spine." },
  { id: "wr-28", area: "word-roots", question: "The root 'myel' most directly refers to:", choices: ["Spinal cord or bone marrow", "Muscle", "Heart", "Kidney"], correctAnswer: "Spinal cord or bone marrow", explanation: "'Myel' means spinal cord or bone marrow, and context decides which (myelitis, myeloma). Do not confuse it with 'my', which is muscle." },
  { id: "wr-29", area: "word-roots", question: "A term containing 'lip' concerns:", choices: ["Fat", "Lips", "Lymph", "Liver"], correctAnswer: "Fat", explanation: "'Lip'/'lipo' means fat (lipid, liposuction). Despite the spelling it does not refer to the lips — those are 'labi/o'; 'hepat/o' is liver." },
  { id: "wr-30", area: "word-roots", question: "Which root means 'gland'?", choices: ["Aden", "Angi", "Arthr", "Aer"], correctAnswer: "Aden", explanation: "'Aden' means gland (adenoma, adenoids). 'Angi' is vessel, 'arthr' is joint, 'aer' is air." },

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

  // M14 Phase 2b (audit G2): prefixes extended 9 -> 30, the second area taken to depth. Every prefix
  // below is already implied by this bank — its meaning appears among existing distractors or in an
  // existing explanation — so nothing widens the event's scope.
  // AI-ASSISTED authoring, HUMAN-REVIEWED AND APPROVED 2026-08-07: the repository owner read all
  // 21 items and approved their prefix meanings, answer uniqueness, distractors, wording,
  // explanations and suitability — including the revised pr-20 (hemithorax) and the replacement
  // pr-30 (pseudo-, which supersedes an olig- item that mislabelled a combining form as a prefix).
  // `CLAUDE.md` requires AI-generated material to stay labelled, so the authoring method is
  // recorded here permanently — the approval is what changed, not the provenance.
  { id: "pr-10", area: "prefixes", question: "The prefix 'hypo-' indicates a level that is:", choices: ["Below normal", "Above normal", "Exactly normal", "Rapidly rising"], correctAnswer: "Below normal", explanation: "'Hypo-' means below normal or deficient (hypoglycemia = low blood sugar). Its opposite is 'hyper-'. Positional 'below' is 'sub-'." },
  { id: "pr-11", area: "prefixes", question: "'Inter-' in a medical term means:", choices: ["Between", "Within", "Around", "Beyond"], correctAnswer: "Between", explanation: "'Inter-' means between (intercostal = between the ribs). 'Intra-' means within — one letter apart with a different meaning." },
  { id: "pr-12", area: "prefixes", question: "The prefix 'post-' means:", choices: ["After", "Before", "During", "Against"], correctAnswer: "After", explanation: "'Post-' means after (postoperative = after surgery). 'Pre-' means before." },
  { id: "pr-13", area: "prefixes", question: "Which prefix means 'before'?", choices: ["Pre-", "Post-", "Peri-", "Para-"], correctAnswer: "Pre-", explanation: "'Pre-' means before (preoperative). 'Post-' is after, 'peri-' is around, 'para-' is beside." },
  { id: "pr-14", area: "prefixes", question: "'Re-' at the start of a medical term means:", choices: ["Again or back", "Away from", "Within", "Half"], correctAnswer: "Again or back", explanation: "'Re-' means again or back (rehydration, relapse). 'Ab-' means away from." },
  { id: "pr-15", area: "prefixes", question: "The prefix 'ad-' indicates movement:", choices: ["Toward", "Away from", "Around", "Through"], correctAnswer: "Toward", explanation: "'Ad-' means toward (adduction = movement toward the midline). Its opposite, 'ab-', means away from." },
  { id: "pr-16", area: "prefixes", question: "'Ab-' in a medical term means:", choices: ["Away from", "Toward", "Beneath", "Between"], correctAnswer: "Away from", explanation: "'Ab-' means away from (abduction = movement away from the midline). 'Ad-' means toward." },
  { id: "pr-17", area: "prefixes", question: "Which prefix means 'one'?", choices: ["Mono-", "Bi-", "Tri-", "Poly-"], correctAnswer: "Mono-", explanation: "'Mono-' means one (mononuclear = having one nucleus). 'Bi-' is two, 'tri-' is three, 'poly-' is many." },
  { id: "pr-18", area: "prefixes", question: "The prefix 'bi-' means:", choices: ["Two", "One", "Three", "Half"], correctAnswer: "Two", explanation: "'Bi-' means two (bilateral = affecting both sides). 'Mono-'/'uni-' is one, 'tri-' is three, 'hemi-'/'semi-' is half." },
  { id: "pr-19", area: "prefixes", question: "'Tri-' at the start of a term means:", choices: ["Three", "Two", "Four", "Many"], correctAnswer: "Three", explanation: "'Tri-' means three (tricuspid = having three cusps). 'Bi-' is two, 'quadri-' is four, 'poly-' is many." },
  { id: "pr-20", area: "prefixes", question: "The prefix 'hemi-' means:", choices: ["Half", "Whole", "Double", "Between"], correctAnswer: "Half", explanation: "'Hemi-' means half (hemithorax = one half of the chest cavity). 'Semi-' also means half; 'bi-' means two." },
  { id: "pr-21", area: "prefixes", question: "'Trans-' in a medical term means:", choices: ["Across or through", "Around", "Beneath", "Before"], correctAnswer: "Across or through", explanation: "'Trans-' means across or through (transdermal = through the skin). 'Peri-' is around, 'sub-' is beneath." },
  { id: "pr-22", area: "prefixes", question: "The prefix 'epi-' means:", choices: ["Upon or over", "Under", "Within", "Away from"], correctAnswer: "Upon or over", explanation: "'Epi-' means upon or over (epidermis = the layer upon the dermis). 'Sub-' and 'hypo-' mean under." },
  { id: "pr-23", area: "prefixes", question: "'Extra-' indicates a position that is:", choices: ["Outside", "Inside", "Above", "Behind"], correctAnswer: "Outside", explanation: "'Extra-' means outside (extracellular = outside the cell). 'Intra-' means within." },
  { id: "pr-24", area: "prefixes", question: "Which prefix means 'backward' or 'behind'?", choices: ["Retro-", "Ante-", "Peri-", "Epi-"], correctAnswer: "Retro-", explanation: "'Retro-' means backward or behind (retrograde = moving backward). 'Ante-' means before or in front." },
  { id: "pr-25", area: "prefixes", question: "The prefix 'macro-' means:", choices: ["Large", "Small", "Many", "Rapid"], correctAnswer: "Large", explanation: "'Macro-' means large (macroscopic = large enough to see without a microscope). 'Micro-' means small." },
  { id: "pr-26", area: "prefixes", question: "'Micro-' in a medical term means:", choices: ["Small", "Large", "Half", "Slow"], correctAnswer: "Small", explanation: "'Micro-' means small (microscope, microorganism). 'Macro-' means large." },
  { id: "pr-27", area: "prefixes", question: "The prefix 'neo-' means:", choices: ["New", "Old", "False", "Beside"], correctAnswer: "New", explanation: "'Neo-' means new (neonatal = the newborn period). 'Pseudo-' means false, 'para-' means beside." },
  { id: "pr-28", area: "prefixes", question: "'Mal-' at the start of a term indicates something that is:", choices: ["Bad or abnormal", "Good or normal", "Doubled", "Temporary"], correctAnswer: "Bad or abnormal", explanation: "'Mal-' means bad or abnormal (malformation, malabsorption). 'Dys-' also signals difficulty or abnormality." },
  { id: "pr-29", area: "prefixes", question: "Which prefix means 'against'?", choices: ["Anti-", "Ad-", "Peri-", "Poly-"], correctAnswer: "Anti-", explanation: "'Anti-' means against (antibody, antiseptic). 'Ad-' means toward." },
  { id: "pr-30", area: "prefixes", question: "The prefix 'pseudo-' means:", choices: ["False or only apparent", "Genuine or confirmed", "Beside", "Excessive"], correctAnswer: "False or only apparent", explanation: "'Pseudo-' means false or only apparent — resembling something without actually being it (pseudopod = a 'false foot' extension of a cell). 'Para-' means beside; 'neo-' means new." },

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

  // M14 Phase 2c (audit G2): suffixes extended 9 -> 30, the third area taken to depth. Every ending
  // below is a TRUE suffix, and most are already named in an existing explanation or distractor here.
  // Four candidates were deliberately REJECTED during authoring rather than forced in: '-poiesis'
  // (meaning collides with '-genesis'), '-rrhagia' (too close to '-rrhea'), '-stenosis' (composes
  // '-osis', which this slice already teaches) and '-edema' (a standalone term, not cleanly a suffix
  // — the same class of error that put 'olig/o' in the prefix bank in Phase 2b).
  // AI-ASSISTED authoring, HUMAN-REVIEWED AND APPROVED 2026-08-07: the repository owner read all
  // 21 items and approved their suffix CLASSIFICATION, terminology meanings, answer uniqueness,
  // distractors, wording, explanations and examples — including the refined sf-18 (claustrophobia,
  // replacing photophobia, which denotes light sensitivity rather than fear), sf-27 (abnormal
  // condition, with the generic increase sense removed) and sf-29 (scoped to '-cytosis').
  // `CLAUDE.md` requires AI-generated material to stay labelled, so the authoring method is
  // recorded here permanently — the approval is what changed, not the provenance.
  { id: "sf-10", area: "suffixes", question: "A term ending in '-otomy' describes:", choices: ["Cutting into (incision)", "Surgical removal", "A new opening", "Visual examination"], correctAnswer: "Cutting into (incision)", explanation: "'-otomy' means cutting into, an incision (tracheotomy). '-ectomy' is removal; '-ostomy' is creating a new opening." },
  { id: "sf-11", area: "suffixes", question: "The suffix '-ostomy' means:", choices: ["Surgical creation of an opening", "Surgical removal", "Cutting into", "Surgical repair"], correctAnswer: "Surgical creation of an opening", explanation: "'-ostomy' means surgically creating an opening (colostomy). '-ectomy' is removal; '-otomy' is cutting into." },
  { id: "sf-12", area: "suffixes", question: "A term ending in '-uria' describes a condition involving:", choices: ["Urine", "Sweat", "Saliva", "Tears"], correctAnswer: "Urine", explanation: "'-uria' names a urine condition (polyuria = excessive urination). '-emia' names a blood condition." },
  { id: "sf-13", area: "suffixes", question: "The suffix '-graphy' means:", choices: ["Process of recording", "The finished record", "Visual examination", "Measurement"], correctAnswer: "Process of recording", explanation: "'-graphy' is the PROCESS of recording (radiography). The finished record itself is '-gram'." },
  { id: "sf-14", area: "suffixes", question: "'-gram' at the end of a word means:", choices: ["The record or image produced", "The process of recording", "The instrument used", "Visual examination"], correctAnswer: "The record or image produced", explanation: "'-gram' is the record or image itself (electrocardiogram). '-graphy' is the process of making it; '-graph' often names the instrument." },
  { id: "sf-15", area: "suffixes", question: "The suffix '-sclerosis' means:", choices: ["Hardening", "Softening", "Swelling", "Narrowing"], correctAnswer: "Hardening", explanation: "'-sclerosis' means hardening (arteriosclerosis = hardening of the arteries). '-malacia' means softening." },
  { id: "sf-16", area: "suffixes", question: "A term ending in '-malacia' describes:", choices: ["Softening", "Hardening", "Enlargement", "Inflammation"], correctAnswer: "Softening", explanation: "'-malacia' means softening (osteomalacia = softening of bone). Its opposite, '-sclerosis', means hardening." },
  { id: "sf-17", area: "suffixes", question: "The suffix '-rrhea' indicates:", choices: ["Flow or discharge", "Bursting or rupture", "Suturing", "Narrowing"], correctAnswer: "Flow or discharge", explanation: "'-rrhea' means flow or discharge (rhinorrhea = nasal discharge). '-rrhaphy' means suturing." },
  { id: "sf-18", area: "suffixes", question: "Which suffix means 'fear of'?", choices: ["-phobia", "-philia", "-mania", "-pathy"], correctAnswer: "-phobia", explanation: "'-phobia' means an abnormal or persistent fear (claustrophobia = fear of enclosed spaces). '-philia' is attraction to, '-mania' is excessive preoccupation, '-pathy' is disease." },
  { id: "sf-19", area: "suffixes", question: "The suffix '-plegia' means:", choices: ["Paralysis", "Weakness", "Pain", "Spasm"], correctAnswer: "Paralysis", explanation: "'-plegia' means paralysis (hemiplegia = paralysis of one side of the body). '-asthenia' means weakness." },
  { id: "sf-20", area: "suffixes", question: "A term ending in '-genesis' refers to:", choices: ["Formation or origin", "Destruction", "Measurement", "Hardening"], correctAnswer: "Formation or origin", explanation: "'-genesis' means formation or origin (osteogenesis = bone formation). '-lysis' means breakdown." },
  { id: "sf-21", area: "suffixes", question: "The suffix '-centesis' describes:", choices: ["Surgical puncture to withdraw fluid", "Surgical fixation", "Crushing", "Suturing"], correctAnswer: "Surgical puncture to withdraw fluid", explanation: "'-centesis' is a surgical puncture to withdraw fluid (thoracentesis). '-pexy' is fixation; '-tripsy' is crushing." },
  { id: "sf-22", area: "suffixes", question: "'-pexy' at the end of a term means:", choices: ["Surgical fixation", "Surgical puncture", "Surgical removal", "Visual examination"], correctAnswer: "Surgical fixation", explanation: "'-pexy' means surgical fixation — securing a structure in place (nephropexy). '-centesis' is puncture." },
  { id: "sf-23", area: "suffixes", question: "The suffix '-tripsy' means:", choices: ["Crushing", "Cutting", "Stretching", "Recording"], correctAnswer: "Crushing", explanation: "'-tripsy' means crushing (lithotripsy = crushing a stone). '-otomy' is cutting into." },
  { id: "sf-24", area: "suffixes", question: "A term ending in '-asthenia' describes:", choices: ["Weakness", "Paralysis", "Pain", "Swelling"], correctAnswer: "Weakness", explanation: "'-asthenia' means weakness (myasthenia = muscle weakness). '-plegia' means paralysis." },
  { id: "sf-25", area: "suffixes", question: "The suffix '-metry' means:", choices: ["Process of measuring", "Process of recording", "Visual examination", "Study of"], correctAnswer: "Process of measuring", explanation: "'-metry' is the process of measuring (spirometry = measuring breathing). '-graphy' is recording; '-scopy' is viewing." },
  { id: "sf-26", area: "suffixes", question: "Which suffix names a specialist?", choices: ["-logist", "-ology", "-pathy", "-osis"], correctAnswer: "-logist", explanation: "'-logist' names the specialist (cardiologist). '-ology' names the field of study itself." },
  { id: "sf-27", area: "suffixes", question: "The suffix '-osis' means:", choices: ["Abnormal condition", "Inflammation", "Surgical removal", "Enlargement"], correctAnswer: "Abnormal condition", explanation: "'-osis' means an abnormal condition (dermatosis = an abnormal condition of the skin). '-itis' names inflammation specifically." },
  { id: "sf-28", area: "suffixes", question: "A term ending in '-oma' refers to a:", choices: ["Tumor or mass", "Blood condition", "Narrowing", "Deficiency"], correctAnswer: "Tumor or mass", explanation: "'-oma' means a tumor or mass (lipoma = a fatty mass). '-emia' names a blood condition." },
  { id: "sf-29", area: "suffixes", question: "The suffix '-penia' indicates:", choices: ["Deficiency", "Excess", "Hardening", "Formation"], correctAnswer: "Deficiency", explanation: "'-penia' means a deficiency or too few (leukopenia = too few white blood cells). Its counterpart for an abnormally increased cell count is '-cytosis', as in leukocytosis." },
  { id: "sf-30", area: "suffixes", question: "The suffix '-lysis' means:", choices: ["Breakdown or destruction", "Formation", "Fixation", "Enlargement"], correctAnswer: "Breakdown or destruction", explanation: "'-lysis' means breakdown, destruction or separation (hemolysis = breakdown of red blood cells). '-genesis' means formation." },

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

  // M14 Phase 2d (audit G2): anatomy extended 9 -> 30, the fourth area taken to depth.
  // AUTHORING BOUNDARY (Option A, approved): every item below tests a STRUCTURE, its LOCATION, a
  // REGION, a CAVITY, a PLANE, a DIRECTIONAL term or a structural RELATIONSHIP. None has a
  // physiological function, process, disease or procedure as its answer — that material belongs to
  // the `physiology` and `pathophysiology` areas and is reserved for Phases 2e and 2f. Four legacy
  // items (an-01, an-02, an-05, an-09) are function-flavoured; they are deliberately left unchanged.
  // AI-ASSISTED authoring, HUMAN-REVIEWED AND APPROVED 2026-08-07: the repository owner read all
  // 21 items and approved their anatomical accuracy, the anatomy/physiology boundary, answer
  // uniqueness, distractors, wording and explanations — including the refined an-24 (cerebellum
  // inferior and posterior to the cerebrum, stated in anatomical position), an-25 ('Carotid
  // artery' as the complete distractor name) and an-30 (largest muscle scoped to BY MASS, with
  // sartorius distinguished as the longest). Option A remains the governing boundary.
  // `CLAUDE.md` requires AI-generated material to stay labelled, so the authoring method is
  // recorded here permanently — the approval is what changed, not the provenance.
  { id: "an-10", area: "anatomy", question: "In anatomical terms, 'superior' means:", choices: ["Toward the head", "Toward the feet", "Toward the front", "Toward the midline"], correctAnswer: "Toward the head", explanation: "'Superior' means above, toward the head. Its opposite, 'inferior', means below, toward the feet." },
  { id: "an-11", area: "anatomy", question: "A structure described as 'distal' is:", choices: ["Farther from the point of attachment", "Nearer the point of attachment", "Above the trunk", "Beneath the skin"], correctAnswer: "Farther from the point of attachment", explanation: "'Distal' means farther from the trunk or point of attachment — the hand is distal to the elbow. 'Proximal' means nearer to it." },
  { id: "an-12", area: "anatomy", question: "The term 'anterior' refers to a position:", choices: ["Toward the front of the body", "Toward the back of the body", "Above the waist", "Closest to the midline"], correctAnswer: "Toward the front of the body", explanation: "'Anterior' (ventral) means toward the front. 'Posterior' (dorsal) means toward the back." },
  { id: "an-13", area: "anatomy", question: "A structure that is 'medial' lies:", choices: ["Toward the midline of the body", "Away from the midline", "Nearer the surface", "Toward the feet"], correctAnswer: "Toward the midline of the body", explanation: "'Medial' means toward the body's midline; 'lateral' means away from it. The nose is medial to the eyes." },
  { id: "an-14", area: "anatomy", question: "A structure described as 'superficial' is:", choices: ["Near the body surface", "Deep within the body", "Toward the head", "Farther from the trunk"], correctAnswer: "Near the body surface", explanation: "'Superficial' means near the surface; 'deep' means farther inside. The skin is superficial to the muscles." },
  { id: "an-15", area: "anatomy", question: "The cranial cavity contains the:", choices: ["Brain", "Heart", "Lungs", "Liver"], correctAnswer: "Brain", explanation: "The cranial cavity, formed by the skull, houses the brain. The heart and lungs sit in the thoracic cavity." },
  { id: "an-16", area: "anatomy", question: "The diaphragm forms the boundary between which two cavities?", choices: ["Thoracic and abdominal", "Cranial and spinal", "Pelvic and abdominal", "Thoracic and cranial"], correctAnswer: "Thoracic and abdominal", explanation: "The diaphragm separates the thoracic cavity above from the abdominal cavity below." },
  { id: "an-17", area: "anatomy", question: "The urinary bladder is located in the:", choices: ["Pelvic cavity", "Thoracic cavity", "Cranial cavity", "Spinal cavity"], correctAnswer: "Pelvic cavity", explanation: "The urinary bladder sits in the pelvic cavity, the lower portion of the abdominopelvic cavity." },
  { id: "an-18", area: "anatomy", question: "A sagittal plane divides the body into:", choices: ["Left and right portions", "Front and back portions", "Upper and lower portions", "Inner and outer layers"], correctAnswer: "Left and right portions", explanation: "A sagittal plane divides the body into left and right. A frontal (coronal) plane divides front from back; a transverse plane divides upper from lower." },
  { id: "an-19", area: "anatomy", question: "The wall of tissue separating the right and left sides of the heart is the:", choices: ["Septum", "Valve", "Pericardium", "Atrium"], correctAnswer: "Septum", explanation: "The septum is the muscular wall dividing the right and left sides of the heart. The pericardium is the sac surrounding it." },
  { id: "an-20", area: "anatomy", question: "The longest bone in the human body is the:", choices: ["Femur", "Humerus", "Tibia", "Sternum"], correctAnswer: "Femur", explanation: "The femur, the thigh bone, is the longest and strongest bone in the body." },
  { id: "an-21", area: "anatomy", question: "The bones that form the spinal column are the:", choices: ["Vertebrae", "Ribs", "Clavicles", "Phalanges"], correctAnswer: "Vertebrae", explanation: "The vertebrae stack to form the spinal column, which encloses the spinal cord." },
  { id: "an-22", area: "anatomy", question: "The carpal bones are found in the:", choices: ["Wrist", "Ankle", "Shoulder", "Knee"], correctAnswer: "Wrist", explanation: "The carpals are the small bones of the wrist. The tarsals are the corresponding bones of the ankle." },
  { id: "an-23", area: "anatomy", question: "The brain and spinal cord together make up the:", choices: ["Central nervous system", "Peripheral nervous system", "Endocrine system", "Lymphatic system"], correctAnswer: "Central nervous system", explanation: "The central nervous system is the brain plus the spinal cord. Nerves outside them form the peripheral nervous system." },
  { id: "an-24", area: "anatomy", question: "In anatomical position, the cerebellum lies:", choices: ["Inferior and posterior to the cerebrum", "Superior to the cerebrum", "Anterior to the cerebrum", "Within the spinal canal"], correctAnswer: "Inferior and posterior to the cerebrum", explanation: "The cerebellum lies inferior to the cerebrum and posterior to most of it, occupying the lower rear portion of the cranial cavity." },
  { id: "an-25", area: "anatomy", question: "The largest artery in the body is the:", choices: ["Aorta", "Carotid artery", "Femoral artery", "Pulmonary vein"], correctAnswer: "Aorta", explanation: "The aorta is the body's largest artery, leaving the left ventricle. The pulmonary vein is not an artery at all." },
  { id: "an-26", area: "anatomy", question: "The smallest blood vessels, connecting arteries to veins, are the:", choices: ["Capillaries", "Arterioles", "Venules", "Valves"], correctAnswer: "Capillaries", explanation: "Capillaries are the smallest vessels and form the bridge between arteries and veins. Arterioles and venules are the small vessels leading into and out of them." },
  { id: "an-27", area: "anatomy", question: "The esophagus connects the pharynx to the:", choices: ["Stomach", "Small intestine", "Trachea", "Liver"], correctAnswer: "Stomach", explanation: "The esophagus runs from the pharynx to the stomach. The trachea is the separate airway lying in front of it." },
  { id: "an-28", area: "anatomy", question: "The appendix is attached to which structure?", choices: ["Large intestine", "Small intestine", "Stomach", "Gallbladder"], correctAnswer: "Large intestine", explanation: "The appendix is a small pouch attached to the cecum, the first part of the large intestine." },
  { id: "an-29", area: "anatomy", question: "Which tube connects each kidney to the urinary bladder?", choices: ["Ureter", "Urethra", "Nephron", "Renal artery"], correctAnswer: "Ureter", explanation: "A ureter runs from each kidney to the bladder. The urethra is the separate tube leading from the bladder to the outside." },
  { id: "an-30", area: "anatomy", question: "By mass, the largest muscle in the human body is the:", choices: ["Gluteus maximus", "Biceps brachii", "Diaphragm", "Sartorius"], correctAnswer: "Gluteus maximus", explanation: "By mass the gluteus maximus, in the buttock, is the body's largest muscle. The sartorius is the LONGEST muscle, which is a different measure." },

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

  // M14 Phase 2e (audit G2): physiology extended 9 -> 30, the fifth area taken to depth.
  // AUTHORING BOUNDARY (the approved Phase 2d boundary, applied from the physiology side): every
  // item below tests a NORMAL function, mechanism, process or regulatory response. None asks for a
  // structure's location (that is `anatomy`), a disease, a disease mechanism or a clinical
  // management decision (that is `pathophysiology`, reserved for Phase 2f), and none is a bare
  // word-part or term-definition recall item (those are `word-roots`, `prefixes` and `suffixes`).
  // Deliberately absent: any third insulin/glucose item — ph-02 and ph-08 already overlap there.
  // AI-ASSISTED authoring, HUMAN-REVIEWED AND APPROVED 2026-08-07: the repository owner read all
  // 21 items and approved their physiological accuracy, the physiology/anatomy/pathophysiology
  // boundary, answer uniqueness, distractors, wording, explanations and mechanism precision —
  // including the refined ph-10 (systole scoped to the ventricles), ph-11 (impulse spreading
  // through the atria before the AV node), ph-13 (stroke volume may also rise in exercise),
  // ph-15 (partial-pressure gradient), ph-16 (healthy person at rest), ph-17 (small intestine
  // completing most digestion, with many lipids entering lymphatic lacteals), ph-20 (cells and
  // most large proteins retained, then selective tubular reabsorption/secretion), ph-24 (typical
  // chemical synapse, synaptic cleft), ph-25 (no simplistic 'opposite' claim) and ph-26 (calcium
  // binding troponin). Also approved as reviewed judgments: ph-14 is physiology, not anatomy;
  // the ph-17/ph-19 overlap is acceptable reinforcement. `CLAUDE.md` requires AI-generated
  // material to stay labelled, so the authoring method is recorded here permanently — the
  // approval is what changed, not the provenance.
  { id: "ph-10", area: "physiology", question: "During ventricular systole, the ventricles normally:", choices: ["Contract and eject blood into the aorta and pulmonary artery", "Relax and fill with returning blood", "Stop all electrical activity briefly", "Push blood backward into the atria"], correctAnswer: "Contract and eject blood into the aorta and pulmonary artery", explanation: "Ventricular systole is the ventricles' contraction phase: they squeeze and eject blood into the aorta and pulmonary artery. Ventricular filling happens later, during ventricular diastole." },
  { id: "ph-11", area: "physiology", question: "After the SA node initiates the impulse and it spreads through the atria, the impulse next reaches the:", choices: ["AV node", "Purkinje fibers", "Left bundle branch", "Aorta"], correctAnswer: "AV node", explanation: "The normal sequence is SA node, conduction across the atria, AV node, bundle of His, bundle branches, then Purkinje fibers. The aorta is a blood vessel and carries no impulse." },
  { id: "ph-12", area: "physiology", question: "The normal function of the heart valves during the cardiac cycle is to:", choices: ["Keep blood moving in one direction", "Generate the electrical impulse", "Pump blood out of the heart", "Filter waste from the blood"], correctAnswer: "Keep blood moving in one direction", explanation: "Valves open and close passively with pressure changes so blood cannot flow backward. The muscle does the pumping and the SA node generates the impulse." },
  { id: "ph-13", area: "physiology", question: "Cardiac output is heart rate multiplied by stroke volume. If heart rate rises while stroke volume stays the same, cardiac output normally:", choices: ["Increases", "Decreases", "Stays the same", "Depends only on blood pressure"], correctAnswer: "Increases", explanation: "With one factor rising and the other held constant, the product rises. During real exercise heart rate rises and stroke volume often rises as well, so either or both can raise cardiac output." },
  { id: "ph-14", area: "physiology", question: "During normal quiet inhalation, the diaphragm:", choices: ["Contracts and flattens downward, enlarging the chest cavity", "Relaxes and domes upward, shrinking the chest cavity", "Stays still while the ribs drop", "Contracts and pushes upward against the lungs"], correctAnswer: "Contracts and flattens downward, enlarging the chest cavity", explanation: "Diaphragm contraction increases thoracic volume, lowering pressure so air flows in. Quiet exhalation is passive: the diaphragm relaxes and domes back up." },
  { id: "ph-15", area: "physiology", question: "In the alveoli, oxygen normally moves into the blood by:", choices: ["Diffusion down a partial-pressure gradient", "Active transport requiring ATP", "Filtration under arterial pressure", "Peristaltic pumping"], correctAnswer: "Diffusion down a partial-pressure gradient", explanation: "Alveolar oxygen is at a higher partial pressure than the oxygen in deoxygenated pulmonary capillary blood, so oxygen diffuses into the blood. Carbon dioxide diffuses the opposite way, down its own partial-pressure gradient." },
  { id: "ph-16", area: "physiology", question: "In a healthy person at rest, which rise in the blood provides the main chemical stimulus for increasing ventilation?", choices: ["Carbon dioxide", "Calcium", "Glucose", "Protein"], correctAnswer: "Carbon dioxide", explanation: "Rising arterial carbon dioxide raises hydrogen ion concentration and lowers pH, which strongly stimulates the chemoreceptors that drive ventilation." },
  { id: "ph-17", area: "physiology", question: "The primary normal function of the small intestine is to:", choices: ["Complete most digestion and absorb most nutrients", "Store bile between meals", "Compact waste for elimination", "Produce the acid that begins protein digestion"], correctAnswer: "Complete most digestion and absorb most nutrients", explanation: "Most chemical digestion is completed and most nutrients are absorbed in the small intestine: sugars and amino acids pass into the blood, while many absorbed lipids first enter lymphatic lacteals. The large intestine absorbs the remaining water and electrolytes and compacts waste." },
  { id: "ph-18", area: "physiology", question: "The normal role of bile in digestion is to:", choices: ["Emulsify fats so enzymes can break them down", "Break proteins into amino acids", "Neutralize nutrients before they are absorbed", "Absorb vitamins directly into cells"], correctAnswer: "Emulsify fats so enzymes can break them down", explanation: "Bile is not an enzyme. It breaks large fat globules into small droplets, giving lipase far more surface area to work on." },
  { id: "ph-19", area: "physiology", question: "As material passes through the large intestine, the body normally:", choices: ["Reabsorbs water and electrolytes", "Absorbs most of the protein and fat", "Adds most of the digestive enzymes", "Produces bile for the next meal"], correctAnswer: "Reabsorbs water and electrolytes", explanation: "The large intestine recovers water and electrolytes and compacts the remaining waste. Protein and fat absorption happen earlier, in the small intestine." },
  { id: "ph-20", area: "physiology", question: "In normal kidney function, filtration of the blood is followed by:", choices: ["Reabsorption of water and needed substances back into the blood", "Immediate excretion of everything that was filtered", "Secretion of bile into the filtrate", "Production of red blood cells in the filtrate"], correctAnswer: "Reabsorption of water and needed substances back into the blood", explanation: "Glomerular filtration passes water and many small solutes into the filtrate while normally holding back blood cells and most large proteins. The tubules then selectively reabsorb water and useful solutes into the blood, and can also secrete further substances into the tubule before urine is formed." },
  { id: "ph-21", area: "physiology", question: "Antidiuretic hormone (ADH) normally acts on the kidney to:", choices: ["Increase water reabsorption, concentrating the urine", "Increase water loss, diluting the urine", "Raise the blood glucose level", "Speed up red blood cell production"], correctAnswer: "Increase water reabsorption, concentrating the urine", explanation: "ADH is released when the body needs to conserve water; it makes the collecting ducts more permeable so more water returns to the blood and less is lost as urine." },
  { id: "ph-22", area: "physiology", question: "Besides removing metabolic waste, the kidneys normally help maintain the body's:", choices: ["Fluid, electrolyte and pH balance", "Core temperature set point", "Antibody specificity", "Bile storage capacity"], correctAnswer: "Fluid, electrolyte and pH balance", explanation: "The kidneys adjust how much water, sodium, potassium and hydrogen ion is kept or excreted, which is central to homeostasis." },
  { id: "ph-23", area: "physiology", question: "In a normal withdrawal reflex, the protective movement happens:", choices: ["Through the spinal cord, before the brain processes the sensation", "Only after the brain has consciously decided to move", "In the muscle itself, with no nerve signal involved", "Through hormones released into the bloodstream"], correctAnswer: "Through the spinal cord, before the brain processes the sensation", explanation: "A reflex arc routes sensory input to a motor response at the spinal cord. The signal also travels to the brain, but the movement has already begun." },
  { id: "ph-24", area: "physiology", question: "At a typical chemical synapse, a nerve signal is passed to the next cell when the sending neuron:", choices: ["Releases a neurotransmitter into the synaptic cleft", "Touches the next cell directly", "Sends part of its cell body across", "Pumps blood toward the next cell"], correctAnswer: "Releases a neurotransmitter into the synaptic cleft", explanation: "At a chemical synapse the two cells are separated by a synaptic cleft. The arriving impulse makes the presynaptic neuron release neurotransmitter, which crosses the cleft and binds receptors on the postsynaptic cell, transmitting or modulating the signal." },
  { id: "ph-25", area: "physiology", question: "Sympathetic nervous activity normally prepares the body for exertion by:", choices: ["Raising heart rate and shifting blood toward skeletal muscle", "Slowing the heart and increasing digestive activity", "Producing antibodies against infection", "Increasing urine production"], correctAnswer: "Raising heart rate and shifting blood toward skeletal muscle", explanation: "Sympathetic activity supports exertion and fight-or-flight responses, such as a faster heart rate and blood flow redirected toward skeletal muscle. Parasympathetic activity generally supports rest-and-digest functions, including slowing the heart rate and promoting digestion." },
  { id: "ph-26", area: "physiology", question: "After a skeletal muscle fiber is activated, what event directly allows actin and myosin to begin cross-bridge cycling?", choices: ["Calcium binds to troponin, exposing binding sites on actin", "Lactic acid accumulates in the fiber", "The bone shortens and pulls on the muscle", "Oxygen leaves the muscle cell"], correctAnswer: "Calcium binds to troponin, exposing binding sites on actin", explanation: "A motor-neuron signal excites the fiber, calcium is released from the sarcoplasmic reticulum, and calcium binding to troponin shifts tropomyosin off the actin binding sites so myosin heads can attach and cycle." },
  { id: "ph-27", area: "physiology", question: "Thyroid hormone normally regulates the body's:", choices: ["Metabolic rate", "Blood clotting speed", "Urine color", "Antibody specificity"], correctAnswer: "Metabolic rate", explanation: "Thyroid hormone sets the pace at which cells use energy, influencing heat production, heart rate and growth." },
  { id: "ph-28", area: "physiology", question: "Compared with nerve signals, hormones normally:", choices: ["Travel in the bloodstream and act more slowly but for longer", "Travel along axons and act within milliseconds", "Act only on the gland that produced them", "Are released by contracting skeletal muscle"], correctAnswer: "Travel in the bloodstream and act more slowly but for longer", explanation: "Endocrine signalling is chemical and blood-borne, so it is slower to start and longer lasting than the fast, targeted electrical signalling of nerves." },
  { id: "ph-29", area: "physiology", question: "When a small blood vessel is cut, the normal first response of platelets is to:", choices: ["Clump at the injury site to form a plug", "Carry extra oxygen to the wound", "Produce antibodies against the injury", "Dissolve any clot that starts to form"], correctAnswer: "Clump at the injury site to form a plug", explanation: "Platelets adhere and aggregate at the break to form a temporary plug, which the clotting cascade then reinforces with fibrin." },
  { id: "ph-30", area: "physiology", question: "The normal function of blood plasma is to:", choices: ["Carry cells, nutrients, hormones and wastes in fluid", "Bind and carry oxygen in place of hemoglobin", "Filter waste out of the blood", "Trigger muscle contraction directly"], correctAnswer: "Carry cells, nutrients, hormones and wastes in fluid", explanation: "Plasma is the liquid portion of blood, mostly water, that suspends blood cells and transports dissolved nutrients, hormones, proteins and waste. Hemoglobin inside red cells carries the oxygen." },

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

// --- Duplicate-resistant review evidence (M13E1F) --------------------------------------------------
//
// `gradeMedTermAnswers` above reports the LEARNER'S SESSION: every graded answer, counted every time
// it was submitted. That is the right number to show someone who just finished practising, and the
// wrong number to base spaced review on. Three paths turned it into fabricated evidence, all live:
//
//   ONE QUESTION.       A single correct answer is 1/1 = 100%, which cleared the 70% threshold and
//                       pushed Medical Terminology further out on the review ladder.
//   DUPLICATE INFLATION. Five distinct questions with ONE genuinely correct, plus twelve repeats of
//                       that correct id, tallies 13/17 = 76% — a pass off one right answer.
//   FOCUSED PADDING.    `buildMedTermSession` repeats items once a focused count exceeds an area's
//                       nine-question pool, and the UI offers 20/30/50. Every repeat arrives after
//                       the learner has already seen the answer and explanation.
//
// So review eligibility reads from an EVIDENCE SET: at most one entry per valid question id, using
// the FIRST answer submitted for that id, and each covered area counted once.
//
// WHY BREADTH, NOT JUST COUNT. Unlike the Debate and DECA drills — where each area maps to its own
// narrow skill — every MedTerm session writes to ONE aggregate skill named for the whole Medical
// Terminology event. Nine word-root questions say nothing about physiology, so a review interval on
// the event slug must not be earned from a single corner of it. Hence a breadth requirement as well
// as a count: a focused single-area session is real practice, but it can never be review evidence.
//
// THIS SKILL REMAINS REVIEW-ONLY. No MasteryProgress is written here and none should be: the slug
// names an entire event, half the bank sits in areas its description does not claim, and a 50-item
// session consumes 50 of 54 questions — so "survived spaced reassessment" could only ever mean
// "re-recognised items already seen". Recognition of a term's gloss is not mastery of the event.
//
// NOT tamper-proof: the session route still returns `correctAnswer` to the browser and nothing binds
// a submission to the served set. Session binding is deliberately out of scope here.

/** Distinct valid questions required in ONE submission before review may be attempted. */
export const HOSA_MEDTERM_REQUIRED_UNIQUE = 10;
/** Distinct bank areas those questions must span. */
export const HOSA_MEDTERM_REQUIRED_AREAS = 3;

export type MedTermEvidenceStatus = "insufficient-evidence" | "below-threshold" | "passing";

export type MedTermEvidence = {
  uniqueTotal: number;
  uniqueCorrect: number;
  coveredAreas: MedTermArea[];
  coveredAreaCount: number;
  requiredUnique: number;
  requiredAreas: number;
  /** Rounded for display only. Pass/fail uses the exact ratio below, never this. */
  evidenceScore: number;
  evidenceStatus: MedTermEvidenceStatus;
  passed: boolean;
  /** Weak areas derived from the evidence set — only areas actually covered can appear. */
  weakAreas: Array<{ area: MedTermArea; label: string; missed: number; total: number }>;
};

/** Build the review-evidence set for a submission. Pure; deterministic; order-independent. */
export function buildMedTermEvidence(answers: MedTermAnswer[]): MedTermEvidence {
  const byId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));

  // First occurrence per valid id wins; unknown ids and every repeat are dropped here.
  const firstById = new Map<string, { question: MedTermQuestion; selected: string }>();
  for (const answer of answers) {
    const question = byId.get(answer.id);
    if (!question) continue;
    if (firstById.has(answer.id)) continue;
    firstById.set(answer.id, { question, selected: answer.selected });
  }

  const tally = new Map<MedTermArea, { total: number; missed: number }>();
  let uniqueTotal = 0;
  let uniqueCorrect = 0;
  for (const { question, selected } of firstById.values()) {
    // Attribution is by the question's OWN area, never by whatever area the session requested.
    const correct = selected === question.correctAnswer;
    uniqueTotal += 1;
    if (correct) uniqueCorrect += 1;
    const bucket = tally.get(question.area) ?? { total: 0, missed: 0 };
    bucket.total += 1;
    if (!correct) bucket.missed += 1;
    tally.set(question.area, bucket);
  }

  // Bank order, so the list is stable rather than submission-order dependent.
  const coveredAreas = MEDTERM_AREAS.map((a) => a.id).filter((id) => tally.has(id));
  const coveredAreaCount = coveredAreas.length;

  const evidenceScore = uniqueTotal > 0 ? Math.round((uniqueCorrect / uniqueTotal) * 100) : 0;
  // EXACT ratio, never the rounded percent: 16 of 23 rounds to 70 but is 69.57%, and a rounded 70
  // must not buy a pass the learner did not earn.
  const meetsThreshold = uniqueTotal > 0 && uniqueCorrect * 100 >= PASS_THRESHOLD * uniqueTotal;
  const hasEnoughEvidence = uniqueTotal >= HOSA_MEDTERM_REQUIRED_UNIQUE && coveredAreaCount >= HOSA_MEDTERM_REQUIRED_AREAS;
  const evidenceStatus: MedTermEvidenceStatus = !hasEnoughEvidence
    ? "insufficient-evidence"
    : meetsThreshold
      ? "passing"
      : "below-threshold";

  const weakAreas = Array.from(tally.entries())
    .filter(([, bucket]) => bucket.missed > 0)
    .map(([area, bucket]) => ({
      area,
      label: MEDTERM_AREAS.find((a) => a.id === area)?.label ?? area,
      missed: bucket.missed,
      total: bucket.total
    }))
    .sort((a, b) => b.missed - a.missed);

  return {
    uniqueTotal,
    uniqueCorrect,
    coveredAreas,
    coveredAreaCount,
    requiredUnique: HOSA_MEDTERM_REQUIRED_UNIQUE,
    requiredAreas: HOSA_MEDTERM_REQUIRED_AREAS,
    evidenceScore,
    evidenceStatus,
    passed: evidenceStatus === "passing",
    weakAreas
  };
}

/**
 * What to send to spaced review for this submission, or `null` meaning DO NOT CALL it.
 *
 * `null` is not "record a zero" — it is the absence of a call, so a short or narrow submission
 * cannot advance the review ladder, cannot reset it, and cannot alter a due review it never earned
 * the right to answer.
 */
export function medTermPersistenceRequest(evidence: MedTermEvidence): { scorePercent: number; passed: boolean } | null {
  if (evidence.evidenceStatus === "insufficient-evidence") return null;
  return { scorePercent: evidence.evidenceScore, passed: evidence.passed };
}
