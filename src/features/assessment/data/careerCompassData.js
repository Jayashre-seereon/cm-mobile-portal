// Career Compass Data & Interpretation Metadata
// Extracted from psychometric standard specification for Career Compass

export const CHART_COLOR = {
  red: "#9C2A1F",
  slate: "#3B5166",
  gold: "#C98A2C",
  sage: "#5C7A5E",
  plum: "#7A4866",
  steel: "#6E7075",
};

export const INTEREST_COLOR = {
  R: CHART_COLOR.red,
  I: CHART_COLOR.slate,
  A: CHART_COLOR.gold,
  S: CHART_COLOR.sage,
  E: CHART_COLOR.plum,
  C: CHART_COLOR.steel,
};

export const VALUES_COLOR = {
  OC: CHART_COLOR.gold,
  SE: CHART_COLOR.red,
  CO: CHART_COLOR.slate,
  ST: CHART_COLOR.sage,
};

export const PERSON_COLOR = {
  O: CHART_COLOR.gold,
  Cn: CHART_COLOR.slate,
  Ex: CHART_COLOR.plum,
  Ag: CHART_COLOR.sage,
  ES: CHART_COLOR.red,
};

export const VARK_COLOR = {
  V: CHART_COLOR.slate,
  A: CHART_COLOR.plum,
  Rd: CHART_COLOR.gold,
  K: CHART_COLOR.sage,
};

export function pct(x) {
  if (x === undefined || x === null || isNaN(x)) return 0;
  // If already in 0-100 range (> 1.0)
  if (x > 1.0) return Math.round(x);
  return Math.round(x * 100);
}

export function band(p) {
  return p < 40 ? "developing" : p < 70 ? "moderate" : "high";
}

export function bandColorHex(p) {
  const b = band(p);
  return b === "high" ? CHART_COLOR.red : b === "moderate" ? CHART_COLOR.gold : CHART_COLOR.steel;
}

