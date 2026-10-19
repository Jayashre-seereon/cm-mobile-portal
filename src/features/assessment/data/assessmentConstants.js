export const ASSESSMENT_DOMAINS = [
  {
    id: "profiling",
    sectionIndex: 0,
    code: "profiling",
    title: "Career Planning Track / Personal Profiling",
    subtitle: "Career Readiness & Personal Profiling",
    shortCode: "PROFILING",
    icon: "🎯",
    questionCount: 16,
    type: "profiling",
    estimatedMinutes: 4,
    color: "#0f766e",
    gradient: "from-teal-600 to-emerald-700",
    bgLight: "bg-teal-50",
    borderLight: "border-teal-200",
    textTone: "text-teal-700",
    description: "Evaluates where you are on your career planning journey, your self-awareness, career exploration, and readiness.",
    facets: [
      { code: "SA", name: "About Me", description: "Self-awareness, understanding strengths, interests and preferences" },
      { code: "CE", name: "Knowing About Careers", description: "Career exploration, research and discovering options" },
      { code: "DC", name: "Making a Choice", description: "Decision making, clarity and consistency of career focus" },
      { code: "PP", name: "Knowing the Path", description: "Planning and preparation, subjects, exams and milestones" },
      { code: "CO", name: "Feeling Sure", description: "Commitment and confidence to pursue your goals" },
      { code: "SP", name: "Where Am I Right Now?", description: "Single-choice career readiness stage selection" },
    ],
  },
  {
    id: "interest",
    sectionIndex: 1,
    code: "interest",
    title: "Interest Assessment",
    subtitle: "Holland RIASEC Model",
    shortCode: "RIASEC",
    icon: "🧭",
    questionCount: 30,
    type: "likert",
    estimatedMinutes: 8,
    color: "#e11d48",
    gradient: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50",
    borderLight: "border-rose-200",
    textTone: "text-rose-700",
    description: "Evaluates your natural interests across Realistic, Investigative, Artistic, Social, Enterprising, and Conventional activity domains.",
    facets: [
      { code: "R", name: "Realistic", description: "Practical, hands-on, physical, mechanical" },
      { code: "I", name: "Investigative", description: "Analytical, intellectual, scientific, exploratory" },
      { code: "A", name: "Artistic", description: "Creative, expressive, original, independent" },
      { code: "S", name: "Social", description: "Cooperative, supporting, helping, teaching" },
      { code: "E", name: "Enterprising", description: "Leadership, persuasive, competitive, ambitious" },
      { code: "C", name: "Conventional", description: "Detail-oriented, organized, structured, data-driven" },
    ],
  },
  {
    id: "personality",
    sectionIndex: 2,
    code: "personality",
    title: "Personality Assessment",
    subtitle: "Big Five / OCEAN Model",
    shortCode: "OCEAN",
    icon: "🧠",
    questionCount: 30,
    type: "likert",
    estimatedMinutes: 8,
    color: "#2563eb",
    gradient: "from-blue-600 to-indigo-600",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    textTone: "text-blue-700",
    description: "Measures core behavioral tendencies and workplace dynamics across 5 scientifically validated traits.",
    facets: [
      { code: "O", name: "Openness", description: "Curiosity, imagination, and willingness to experience new ideas" },
      { code: "Cn", name: "Conscientiousness", description: "Discipline, goal-directed behavior, reliability, and precision" },
      { code: "Ex", name: "Extraversion", description: "Sociability, energy, assertiveness, and enthusiasm" },
      { code: "Ag", name: "Agreeableness", description: "Empathy, trust, collaboration, and interpersonal harmony" },
      { code: "ES", name: "Emotional Stability", description: "Resilience, calm under pressure, and emotional composure" },
    ],
  },
  {
    id: "learningStyles",
    sectionIndex: 3,
    code: "learningStyles",
    title: "Learning Styles",
    subtitle: "VARK Modality Model",
    shortCode: "VARK",
    icon: "📚",
    questionCount: 16,
    type: "likert",
    estimatedMinutes: 5,
    color: "#059669",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    textTone: "text-emerald-700",
    description: "Identifies your preferred sensory mode for absorbing, processing, and mastering new knowledge.",
    facets: [
      { code: "V", name: "Visual", description: "Diagrams, charts, flowcharts, videos, and visual illustrations" },
      { code: "A", name: "Auditory", description: "Discussions, lectures, verbal explanations, and podcasts" },
      { code: "Rd", name: "Reading/Writing", description: "Textbooks, notes, essays, lists, and written articles" },
      { code: "K", name: "Kinesthetic", description: "Hands-on practice, simulations, experiments, and active trial" },
    ],
  },
  {
    id: "values",
    sectionIndex: 4,
    code: "values",
    title: "Work Values",
    subtitle: "Schwartz Value Theory",
    shortCode: "VALUES",
    icon: "💎",
    questionCount: 21,
    type: "likert",
    estimatedMinutes: 6,
    color: "#d97706",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-200",
    textTone: "text-amber-700",
    description: "Analyzes fundamental motivational drivers and core workplace value systems.",
    facets: [
      { code: "OC", name: "Openness to Change", description: "Innovation, autonomy, novelty, and self-direction" },
      { code: "SE", name: "Self-Enhancement", description: "Achievement, influence, prestige, and financial reward" },
      { code: "CO", name: "Conservation", description: "Stability, predictability, security, and conformity" },
      { code: "ST", name: "Self-Transcendence", description: "Social welfare, helping others, ethics, and sustainability" },
    ],
  },
  {
    id: "goalOrientation",
    sectionIndex: 5,
    code: "goalOrientation",
    title: "Goal Orientation",
    subtitle: "Achievement & Focus",
    shortCode: "GOALS",
    icon: "🎯",
    questionCount: 16,
    type: "likert",
    estimatedMinutes: 4,
    color: "#7c3aed",
    gradient: "from-purple-600 to-violet-700",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-200",
    textTone: "text-purple-700",
    description: "Examines educational path preference, perseverance, and long-term vs. short-term career orientation.",
    facets: [
      { code: "ST", name: "Short Term Orientation", description: "Near-term targets, immediate feedback, and milestones" },
      { code: "LT", name: "Long Term Orientation", description: "Long-range vision, persistence, and career ambition" },
    ],
  },
  {
    id: "aptitude",
    sectionIndex: 6,
    code: "aptitude",
    title: "Aptitude & Cognitive Reasoning",
    subtitle: "6 Core Cognitive Abilities",
    shortCode: "APTITUDE",
    icon: "⚙️",
    questionCount: 50,
    type: "mcq",
    estimatedMinutes: 15,
    color: "#0891b2",
    gradient: "from-cyan-600 to-blue-700",
    bgLight: "bg-cyan-50",
    borderLight: "border-cyan-200",
    textTone: "text-cyan-700",
    description: "Tests mental agility, problem-solving, spatial, mechanical, numerical, and verbal reasoning skills.",
    facets: [
      { code: "Log", name: "Logical Reasoning", description: "Patterns, deduction, and algorithmic thinking" },
      { code: "Voc", name: "Vocabulary & Language", description: "Verbal comprehension, nuances, and vocabulary" },
      { code: "Num", name: "Numerical Ability", description: "Quantitative speed, arithmetic, and data interpretation" },
      { code: "Mech", name: "Mechanical Reasoning", description: "Physical principles, levers, gears, and motion" },
      { code: "Verb", name: "Verbal Reasoning", description: "Contextual arguments, logic statements, and inference" },
      { code: "Spat", name: "Spatial Ability", description: "3D visualization, rotations, and perspective transformation" },
    ],
  },
];

export const TOTAL_ASSESSMENT_QUESTIONS = 179;
export const ESTIMATED_DURATION_MINS = "40-50";

/**
 * Robust helper to resolve Domain Metadata regardless of backend key casing/naming
 */
export function getDomainMeta(section = {}, index = 0) {
  if (!section && index !== undefined) {
    return ASSESSMENT_DOMAINS[index] || ASSESSMENT_DOMAINS[0];
  }

  const rawKey = String(section?.code || section?.id || section?.key || section?.domain || "").toLowerCase();

  if (rawKey.includes("profil") || rawKey.includes("cri") || rawKey.includes("track")) {
    return ASSESSMENT_DOMAINS[0]; // profiling
  }
  if (rawKey.includes("interest") || rawKey.includes("riasec")) {
    return ASSESSMENT_DOMAINS[1]; // interest
  }
  if (rawKey.includes("person") || rawKey.includes("ocean") || rawKey.includes("bigfive")) {
    return ASSESSMENT_DOMAINS[2]; // personality
  }
  if (rawKey.includes("learn") || rawKey.includes("vark") || rawKey.includes("style")) {
    return ASSESSMENT_DOMAINS[3]; // learningStyles
  }
  if (rawKey.includes("val") || rawKey.includes("schwartz")) {
    return ASSESSMENT_DOMAINS[4]; // values
  }
  if (rawKey.includes("goal")) {
    return ASSESSMENT_DOMAINS[5]; // goalOrientation
  }
  if (rawKey.includes("apt") || rawKey.includes("cognit")) {
    return ASSESSMENT_DOMAINS[6]; // aptitude
  }

  // Fallback by direct search or index
  return (
    ASSESSMENT_DOMAINS.find(
      (d) =>
        d.code === section?.code ||
        d.id === section?.id ||
        d.id === section?.key ||
        d.code === section?.key
    ) ||
    ASSESSMENT_DOMAINS[index] ||
    ASSESSMENT_DOMAINS[0]
  );
}