export const CLUSTERS = [
  {
    "cluster_id": "AGR",
    "name": "Agriculture",
    "mastersheet_name": "Agriculture",
    "holland_code": "RIC",
    "weights": {
      "R": 3,
      "I": 2,
      "A": 0,
      "S": 0,
      "E": 1,
      "C": 1,
      "O": 1,
      "Cn": 3,
      "Ex": 0,
      "Ag": 1,
      "ES": 2,
      "OC": 1,
      "SE": 1,
      "CO": 2,
      "ST": 2,
      "Mech": 3,
      "Log": 2,
      "Verb": 0,
      "Spat": 1,
      "Num": 2,
      "Voc": 0
    },
    "description": "Careers that grow, produce and manage food, plants, animals and rural enterprise \u2014 from farm science to agri-business.",
    "why_fit": "You enjoy practical, hands-on work, often outdoors, and you like seeing real things grow and improve because of your effort. You combine patience and discipline with applied science.",
    "streams_and_pathways_india": "Science stream (PCB or PCM with Biology preferred) after Class 10. Pathways: B.Sc Agriculture / Horticulture / Fisheries, ICAR-AIEEA entrance, agricultural engineering, dairy & food technology.",
    "careers": [
      "Agricultural Officer",
      "Plantation Manager",
      "Agricultural Scientist",
      "Horticulturist",
      "Floriculturist",
      "Dairy Farm Manager",
      "Food Technologist",
      "Poultry Farm Manager",
      "Livestock Officer",
      "Fisheries Officer",
      "Aquaculture Officer",
      "Agricultural Engineer",
      "Irrigation Engineer",
      "Food Processing Engineer",
      "Seed Technologist",
      "Agri-Business Manager",
      "Rural Development Officer",
      "Digital Agricultural Manager",
      "Organic Farming Officer",
      "Greenhouse Manager",
      "Supply Chain Manager"
    ]
  },
  {
    "cluster_id": "ENV",
    "name": "Environment",
    "mastersheet_name": "Environment",
    "holland_code": "IRS",
    "weights": {
      "R": 2,
      "I": 3,
      "A": 0,
      "S": 1,
      "E": 0,
      "C": 1,
      "O": 3,
      "Cn": 2,
      "Ex": 0,
      "Ag": 1,
      "ES": 1,
      "OC": 2,
      "SE": 0,
      "CO": 1,
      "ST": 3,
      "Mech": 1,
      "Log": 3,
      "Verb": 2,
      "Spat": 1,
      "Num": 2,
      "Voc": 1
    },
    "description": "Careers that study, protect and restore the natural world \u2014 forests, oceans, climate, wildlife and clean energy.",
    "why_fit": "You're curious about how natural systems work and genuinely motivated to protect the planet. You like combining science, fieldwork and advocacy.",
    "streams_and_pathways_india": "Science stream (PCB/PCM). Pathways: B.Sc Environmental Science / Forestry / Marine Biology, environmental engineering, Indian Forest Service (later), renewable energy programmes.",
    "careers": [
      "Environmental Scientist",
      "Environmental Engineer",
      "Waste Management Officer",
      "Water Resource Officer/Engineer",
      "Air Quality Analyst",
      "Environmental Health Officer",
      "Marine Biologist",
      "Forest Officer",
      "Biodiversity Officer",
      "Environmental Educator",
      "Renewable Energy Officer",
      "Environmental Auditor",
      "Disaster Management Personnel",
      "Urban Planner (Environment Focus)",
      "Pollution Control Officer",
      "Soil Conservationist",
      "Natural Resource Manager",
      "Wildlife Biologist",
      "Climate Change Analyst",
      "Wildlife Conservationist"
    ]
  },
  {
    "cluster_id": "AMC",
    "name": "Arts, Media & Communication",
    "mastersheet_name": "Arts & Media & Communication",
    "holland_code": "AES",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 3,
      "S": 1,
      "E": 2,
      "C": 0,
      "O": 3,
      "Cn": 1,
      "Ex": 2,
      "Ag": 1,
      "ES": 1,
      "OC": 3,
      "SE": 2,
      "CO": 0,
      "ST": 1,
      "Mech": 0,
      "Log": 1,
      "Verb": 3,
      "Spat": 1,
      "Num": 0,
      "Voc": 3
    },
    "description": "Careers that inform, entertain and persuade through words, images, sound and screens \u2014 journalism, film, content and communication.",
    "why_fit": "You love expressing ideas and stories, you're comfortable being seen and heard, and language is one of your natural strengths.",
    "streams_and_pathways_india": "Any stream works; Humanities/Arts gives the most directly useful subjects. Pathways: B.A. Mass Communication / Journalism (CUET), film & media institutes (FTII, etc.), portfolio-building from school.",
    "careers": [
      "Journalist",
      "News Anchor",
      "Reporter",
      "News Editor/News Analyst",
      "Content Writer/Developer",
      "Script Writer",
      "Film Director/Filmmaker",
      "Film Producer",
      "Video Editor",
      "Cinematographer",
      "Photographer",
      "Photojournalist",
      "Radio Jockey (RJ)",
      "Television Anchor",
      "Actor",
      "Voice Over Artist",
      "Corporate Communication Manager",
      "Digital Marketing Specialist",
      "Web Content Manager",
      "Graphic Designer",
      "Animator/ UI/UX Designer/VFX Artist",
      "Creative Director",
      "Podcast Producer",
      "Event Anchor/Emcee",
      "Choreographer",
      "Disc Jockey",
      "Musician",
      "Podcast Host",
      "Radio Jockey",
      "Voice Artist",
      "Author",
      "Editor",
      "Travel Blogger/Vlogger",
      "Social Media Manager",
      "Interpreter",
      "Translator"
    ]
  },
  {
    "cluster_id": "FIN",
    "name": "Accounts & Finance",
    "mastersheet_name": "Accounts & Finance",
    "holland_code": "CEI",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 0,
      "S": 0,
      "E": 2,
      "C": 3,
      "O": 1,
      "Cn": 3,
      "Ex": 1,
      "Ag": 0,
      "ES": 2,
      "OC": 0,
      "SE": 2,
      "CO": 3,
      "ST": 0,
      "Mech": 0,
      "Log": 3,
      "Verb": 1,
      "Spat": 0,
      "Num": 3,
      "Voc": 1
    },
    "description": "Careers that manage, analyse and grow money \u2014 accounting, banking, investment, insurance and economics.",
    "why_fit": "You're precise with numbers, comfortable with rules and structure, and you make careful, level-headed decisions.",
    "streams_and_pathways_india": "Commerce stream with Mathematics after Class 10. Pathways: CA Foundation, B.Com / BBA (CUET), CS, CMA, actuarial science entrance, economics honours.",
    "careers": [
      "Accountant Executive",
      "Chartered Accountant (CA)",
      "Company Secretary (CS)",
      "Cost and Management Accountant (CMA)",
      "Certified Accounts professional",
      "Certified Financial Planner",
      "Certified Financial Analyst",
      "Actuary",
      "Investment Banker",
      "Banking Probationary Officer",
      "Share Market Consultant",
      "Insurance Advisor",
      "Finance Manager",
      "Economist"
    ]
  },
  {
    "cluster_id": "BIZ",
    "name": "Business & Entrepreneurship",
    "mastersheet_name": "Business and Entrepreneurship",
    "holland_code": "ECS",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 0,
      "S": 1,
      "E": 3,
      "C": 2,
      "O": 2,
      "Cn": 2,
      "Ex": 3,
      "Ag": 1,
      "ES": 2,
      "OC": 2,
      "SE": 3,
      "CO": 0,
      "ST": 0,
      "Mech": 0,
      "Log": 2,
      "Verb": 2,
      "Spat": 0,
      "Num": 2,
      "Voc": 1
    },
    "description": "Careers that build and run organisations \u2014 marketing, sales, operations, HR, startups and entrepreneurship.",
    "why_fit": "You like leading, persuading and organising people and resources, and you're energised by goals, competition and building something of your own.",
    "streams_and_pathways_india": "Commerce or any stream. Pathways: BBA (IPMAT/CUET), B.Com, entrepreneurship cells & competitions in school/college, MBA later.",
    "careers": [
      "Marketing Manager",
      "Sales Manager",
      "Human Resource (HR) Manager",
      "Office Administrator/HR Admin",
      "Operations Manager",
      "Supply Chain Manager",
      "Retail Manager",
      "E-commerce Manager",
      "Import-Export Manager",
      "Business Analyst",
      "Entrepreneur",
      "Market Research Analyst",
      "Customer Relationship Manager",
      "Real Estate Professional",
      "Brand Consultant/Strategist",
      "Startup Program/Ecosystem Manager",
      "Entrepreneur development officer"
    ]
  },
  {
    "cluster_id": "DES",
    "name": "Creative & Design",
    "mastersheet_name": "Creative & Design",
    "holland_code": "ARI",
    "weights": {
      "R": 1,
      "I": 1,
      "A": 3,
      "S": 0,
      "E": 1,
      "C": 0,
      "O": 3,
      "Cn": 1,
      "Ex": 0,
      "Ag": 1,
      "ES": 0,
      "OC": 3,
      "SE": 1,
      "CO": 0,
      "ST": 0,
      "Mech": 1,
      "Log": 1,
      "Verb": 1,
      "Spat": 3,
      "Num": 0,
      "Voc": 0
    },
    "description": "Careers that shape how things look, feel and work \u2014 graphic, fashion, product, interior, game and architectural design.",
    "why_fit": "You think visually, notice form and detail others miss, and you have a constant urge to make original things.",
    "streams_and_pathways_india": "Any stream (PCM required only for Architecture/B.Arch via NATA/JEE). Pathways: NID DAT, NIFT, UCEED/CEED, portfolio development from Class 9 onwards.",
    "careers": [
      "Visual/Graphic Designer",
      "UI/UX Designer",
      "Web Designer",
      "Product Designer",
      "Fashion Designer",
      "Textile & Apparel Designer",
      "Furniture Designer",
      "Interior Designer",
      "Jewellery Designer",
      "2D/3D Animator",
      "VFX Artist",
      "Game Designer",
      "Illustrator",
      "Motion Graphics Designer",
      "Set/Scenic Designer",
      "Exhibition Designer",
      "Packaging Designer",
      "Advertising Designer",
      "Footwear Designer",
      "Architect",
      "Draftsman/CAD technician"
    ]
  },
  {
    "cluster_id": "EDU",
    "name": "Education & Training",
    "mastersheet_name": "Education & Training",
    "holland_code": "SAI",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 1,
      "S": 3,
      "E": 1,
      "C": 1,
      "O": 2,
      "Cn": 2,
      "Ex": 2,
      "Ag": 3,
      "ES": 1,
      "OC": 0,
      "SE": 0,
      "CO": 1,
      "ST": 3,
      "Mech": 0,
      "Log": 1,
      "Verb": 3,
      "Spat": 0,
      "Num": 0,
      "Voc": 3
    },
    "description": "Careers that help others learn and grow \u2014 teaching, training, counselling and education leadership.",
    "why_fit": "You're patient, warm and a natural explainer; you feel satisfied when someone understands something because of you.",
    "streams_and_pathways_india": "Any stream \u2014 choose subjects you'd love to teach. Pathways: subject degree + B.Ed, integrated B.A./B.Sc B.Ed (ITEP), CTET/TET later, psychology for counselling routes.",
    "careers": [
      "Teacher",
      "Lecturer/Professor",
      "Special Educator",
      "Language Trainer",
      "Corporate Trainer",
      "Soft Skills Trainer",
      "Employablity Skills Trainer",
      "Technical (IT & Core) Trainer",
      "Skill Development Trainer",
      "Coaching Institute Faculty",
      "Research Scholar",
      "E Learning Developer",
      "Education Administrator",
      "Principal",
      "Training Manager",
      "Learning and Development (L&D) Manager",
      "Academic Researcher",
      "Librarian",
      "Career Counselor",
      "Study Abroad Counsellor"
    ]
  },
  {
    "cluster_id": "EMG",
    "name": "Emerging & Niche Careers",
    "mastersheet_name": "Emerging & Niche Careers",
    "holland_code": "IEA",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 1,
      "S": 0,
      "E": 2,
      "C": 0,
      "O": 3,
      "Cn": 2,
      "Ex": 1,
      "Ag": 0,
      "ES": 1,
      "OC": 3,
      "SE": 2,
      "CO": 0,
      "ST": 0,
      "Mech": 1,
      "Log": 3,
      "Verb": 1,
      "Spat": 2,
      "Num": 2,
      "Voc": 0
    },
    "description": "New-age careers at the frontier \u2014 AI, data, cybersecurity, robotics, drones, AR/VR and digital content.",
    "why_fit": "You're excited by new technology and rapid change, you teach yourself things, and you're comfortable experimenting where there's no fixed path.",
    "streams_and_pathways_india": "Science (PCM) for the engineering/tech routes; any stream for digital content routes. Pathways: JEE/CUET to CS-adjacent degrees, online certifications (start now), building projects and portfolios early.",
    "careers": [
      "Data Analyst",
      "Data Scientist",
      "Artificial Intelligence (AI) Engineer",
      "Machine Learning Engineer",
      "Blockchain Developer",
      "Cybersecurity Analyst",
      "Cloud Engineer",
      "Internet of Things (IoT) Engineer",
      "Robotics Engineer",
      "Drone Pilot",
      "Drone Technician",
      "Prompt Engineer",
      "AR/VR Designer",
      "Human AI Interaction Designer",
      "App Developer",
      "Digital Content Creator",
      "Podcaster",
      "Influencer / Content Creator",
      "SEO Specialist",
      "Renewable Energy Engineer",
      "Electric Vehicle (EV) Engineer/ Technician",
      "Scientist/Researcher",
      "Fintech Engineer/Architect",
      "Digital Payment Architect",
      "Genetic Engineer",
      "Sports Analyst",
      "Esports Player",
      "Sports & Fiteness Nutritionist",
      "Career Counselor",
      "Sports Event Manager"
    ]
  },
  {
    "cluster_id": "GOV",
    "name": "Government, Law & Public Policy",
    "mastersheet_name": "Government, Law & Public Policy",
    "holland_code": "ESC",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 0,
      "S": 2,
      "E": 2,
      "C": 3,
      "O": 1,
      "Cn": 3,
      "Ex": 1,
      "Ag": 1,
      "ES": 2,
      "OC": 0,
      "SE": 2,
      "CO": 3,
      "ST": 1,
      "Mech": 0,
      "Log": 3,
      "Verb": 3,
      "Spat": 0,
      "Num": 1,
      "Voc": 3
    },
    "description": "Careers that run the country and uphold the law \u2014 civil services, law, judiciary, policy and regulation.",
    "why_fit": "You're disciplined and dutiful, strong in language and reasoning, and you respect systems \u2014 with the ambition to serve and lead within them.",
    "streams_and_pathways_india": "Any stream; Humanities (Polity, History, Economics) aligns best. Pathways: CLAT/AILET for law after Class 12, any degree then UPSC/State PSC, policy programmes.",
    "careers": [
      "Civil Servant (IAS, IPS, IFS) / Bureaucrat",
      "BDO",
      "DEO",
      "BMC Officer",
      "Tahasildar",
      "Passport Officer",
      "Banker",
      "Rural Development Officer",
      "Cyber Crime Officer",
      "Food Safety Officer",
      "Healthy Policy Officer ( CDMO)",
      "Lawyer / Advocate",
      "Judge",
      "Public Policy Consultant",
      "Revenue Officer",
      "Tax Officer (Income Tax, GST)",
      "Customs Officer",
      "Excise Inspect",
      "Intelligence Bureau Officer",
      "CBI Officer",
      "Social Welfare Officer",
      "Labour Officer",
      "Urban Development Officer",
      "Legal Assistant",
      "NCB Officer",
      "Corporate Lawyer",
      "Intellectual Property (IP) Lawyer",
      "Intelligence Officer"
    ]
  },
  {
    "cluster_id": "HLT",
    "name": "Healthcare & Life Sciences",
    "mastersheet_name": "Healthcare & Life Sciences",
    "holland_code": "ISR",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 0,
      "S": 2,
      "E": 0,
      "C": 1,
      "O": 1,
      "Cn": 3,
      "Ex": 0,
      "Ag": 2,
      "ES": 2,
      "OC": 0,
      "SE": 1,
      "CO": 1,
      "ST": 3,
      "Mech": 0,
      "Log": 3,
      "Verb": 2,
      "Spat": 1,
      "Num": 2,
      "Voc": 1
    },
    "description": "Careers that heal and study life \u2014 medicine, nursing, pharmacy, therapy, psychology and biosciences.",
    "why_fit": "You combine scientific thinking with genuine care for people, and you stay calm and precise when it matters most.",
    "streams_and_pathways_india": "Science stream with Biology (PCB). Pathways: NEET-UG for MBBS/BDS/AYUSH, B.Sc Nursing, pharmacy (B.Pharm), allied health sciences, psychology honours.",
    "careers": [
      "Doctor (MBBS)",
      "Doctor (AYUSH)",
      "Dentist",
      "Pharmacist",
      "Nurse",
      "Allied and Para Medical Professionals",
      "Physiotherapist",
      "Medical Laboratory Technician",
      "Radiologist",
      "X-ray Technician",
      "Pathologist",
      "Microbiologist",
      "Biochemist",
      "Biotechnologist",
      "Geneticist",
      "Immunologist",
      "Epidemiologist",
      "Nutritionist",
      "Dietitian",
      "Public Health Officer",
      "Veterinary Doctor",
      "Biomedical Scientist",
      "Neuroscientist",
      "Art Therapist",
      "Pharmacologist",
      "Test Developer / Psychometrician",
      "Clinical Psychologist",
      "Organizational Psychologist",
      "Health Psychologist",
      "Counselling Psychologist",
      "Community Health Worker",
      "Speech Therapist",
      "Occupational Therapist"
    ]
  },
  {
    "cluster_id": "HSP",
    "name": "Hospitality",
    "mastersheet_name": "Hospitality",
    "holland_code": "ESC",
    "weights": {
      "R": 0,
      "I": 0,
      "A": 1,
      "S": 2,
      "E": 3,
      "C": 2,
      "O": 1,
      "Cn": 2,
      "Ex": 3,
      "Ag": 2,
      "ES": 2,
      "OC": 1,
      "SE": 2,
      "CO": 1,
      "ST": 0,
      "Mech": 0,
      "Log": 1,
      "Verb": 2,
      "Spat": 0,
      "Num": 1,
      "Voc": 2
    },
    "description": "Careers that create great experiences for guests \u2014 hotels, food, travel, aviation service and events.",
    "why_fit": "You're energetic with people, gracious under pressure, and you enjoy organising experiences others will remember.",
    "streams_and_pathways_india": "Any stream. Pathways: NCHM JEE for hotel management, culinary institutes, aviation/cabin crew training after Class 12, event management degrees.",
    "careers": [
      "Hotel/Resort Manager",
      "Restaurant/Cloud Kitchen /Catering Manager",
      "Baker",
      "Front Office/Guest Relations/Housekeeping Manager",
      "Tour/Travel Consultant",
      "Tour Guide",
      "Cabin Crew (Air Hostess/Flight Steward)",
      "Cruise Manager",
      "Bartender",
      "Butler",
      "Airline Ground Staff",
      "Culinary Artist/Chef",
      "Event Manager/Planner",
      "Wedding Planner",
      "Sports Manager",
      "Hospital Adminstrator"
    ]
  },
  {
    "cluster_id": "ITC",
    "name": "IT & Computers",
    "mastersheet_name": "IT and Computers",
    "holland_code": "ICR",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 2,
      "O": 2,
      "Cn": 3,
      "Ex": 0,
      "Ag": 0,
      "ES": 1,
      "OC": 2,
      "SE": 1,
      "CO": 1,
      "ST": 0,
      "Mech": 0,
      "Log": 3,
      "Verb": 1,
      "Spat": 2,
      "Num": 3,
      "Voc": 0
    },
    "description": "Careers that build the digital world \u2014 software, apps, data, cloud, networks and cybersecurity.",
    "why_fit": "You're a systematic problem-solver with strong logic, and you enjoy the patience and precision that building software demands.",
    "streams_and_pathways_india": "Science stream (PCM). Pathways: JEE for engineering (CSE/IT), CUET for B.Sc CS/BCA, start coding now \u2014 free resources and school olympiads count.",
    "careers": [
      "Software Developer/Engineer/Programmer",
      "Web Designer/Developer",
      "Mobile App Developer",
      "Game Designer/ Developer",
      "Data/Business Analyst",
      "Cloud/AWS/Azure Engineer",
      "Network/ System Engineer",
      "Data Scientist/Engineer",
      "AI/ML Engineer",
      "Cyber Security Analyst/ Engineer",
      "Robotics/Automation Engineer",
      "Fintech/Digital Banking Developer",
      "Prompt Engineer",
      "Generative AI Specialist",
      "Ethical Hacker",
      "IT/ Technical Support Engineer"
    ]
  },
  {
    "cluster_id": "PSF",
    "name": "Personal Services & Freelance",
    "mastersheet_name": "Personal Services/Freelance",
    "holland_code": "SEA",
    "weights": {
      "R": 1,
      "I": 0,
      "A": 2,
      "S": 2,
      "E": 2,
      "C": 0,
      "O": 2,
      "Cn": 1,
      "Ex": 2,
      "Ag": 2,
      "ES": 1,
      "OC": 2,
      "SE": 1,
      "CO": 0,
      "ST": 1,
      "Mech": 0,
      "Log": 0,
      "Verb": 2,
      "Spat": 1,
      "Num": 0,
      "Voc": 1
    },
    "description": "Careers built on personal skill and client relationships \u2014 fitness, styling, coaching, wellness, freelancing.",
    "why_fit": "You connect easily one-on-one, you have a sense of style or wellbeing you love sharing, and independence matters to you.",
    "streams_and_pathways_india": "Any stream. Pathways: certified courses (fitness, cosmetology, yoga \u2014 e.g., YCB), apprenticeships with professionals, building a client portfolio early.",
    "careers": [
      "Fashion Stylist",
      "Cosmetologist (Hair stylist/ Makeup Artist/Nail Artist)",
      "Spa/Massage Therapist",
      "Fitness/ Personal Trainer",
      "Yoga/Zumba/Aerobics Instructor",
      "Nutrition Coach",
      "Life Coach",
      "Career Coach",
      "Image Consultant",
      "Personal Assistant/Executive",
      "Fitness Trainer"
    ]
  },
  {
    "cluster_id": "SAF",
    "name": "Public Safety",
    "mastersheet_name": "Public Safety",
    "holland_code": "RSE",
    "weights": {
      "R": 3,
      "I": 0,
      "A": 0,
      "S": 2,
      "E": 1,
      "C": 1,
      "O": 0,
      "Cn": 3,
      "Ex": 1,
      "Ag": 1,
      "ES": 3,
      "OC": 0,
      "SE": 1,
      "CO": 3,
      "ST": 2,
      "Mech": 2,
      "Log": 2,
      "Verb": 1,
      "Spat": 2,
      "Num": 1,
      "Voc": 0
    },
    "description": "Careers that protect people and the nation \u2014 defence forces, police, paramilitary, rescue and security.",
    "why_fit": "You're physically driven, deeply disciplined and steady in a crisis; protecting others feels like a calling, not a job.",
    "streams_and_pathways_india": "Any stream (PCM needed for NDA Air Force/Navy). Pathways: NDA after Class 12, Agniveer entry, CDS/AFCAT after degree, state police services; start fitness preparation now.",
    "careers": [
      "Police Officer",
      "Defence Personnel (Army, Navy, Air Force)",
      "Paramilitary Personnel",
      "Agniveer",
      "Disaster Management/Recovery Officer",
      "Traffic Police",
      "Indian Coast Guard Officer",
      "Railway Safety/Protection Force (RPF) Officer",
      "Airport Security Officer",
      "Search and Rescue Officer",
      "Prison Officer / Jail Warden"
    ]
  },
  {
    "cluster_id": "SOC",
    "name": "Social Services & Nonprofit",
    "mastersheet_name": "Social Services & Nonprofit",
    "holland_code": "SEC",
    "weights": {
      "R": 0,
      "I": 1,
      "A": 0,
      "S": 3,
      "E": 1,
      "C": 1,
      "O": 1,
      "Cn": 1,
      "Ex": 2,
      "Ag": 3,
      "ES": 2,
      "OC": 0,
      "SE": 0,
      "CO": 1,
      "ST": 3,
      "Mech": 0,
      "Log": 1,
      "Verb": 2,
      "Spat": 0,
      "Num": 0,
      "Voc": 2
    },
    "description": "Careers that stand with people and communities \u2014 social work, NGOs, counselling, child & human rights, CSR.",
    "why_fit": "You feel others' difficulties deeply and you're driven by fairness; you want your work to directly improve lives.",
    "streams_and_pathways_india": "Any stream; Humanities (Sociology, Psychology) aligns best. Pathways: BSW/B.A. Social Work, psychology, development studies; volunteer with local NGOs from school.",
    "careers": [
      "Social Worker",
      "Community Development/Enagagement Officer",
      "Block Program Managers",
      "NGO Program Coordinator/ Manager (Nonprofit)",
      "Child Welfare/Protection/Rights Officer",
      "Women Welfare/Protection/Rights Officer",
      "Rehabilitation Officer/Worker",
      "Human Rights Officer",
      "Waste Management Coordinator",
      "Rural Development Officer",
      "Disability Support Worker",
      "Education Program Officer",
      "Mental Health Counsellor",
      "Adoption Counselor",
      "Substance Abuse Counselor",
      "Shelter Homes Manager",
      "Livelihood Development Officer",
      "Corporate Social Responsibility (CSR) Officer/Manager",
      "UN Program Officer",
      "Animal welfare/Shelter manager"
    ]
  },
  {
    "cluster_id": "SPT",
    "name": "Sports & Athletics",
    "mastersheet_name": "Sports & Athletics",
    "holland_code": "RSE",
    "weights": {
      "R": 3,
      "I": 0,
      "A": 0,
      "S": 2,
      "E": 1,
      "C": 0,
      "O": 0,
      "Cn": 2,
      "Ex": 2,
      "Ag": 1,
      "ES": 3,
      "OC": 1,
      "SE": 3,
      "CO": 0,
      "ST": 0,
      "Mech": 1,
      "Log": 1,
      "Verb": 1,
      "Spat": 2,
      "Num": 0,
      "Voc": 0
    },
    "description": "Careers in and around the game \u2014 playing, coaching, sports science, analysis and sports media.",
    "why_fit": "You're physically driven and competitive, you train with discipline, and you perform best when the pressure is highest.",
    "streams_and_pathways_india": "Any stream. Pathways: sports quotas and academies, B.P.Ed / physical education, sports science degrees, SAI schemes; for sports media/analytics combine with mass comm or data skills.",
    "careers": [
      "Professional Athlete & Coach",
      "Professional Player",
      "Sports Coach/Trainer",
      "Physical Education Teacher",
      "Armed Forces Sports Instructor",
      "Sports Physiotherapist",
      "Sports Psychologist",
      "Sports Nutritionist",
      "Referee",
      "Umpire",
      "Sports Analyst",
      "Sports Anchor",
      "Sports Commentator",
      "Sports Journalist",
      "Martial Artist",
      "Sports Event Manager",
      "Sports Marketeer",
      "Strength and Conditioning Coach",
      "Sports Photographer/Videographer",
      "Esports Player"
    ]
  },
  {
    "cluster_id": "SEM",
    "name": "Science, Engineering & Mathematics",
    "mastersheet_name": "SEM",
    "holland_code": "IRC",
    "weights": {
      "R": 2,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 1,
      "O": 3,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 1,
      "OC": 2,
      "SE": 1,
      "CO": 1,
      "ST": 1,
      "Mech": 3,
      "Log": 3,
      "Verb": 1,
      "Spat": 3,
      "Num": 3,
      "Voc": 0
    },
    "description": "Careers in pure and applied science \u2014 research, mathematics, core engineering, space and forensics.",
    "why_fit": "You have strong all-round reasoning and deep curiosity; you enjoy hard problems for their own sake and want to understand how the universe works.",
    "streams_and_pathways_india": "Science stream (PCM or PCB by goal). Pathways: JEE (Main/Advanced), IISER/NISER/ISI entrances, B.Sc honours + research route, KVPY-style scholarships and olympiads.",
    "careers": [
      "Physical Sciences",
      "Mathematics and Statistics",
      "Space Aviation",
      "Biological Sciences",
      "Chemical Sciences",
      "Environmental Sciences",
      "Core Engineering",
      "Advance Engineering",
      "Emerging Engineering",
      "Forensic Science"
    ]
  },
  {
    "cluster_id": "TRL",
    "name": "Transport & Logistics",
    "mastersheet_name": "Transport & Logistics",
    "holland_code": "CRE",
    "weights": {
      "R": 2,
      "I": 0,
      "A": 0,
      "S": 0,
      "E": 1,
      "C": 3,
      "O": 0,
      "Cn": 3,
      "Ex": 1,
      "Ag": 1,
      "ES": 2,
      "OC": 0,
      "SE": 1,
      "CO": 3,
      "ST": 0,
      "Mech": 2,
      "Log": 2,
      "Verb": 1,
      "Spat": 3,
      "Num": 2,
      "Voc": 0
    },
    "description": "Careers that move the world \u2014 aviation, merchant navy, railways, ports, shipping and supply chains.",
    "why_fit": "You're reliable and safety-minded, with a strong sense of routes, systems and time \u2014 you like things running exactly to plan.",
    "streams_and_pathways_india": "Science (PCM) for pilot/marine/ATC routes; Commerce works for logistics management. Pathways: NDA/IMU CET, commercial pilot licence (CPL) training, railway exams, logistics & supply chain degrees.",
    "careers": [
      "Merchant Navy officer",
      "Commercial/Cargo Pilot",
      "Loco Pilot",
      "Station Master",
      "Travelling Ticket Examiner",
      "Airport Operation/ Maintainance Manager",
      "Air Traffic Controller",
      "DGCA Compliance Officer",
      "Deck Officer",
      "Naval Architect",
      "Port/Dock Operations Manager",
      "Freight Manager (Import/Export)",
      "Shipping Documentation Officer",
      "Logistics/Supplychain Manager",
      "Metro Operation Manager",
      "Delivery/Courier Service Manager",
      "Cruise Ship Officer"
    ]
  }
];