/**
 * Section 1: Profiling 5-Point Likert Options (Not true at all -> Very true)
 */
export const PROFILING_LIKERT_OPTIONS = [
  {
    value: 1,
    label: "Not true at all",
    shortLabel: "Not true at all",
    color: "#ef4444",
    bgHover: "hover:border-rose-400 hover:bg-rose-50/70",
    activeClass: "border-rose-500 bg-rose-50 text-rose-700 shadow-sm ring-2 ring-rose-300",
  },
  {
    value: 2,
    label: "Mostly not true",
    shortLabel: "Mostly not true",
    color: "#f97316",
    bgHover: "hover:border-orange-400 hover:bg-orange-50/70",
    activeClass: "border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-2 ring-orange-300",
  },
  {
    value: 3,
    label: "Not sure",
    shortLabel: "Not sure",
    color: "#64748b",
    bgHover: "hover:border-slate-400 hover:bg-slate-50/70",
    activeClass: "border-slate-500 bg-slate-100 text-slate-800 shadow-sm ring-2 ring-slate-300",
  },
  {
    value: 4,
    label: "Mostly true",
    shortLabel: "Mostly true",
    color: "#0d9488",
    bgHover: "hover:border-teal-400 hover:bg-teal-50/70",
    activeClass: "border-teal-500 bg-teal-50 text-teal-800 shadow-sm ring-2 ring-teal-300",
  },
  {
    value: 5,
    label: "Very true",
    shortLabel: "Very true",
    color: "#16a34a",
    bgHover: "hover:border-emerald-400 hover:bg-emerald-50/70",
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-400",
  },
];

/**
 * Section 1: Item 16 (SP) Single Choice Options
 */
export const PROFILING_SP_OPTIONS = [
  {
    id: "SP_A",
    key: "A",
    optionKey: "A",
    label: "A",
    text: "I have not really thought about my career yet.",
    optionText: "I have not really thought about my career yet.",
  },
  {
    id: "SP_B",
    key: "B",
    optionKey: "B",
    label: "B",
    text: "I have thought about it, but I feel confused.",
    optionText: "I have thought about it, but I feel confused.",
  },
  {
    id: "SP_C",
    key: "C",
    optionKey: "C",
    label: "C",
    text: "I am looking at a few options and learning more about them.",
    optionText: "I am looking at a few options and learning more about them.",
  },
  {
    id: "SP_D",
    key: "D",
    optionKey: "D",
    label: "D",
    text: "I know what I want, but I don't know the full path yet.",
    optionText: "I know what I want, but I don't know the full path yet.",
  },
  {
    id: "SP_E",
    key: "E",
    optionKey: "E",
    label: "E",
    text: "I know what I want, and I have already started working towards it.",
    optionText: "I know what I want, and I have already started working towards it.",
  },
];

/**
 * Standard 5-Point Likert Options (Sections 2-6)
 */
export const LIKERT_OPTIONS = [
  {
    value: 1,
    label: "Strongly Disagree",
    shortLabel: "Strongly Disagree",
    color: "#ef4444",
    bgHover: "hover:border-rose-400 hover:bg-rose-50/70",
    activeClass: "border-rose-500 bg-rose-50 text-rose-700 shadow-sm ring-2 ring-rose-300",
  },
  {
    value: 2,
    label: "Disagree",
    shortLabel: "Disagree",
    color: "#f97316",
    bgHover: "hover:border-orange-400 hover:bg-orange-50/70",
    activeClass: "border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-2 ring-orange-300",
  },
  {
    value: 3,
    label: "Neutral / Undecided",
    shortLabel: "Neutral",
    color: "#64748b",
    bgHover: "hover:border-slate-400 hover:bg-slate-50/70",
    activeClass: "border-slate-500 bg-slate-100 text-slate-800 shadow-sm ring-2 ring-slate-300",
  },
  {
    value: 4,
    label: "Agree",
    shortLabel: "Agree",
    color: "#0d9488",
    bgHover: "hover:border-teal-400 hover:bg-teal-50/70",
    activeClass: "border-teal-500 bg-teal-50 text-teal-800 shadow-sm ring-2 ring-teal-300",
  },
  {
    value: 5,
    label: "Strongly Agree",
    shortLabel: "Strongly Agree",
    color: "#16a34a",
    bgHover: "hover:border-emerald-400 hover:bg-emerald-50/70",
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-2 ring-emerald-400",
  },
];

export const HOLLAND_TRAIT_INFO = {
  R: { name: "Realistic", color: "#e11d48", label: "Doers", description: "Hands-on problem solvers who enjoy building, repairing, and working with tools and tangible systems." },
  I: { name: "Investigative", color: "#2563eb", label: "Thinkers", description: "Analytical, inquisitive researchers who thrive on data, logic, scientific discovery, and solving puzzles." },
  A: { name: "Artistic", color: "#8b5cf6", label: "Creators", description: "Expressive, imaginative minds who excel in design, storytelling, aesthetics, and unstructured creative problem solving." },
  S: { name: "Social", color: "#059669", label: "Helpers", description: "Empathetic, communicative individuals who find fulfillment in teaching, mentoring, healthcare, and social support." },
  E: { name: "Enterprising", color: "#d97706", label: "Persuaders", description: "Ambitious, charismatic leaders drawn to entrepreneurship, strategy, sales, management, and high-impact decisions." },
  C: { name: "Conventional", color: "#475569", label: "Organizers", description: "Systematic, detail-oriented planners who excel in structured processes, finance, data accuracy, and administration." },
};

export const SAMPLE_PROFILING_REPORT = {
  heading: "YOUR PROFILING",
  introParagraph:
    "Personal profiling is the first step in career planning. It helps you understand where you are right now on your career journey and gives you a clear path forward.",
  stageTrack: {
    title: "Current Stage of Planning",
    currentStageName: "Discovering",
    currentStageCode: "DISCOVERING",
    currentStageNo: 3,
    stages: [
      { stageNo: 1, stageCode: "LOW_AWARENESS", stageName: "Low awareness", isCurrent: false },
      { stageNo: 2, stageCode: "UNCERTAIN", stageName: "Uncertain", isCurrent: false },
      { stageNo: 3, stageCode: "DISCOVERING", stageName: "Discovering", isCurrent: true },
      { stageNo: 4, stageCode: "DECISIVE", stageName: "Decisive", isCurrent: false },
      { stageNo: 5, stageCode: "CAREER_READINESS", stageName: "Career Readiness", isCurrent: false },
    ],
  },
  riskBadge: {
    text: "Risk level: Low to Medium",
    label: "Low to Medium",
    level: 2,
    colour: "Light green",
    hexColor: "#4CAF50",
    baseRiskLevel: 2,
    isEscalated: false,
  },
  whatItMeans:
    "You know what you want to do. Now you need a clear path: which subjects, which exams, and which skills.",

  your5Areas: [
    {
      domainCode: "SA",
      domainStudentFacingName: "About Me",
      score: 83,
      stage: "Career Readiness",
      stageNo: 5,
      label: "About Me – Future-Ready",
      meaning: "You know yourself very well and can use this to choose your career.",
    },
    {
      domainCode: "CE",
      domainStudentFacingName: "Knowing About Careers",
      score: 58,
      stage: "Discovering",
      stageNo: 3,
      label: "Knowing About Careers – Exploring",
      meaning: "You are finding out about different careers.",
    },
    {
      domainCode: "DC",
      domainStudentFacingName: "Making a Choice",
      score: 83,
      stage: "Career Readiness",
      stageNo: 5,
      label: "Making a Choice – Future-Ready",
      meaning: "You are sure about your choice and it stays steady.",
    },
    {
      domainCode: "PP",
      domainStudentFacingName: "Knowing the Path",
      score: 50,
      stage: "Discovering",
      stageNo: 3,
      label: "Knowing the Path – Exploring",
      meaning: "You know some of the steps for the field you like.",
    },
    {
      domainCode: "CO",
      domainStudentFacingName: "Feeling Sure",
      score: 75,
      stage: "Decisive",
      stageNo: 4,
      label: "Feeling Sure – Clarity",
      meaning: "You feel confident about choosing your career.",
    },
  ],
  careerReadinessScore: {
    cri: 70,
    maxScore: 100,
    displayText: "Career Readiness Score: 70/100",
    criStageName: "Discovering",
  },
  notesForYou: {
    hasNotes: true,
    notes: [
      {
        flagId: "F1",
        flagName: "Decided too early",
        text: "You seem sure about your career, but you may not know enough about yourself or other options yet. Make sure this choice really matches what you like and what you are good at.",
      },
    ],
  },
};