export const CLUSTER_MAP = CLUSTERS.reduce((acc, cl) => {
  acc[cl.cluster_id] = cl;
  acc[cl.name] = cl;
  return acc;
}, {});

export const SEM_SUB = [
  {
    "sub_id": "SEM_PHY",
    "name": "Physical Sciences",
    "careers_hint": "Physicist, Astronomer, Astrophysicist, Materials Scientist",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 0,
      "O": 3,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 2,
      "SE": 1,
      "CO": 0,
      "ST": 0,
      "Mech": 2,
      "Log": 3,
      "Verb": 0,
      "Spat": 2,
      "Num": 3,
      "Voc": 0
    },
    "signature": "Abstract theory + mathematics; strongest when Numerical and Logical are both high with strong curiosity (Openness)."
  },
  {
    "sub_id": "SEM_MAT",
    "name": "Mathematics & Statistics",
    "careers_hint": "Mathematician, Statistician, Data Analyst, Actuarial Scientist",
    "weights": {
      "R": 0,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 2,
      "O": 2,
      "Cn": 3,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 1,
      "SE": 0,
      "CO": 1,
      "ST": 0,
      "Mech": 0,
      "Log": 3,
      "Verb": 0,
      "Spat": 1,
      "Num": 3,
      "Voc": 0
    },
    "signature": "Pure abstract reasoning; Numerical + Logical dominate, with order and precision (Conscientiousness, Conventional interest) and little need for Mechanical."
  },
  {
    "sub_id": "SEM_SPC",
    "name": "Space & Aviation Sciences",
    "careers_hint": "Aerospace Scientist, ISRO/Space Research, Aeronautical Engineer",
    "weights": {
      "R": 2,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 0,
      "O": 2,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 2,
      "OC": 2,
      "SE": 0,
      "CO": 0,
      "ST": 0,
      "Mech": 3,
      "Log": 2,
      "Verb": 0,
      "Spat": 3,
      "Num": 3,
      "Voc": 0
    },
    "signature": "The widest aptitude demand: Mechanical + Spatial + Numerical together; calm under pressure (Emotional Stability) matters."
  },
  {
    "sub_id": "SEM_BIO",
    "name": "Biological Sciences",
    "careers_hint": "Biologist, Geneticist, Microbiologist, Biotech Researcher",
    "weights": {
      "R": 0,
      "I": 3,
      "A": 0,
      "S": 1,
      "E": 0,
      "C": 0,
      "O": 2,
      "Cn": 2,
      "Ex": 0,
      "Ag": 1,
      "ES": 0,
      "OC": 1,
      "SE": 0,
      "CO": 0,
      "ST": 2,
      "Mech": 0,
      "Log": 2,
      "Verb": 2,
      "Spat": 1,
      "Num": 2,
      "Voc": 1
    },
    "signature": "Living-systems curiosity; less mechanical/spatial, more verbal-logical, often paired with care for life (Self-Transcendence)."
  },
  {
    "sub_id": "SEM_CHM",
    "name": "Chemical Sciences",
    "careers_hint": "Chemist, Chemical Analyst, Pharma R&D Scientist",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 1,
      "O": 2,
      "Cn": 3,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 1,
      "SE": 0,
      "CO": 1,
      "ST": 0,
      "Mech": 1,
      "Log": 3,
      "Verb": 0,
      "Spat": 1,
      "Num": 2,
      "Voc": 0
    },
    "signature": "Laboratory precision and protocol; Logical reasoning with high Conscientiousness is the signature."
  },
  {
    "sub_id": "SEM_ENS",
    "name": "Environmental Sciences",
    "careers_hint": "Environmental Scientist, Ecologist, Climate Researcher",
    "weights": {
      "R": 2,
      "I": 3,
      "A": 0,
      "S": 1,
      "E": 0,
      "C": 0,
      "O": 3,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 1,
      "SE": 0,
      "CO": 0,
      "ST": 3,
      "Mech": 0,
      "Log": 2,
      "Verb": 2,
      "Spat": 1,
      "Num": 2,
      "Voc": 0
    },
    "signature": "Field science driven by protecting nature; Self-Transcendence values strongly differentiate this sub-field."
  },
  {
    "sub_id": "SEM_COR",
    "name": "Core Engineering",
    "careers_hint": "Mechanical, Civil, Electrical Engineering",
    "weights": {
      "R": 3,
      "I": 2,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 1,
      "O": 1,
      "Cn": 3,
      "Ex": 0,
      "Ag": 0,
      "ES": 1,
      "OC": 0,
      "SE": 1,
      "CO": 1,
      "ST": 0,
      "Mech": 3,
      "Log": 2,
      "Verb": 0,
      "Spat": 3,
      "Num": 2,
      "Voc": 0
    },
    "signature": "Build-and-make orientation: Realistic interest with Mechanical + Spatial aptitude dominate over pure abstraction."
  },
  {
    "sub_id": "SEM_ADV",
    "name": "Advanced Engineering",
    "careers_hint": "Nanotech, Mechatronics, Materials, Nuclear Engineering",
    "weights": {
      "R": 2,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 0,
      "C": 0,
      "O": 2,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 2,
      "SE": 1,
      "CO": 0,
      "ST": 0,
      "Mech": 3,
      "Log": 3,
      "Verb": 0,
      "Spat": 2,
      "Num": 3,
      "Voc": 0
    },
    "signature": "Engineering depth + research appetite: high Investigative with the full quantitative-mechanical stack."
  },
  {
    "sub_id": "SEM_EMR",
    "name": "Emerging Engineering",
    "careers_hint": "AI/Robotics Engineering, Computational Engineering",
    "weights": {
      "R": 1,
      "I": 3,
      "A": 0,
      "S": 0,
      "E": 1,
      "C": 0,
      "O": 3,
      "Cn": 2,
      "Ex": 0,
      "Ag": 0,
      "ES": 0,
      "OC": 3,
      "SE": 1,
      "CO": 0,
      "ST": 0,
      "Mech": 2,
      "Log": 3,
      "Verb": 0,
      "Spat": 2,
      "Num": 3,
      "Voc": 0
    },
    "signature": "Frontier appetite: Openness (trait and value) plus Logical-Numerical strength differentiate from classic engineering."
  },
  {
    "sub_id": "SEM_FOR",
    "name": "Forensic Science",
    "careers_hint": "Forensic Scientist, Crime Lab Analyst, Forensic Toxicologist",
    "weights": {
      "R": 0,
      "I": 3,
      "A": 0,
      "S": 1,
      "E": 0,
      "C": 2,
      "O": 0,
      "Cn": 3,
      "Ex": 0,
      "Ag": 0,
      "ES": 2,
      "OC": 0,
      "SE": 0,
      "CO": 2,
      "ST": 1,
      "Mech": 0,
      "Log": 3,
      "Verb": 2,
      "Spat": 1,
      "Num": 1,
      "Voc": 1
    },
    "signature": "Investigation in service of justice: meticulous protocol (Conscientiousness, Conservation) with strong Logical + Verbal reasoning."
  }
];

export const SEM_BLEND = { aptitude: 0.4, interest: 0.3, personality: 0.15, values: 0.15 };

export const INTERP = {
  "interest": {
    "R": {
      "name": "Realistic (Doer)",
      "blurbs": {
        "developing": "Hands-on, physical and outdoor activities are not a big draw for you right now \u2014 you likely prefer working with ideas, people or information.",
        "moderate": "You enjoy practical, hands-on work in some situations, especially when you can see a concrete result, though it isn't your main driver.",
        "high": "You're a doer \u2014 you love working with your hands, tools, machines or the outdoors, and you learn best by physically doing things."
      }
    },
    "I": {
      "name": "Investigative (Thinker)",
      "blurbs": {
        "developing": "Abstract analysis and scientific investigation interest you less than other kinds of activities right now.",
        "moderate": "You enjoy figuring things out and exploring ideas when a topic catches your interest, though deep analysis isn't always your first choice.",
        "high": "You're a thinker \u2014 you love questions, experiments, data and understanding why things work, and you enjoy problems that make you stretch."
      }
    },
    "A": {
      "name": "Artistic (Creator)",
      "blurbs": {
        "developing": "Creative self-expression through art, music or writing is not a major interest for you at the moment.",
        "moderate": "You enjoy creative activities from time to time and appreciate originality, even if creating isn't your central passion.",
        "high": "You're a creator \u2014 expressing yourself through art, words, music, design or performance energises you, and you value originality highly."
      }
    },
    "S": {
      "name": "Social (Helper)",
      "blurbs": {
        "developing": "Activities centred on helping, teaching or caring for others draw you less than working with things or ideas.",
        "moderate": "You enjoy helping and working with people in many situations, balanced with time for your own tasks.",
        "high": "You're a helper \u2014 teaching, supporting, guiding and collaborating with people gives you genuine satisfaction and energy."
      }
    },
    "E": {
      "name": "Enterprising (Leader)",
      "blurbs": {
        "developing": "Leading, persuading and competing are not what excite you most \u2014 you may prefer contributing through skill rather than direction-setting.",
        "moderate": "You can step up to lead or persuade when needed and enjoy a challenge, though you don't always seek the front position.",
        "high": "You're a leader \u2014 you love taking charge, convincing people, setting goals and starting new things, and challenge motivates you."
      }
    },
    "C": {
      "name": "Conventional (Organizer)",
      "blurbs": {
        "developing": "Detailed, structured and routine tasks appeal to you less \u2014 you likely prefer variety and open-ended work.",
        "moderate": "You can work with order, records and detail comfortably when a task calls for it, while also enjoying flexibility.",
        "high": "You're an organizer \u2014 you like order, accuracy, records, plans and numbers, and people can rely on you to keep things on track."
      }
    }
  },
  "personality": {
    "O": {
      "name": "Openness",
      "blurbs": {
        "developing": "You prefer the familiar and practical over the novel and abstract \u2014 a strength for consistent, well-defined work; just keep saying small yeses to new experiences.",
        "moderate": "You balance curiosity with practicality \u2014 open to new ideas, while valuing what already works.",
        "high": "You're highly curious and imaginative \u2014 new ideas, subjects and experiences excite you, which suits creative, research and fast-changing fields."
      }
    },
    "Cn": {
      "name": "Conscientiousness",
      "blurbs": {
        "developing": "Organisation and follow-through don't come naturally yet \u2014 building small routines (planners, checklists, fixed study slots) will pay off in any career.",
        "moderate": "You're reasonably organised and dependable, finishing what matters even if some tasks slip.",
        "high": "You're highly disciplined and dependable \u2014 you plan, persist and finish. This trait predicts success in virtually every career, especially demanding professional paths."
      }
    },
    "Ex": {
      "name": "Extraversion",
      "blurbs": {
        "developing": "You recharge alone and prefer smaller interactions \u2014 a real strength for deep-focus careers; presentation skills can be built gradually.",
        "moderate": "You're an ambivert \u2014 comfortable both in groups and working alone, adapting to what the situation needs.",
        "high": "You're energised by people \u2014 talking, presenting and socialising come naturally, which suits people-facing and leadership careers."
      }
    },
    "Ag": {
      "name": "Agreeableness",
      "blurbs": {
        "developing": "You're independent-minded and comfortable with disagreement \u2014 useful in negotiation, analysis and competition; pairing it with empathy makes you stronger.",
        "moderate": "You cooperate well while still holding your own views \u2014 a healthy balance for teamwork and fair decisions.",
        "high": "You're warm, cooperative and considerate \u2014 people trust you easily, which is gold in helping, teaching, healthcare and team careers."
      }
    },
    "ES": {
      "name": "Emotional Stability",
      "blurbs": {
        "developing": "Stress and setbacks affect you strongly right now. That's common at your age and very trainable \u2014 sleep, exercise, breathing practice and talking things out genuinely help.",
        "moderate": "You handle everyday pressure reasonably well, though big moments can shake you sometimes \u2014 like most people.",
        "high": "You stay calm and steady under pressure \u2014 a major asset for high-stakes fields like defence, medicine, aviation and competitive exams."
      }
    }
  },
  "values": {
    "OC": {
      "name": "Openness to Change",
      "blurbs": {
        "developing": "Freedom and novelty matter less to you than other motivations \u2014 you don't need constant change to feel engaged.",
        "moderate": "You appreciate some independence and variety in your work, balanced with structure.",
        "high": "Freedom, creativity and new experiences drive you \u2014 you'll thrive where you can decide how you work and what you explore."
      }
    },
    "SE": {
      "name": "Self-Enhancement",
      "blurbs": {
        "developing": "Personal status and winning are not your main motivators \u2014 you likely draw motivation from meaning, security or curiosity instead.",
        "moderate": "Achievement and recognition matter to you in healthy measure \u2014 you like doing well without needing the spotlight constantly.",
        "high": "Achievement, success and recognition strongly drive you \u2014 you'll thrive with clear goals, competition, growth ladders and visible results."
      }
    },
    "CO": {
      "name": "Conservation",
      "blurbs": {
        "developing": "Routine, rules and predictability matter less to you \u2014 you're comfortable with ambiguity and change.",
        "moderate": "You value a reasonable amount of stability and order while staying flexible when things shift.",
        "high": "Security, stability and doing things properly matter deeply to you \u2014 structured organisations, government roles and established professions will feel right."
      }
    },
    "ST": {
      "name": "Self-Transcendence",
      "blurbs": {
        "developing": "Helping causes and people is not your primary driver right now \u2014 your motivation likely comes from mastery, achievement or independence.",
        "moderate": "You care about fairness and helping others as part of a balanced set of motivations.",
        "high": "Making a difference for people, society or nature is central to you \u2014 look for careers with visible positive impact."
      }
    }
  },
  "aptitude": {
    "Log": {
      "name": "Logical Reasoning",
      "blurbs": {
        "developing": "Logical puzzles were tough this time \u2014 regular practice with reasoning workbooks and puzzle apps improves this skill faster than almost any other.",
        "moderate": "You have a solid base in logical reasoning; consistent practice will push you to the top band.",
        "high": "Excellent logical reasoning \u2014 you spot patterns and draw correct conclusions quickly. This powers IT, science, law, finance and competitive exams."
      }
    },
    "Num": {
      "name": "Numerical",
      "blurbs": {
        "developing": "Numbers felt hard today \u2014 strengthening arithmetic basics (percentages, ratios, speed-time) with daily 15-minute practice will change this quickly.",
        "moderate": "You're comfortable with numbers at a working level; targeted practice on word problems will lift you further.",
        "high": "Strong numerical ability \u2014 calculations and quantitative problems come easily, supporting finance, engineering, data and science paths."
      }
    },
    "Verb": {
      "name": "Verbal Reasoning",
      "blurbs": {
        "developing": "Reasoning with language was challenging \u2014 daily reading plus summarising what you read sharpens this steadily.",
        "moderate": "You reason with language reasonably well; practising paragraph-ordering and conclusion questions will sharpen it further.",
        "high": "Strong verbal reasoning \u2014 you understand, organise and evaluate written ideas well, supporting law, civil services, media and management."
      }
    },
    "Voc": {
      "name": "Vocabulary & Language",
      "blurbs": {
        "developing": "Grammar and word-power need building \u2014 reading English daily and keeping a new-words notebook is the most reliable fix.",
        "moderate": "Your language fundamentals are decent; focused grammar revision and wider reading will raise your precision.",
        "high": "Excellent command of language \u2014 strong vocabulary and grammar support every communication-heavy career from journalism to teaching to law."
      }
    },
    "Mech": {
      "name": "Mechanical",
      "blurbs": {
        "developing": "Mechanical concepts (forces, gears, pulleys) were unfamiliar \u2014 basic physics revision and hands-on tinkering build this quickly.",
        "moderate": "You grasp mechanical principles at a working level; physics practice will consolidate it.",
        "high": "Strong mechanical understanding \u2014 you intuitively see how forces and machines work, ideal for engineering, defence and technical trades."
      }
    },
    "Spat": {
      "name": "Spatial",
      "blurbs": {
        "developing": "Visualising shapes and rotations was difficult this time \u2014 puzzles, building models, origami and cube games genuinely train this skill.",
        "moderate": "You visualise space and shapes reasonably well; practice with mental-rotation puzzles will strengthen it.",
        "high": "Excellent spatial ability \u2014 you mentally rotate and visualise objects with ease, a key strength for design, architecture, aviation and engineering."
      }
    }
  },
  "learning_style": {
    "V": {
      "name": "Visual",
      "description": "You learn best through what you can see \u2014 diagrams, charts, colours and maps.",
      "tips": [
        "Convert chapters into mind-maps, flowcharts and labelled diagrams.",
        "Use colour-coding for formulas, dates and key terms.",
        "Watch good video explanations, then redraw the idea from memory.",
        "Sit where you can clearly see the board and the teacher's demonstrations."
      ]
    },
    "A": {
      "name": "Auditory",
      "description": "You learn best through listening and talking \u2014 explanations, discussion and sound.",
      "tips": [
        "Read your notes aloud, or explain topics to a friend or family member.",
        "Record short voice notes of key points and replay them while revising.",
        "Join study discussions \u2014 talking through a problem locks it in.",
        "Turn formulas and lists into rhythms or spoken patterns."
      ]
    },
    "Rd": {
      "name": "Reading/Writing",
      "description": "You learn best through written words \u2014 notes, lists, textbooks and summaries.",
      "tips": [
        "Make your own written summaries after every chapter \u2014 writing is your memory tool.",
        "Rewrite formulas, definitions and steps in your own words.",
        "Practise with written question banks and previous papers.",
        "Keep an organised notebook system \u2014 your notes are your superpower."
      ]
    },
    "K": {
      "name": "Kinaesthetic",
      "description": "You learn best by doing \u2014 movement, touch, experiments and real examples.",
      "tips": [
        "Learn by doing: experiments, models, role-play and real examples.",
        "Take short movement breaks; revise while walking if it helps.",
        "Use flashcards you can shuffle and sort \u2014 keep your hands involved.",
        "Connect every concept to a real object or real-life situation."
      ]
    }
  },
  "goal_orientation": {
    "long_term": {
      "name": "Long-Term Builder",
      "text": "You're ready to invest years in deep education for a bigger payoff later. Careers needing professional degrees \u2014 medicine, law, engineering, research, civil services, chartered accountancy \u2014 suit this mindset. Plan early for entrance exams, and explore scholarships and education loans without fear."
    },
    "short_term": {
      "name": "Early Starter",
      "text": "You want to start working and learning on the job quickly. Look at skill-first routes: diplomas, vocational and ITI courses, design portfolios, certifications, and careers where talent and experience matter more than long degrees. You can always add qualifications later, part-time."
    },
    "balanced": {
      "name": "Balanced Planner",
      "text": "You're balanced between studying further and starting work early. A smart path: choose degree courses that include internships, apprenticeships or placement years \u2014 you earn experience while keeping the door open to higher studies."
    }
  },
  "report_disclaimers": {
    "match_note": "Match percentages compare clusters with each other \u2014 a lower score doesn't mean you can't succeed there, only that other clusters fit your current profile more naturally. Interests can grow with exposure, and aptitude grows with practice.",
    "es_note": "Emotional Stability is the positive side of the Neuroticism scale \u2014 a higher score means you stay calmer under pressure.",
    "apt_note": "Aptitude scores show the percentage of questions answered correctly in each area. Aptitude is a skill, not a fixed limit \u2014 areas below 50% are exactly where focused practice gives the fastest gains.",
    "retest_note": "Retake this assessment after 6\u201312 months \u2014 interests develop as you try new things."
  }
};