export const SAMPLE_FALLBACK_REPORT = {
  success: true,
  resultId: "sample-preview",
  attemptId: "latest",
  hollandCode: "ICR",
  topCareerCluster: "IT & Computers",
  topCareerMatch: 91,
  report: {
    student: {
      name: "Student Candidate",
      class: "12th Grade",
      completedAt: new Date().toISOString(),
    },
    yourProfiling: SAMPLE_PROFILING_REPORT,
    hollandProfile: {
      code: "ICR",
      traits: [
        { code: "I", name: "Investigative", score: 95 },
        { code: "C", name: "Conventional", score: 88 },
        { code: "R", name: "Realistic", score: 82 },
      ],
    },
    careerClusters: {
      topCluster: {
        clusterId: 12,
        code: "ITC",
        name: "IT & Computers",
        matchPercentage: 91,
        fitI: 92,
        fitA: 94,
        fitP: 86,
        fitV: 88,
        description: "Software engineering, cloud architecture, cybersecurity, and data science.",
      },
      top5: [
        { code: "ITC", name: "IT & Computers", matchPercentage: 91, fitI: 92, fitA: 94, fitP: 86, fitV: 88 },
        { code: "SEM", name: "Science, Engineering & Mathematics", matchPercentage: 87, fitI: 90, fitA: 92, fitP: 80, fitV: 82 },
        { code: "FIN", name: "Accounts & Finance", matchPercentage: 81, fitI: 75, fitA: 88, fitP: 85, fitV: 78 },
        { code: "EMG", name: "Emerging & Niche Careers", matchPercentage: 79, fitI: 84, fitA: 80, fitP: 76, fitV: 74 },
        { code: "GOV", name: "Government & Law", matchPercentage: 73, fitI: 70, fitA: 78, fitP: 74, fitV: 72 },
      ],
    },
    domains: {
      interests: [
        { facet: "R", name: "Realistic", percentage: 82, bandLabel: "High" },
        { facet: "I", name: "Investigative", percentage: 95, bandLabel: "High" },
        { facet: "A", name: "Artistic", percentage: 35, bandLabel: "Moderate" },
        { facet: "S", name: "Social", percentage: 40, bandLabel: "Moderate" },
        { facet: "E", name: "Enterprising", percentage: 65, bandLabel: "Moderate" },
        { facet: "C", name: "Conventional", percentage: 88, bandLabel: "High" },
      ],
      personality: [
        { facet: "O", name: "Openness", percentage: 80, bandLabel: "High" },
        { facet: "Cn", name: "Conscientiousness", percentage: 92, bandLabel: "High" },
        { facet: "Ex", name: "Extraversion", percentage: 55, bandLabel: "Moderate" },
        { facet: "Ag", name: "Agreeableness", percentage: 70, bandLabel: "Moderate" },
        { facet: "ES", name: "Emotional Stability", percentage: 85, bandLabel: "High" },
      ],
      values: [
        { facet: "OC", name: "Openness to Change", percentage: 85, bandLabel: "High" },
        { facet: "SE", name: "Self-Enhancement", percentage: 75, bandLabel: "High" },
        { facet: "CO", name: "Conservation", percentage: 60, bandLabel: "Moderate" },
        { facet: "ST", name: "Self-Transcendence", percentage: 50, bandLabel: "Moderate" },
      ],
      learningStyles: [
        { facet: "V", name: "Visual", percentage: 90, bandLabel: "High" },
        { facet: "A", name: "Auditory", percentage: 60, bandLabel: "Moderate" },
        { facet: "Rd", name: "Reading/Writing", percentage: 85, bandLabel: "High" },
        { facet: "K", name: "Kinesthetic", percentage: 75, bandLabel: "High" },
      ],
      aptitudes: [
        { facet: "Log", name: "Logical Reasoning", percentage: 100, bandLabel: "High" },
        { facet: "Voc", name: "Vocabulary & Language", percentage: 83, bandLabel: "High" },
        { facet: "Num", name: "Numerical Ability", percentage: 86, bandLabel: "High" },
        { facet: "Mech", name: "Mechanical Reasoning", percentage: 83, bandLabel: "High" },
        { facet: "Verb", name: "Verbal Reasoning", percentage: 86, bandLabel: "High" },
        { facet: "Spat", name: "Spatial Ability", percentage: 100, bandLabel: "High" },
      ],
    },
  },
};
