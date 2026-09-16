/* ============================================================================
   IPSC IT FEST 2026 — SINGLE SOURCE OF TRUTH
   ----------------------------------------------------------------------------
   Every fact on the website comes from this file. Nothing is hard-coded into a
   page. Change a value here, run `node build.mjs`, and it changes everywhere.

   PROVENANCE (newest source wins, per the organising committee's own rule):
     [B]  IPSC IT FEST 2026 brochure, the version sent to Heads of School
          (received 7 Sep 2026). Authoritative for anything already published.
     [M]  "IPSC IT FEST 2026 - MASTER DOC", Google Drive, modified 5 Sep 2026.
     [S]  "IPSC_Schedule (11 September draft)", in assets/event schedule/.
     [I]  Headmaster's invitation letter, Google Drive, modified 29 Aug 2026.
     [E]  Committee email traffic, Aug–Sep 2026.

   PLACEHOLDERS: wrap unknown values in tbc('...'). They render as a visible
   marker on the page and are listed in the build report, so nothing unverified
   ships silently. Search this file for `tbc(` to find every open question.
   ========================================================================== */

/** Marks a value that is not yet decided. Rendered visibly; counted at build. */
export const TBC_REGISTRY = [];
export function tbc(note) {
  TBC_REGISTRY.push(note);
  return { __tbc: note };
}

/* ── Fest-wide configuration ─────────────────────────────────────────────── */

export const CONFIG = {
  shortName: 'IPSC IT Fest',
  name: 'IPSC IT Fest 2026',
  edition: tbc('Edition number: is 2026 the 5th? 6th? Drive holds 2023, 2024, 2025 brochures'),
  theme: 'Where Technology Meets Insight',           // [B] cover
  epigraph: {
    text: 'Technology, like art, is a soaring exercise of the human imagination.',
    author: 'Daniel Bell',                            // [B] back cover
  },

  dates: {
    startISO: '2026-12-08T09:00:00+05:30',
    endISO: '2026-12-10T14:00:00+05:30',
    label: '08–10 December 2026',
    long: '8 to 10 December 2026',
    weekday: 'Tuesday to Thursday',                   // [M] 8 Dec 2026 is a Tuesday
  },

  registration: {
    closesISO: '2026-09-25T23:59:59+05:30',           // [B] newest brochure, rule 1
    closesLabel: '25 September 2026',
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc41B6i3KD-hJfVj9MG0_TUN0fawKYj32Txkf_mszhk1wJAsg/viewform', // [I]
    note: 'Schools must forward an event-wise list of participants by this date.',
    supersedes: 'An earlier brochure gave 10 September 2026. The version circulated to Heads of School gives 25 September 2026, and that is the date in force.',
  },

  documentation: {
    releaseLabel: 'Available soon',                    // [B] rule 2 gave the first week of October; the site no longer commits to a date
    statement: 'Full documentation for every event, including detailed judging rubrics, will be released to all registered schools soon.',
  },

  eligibility: {
    classes: 'Classes 9 to 12',                       // [B] rule 4
    delegation: '8 students, accompanied by 1 faculty advisor', // [B] rule 5
    maxStudents: 8,
    maxEventsPerStudent: 3,                           // [I]
  },

  arrival: {
    label: 'By 17:00 on 7 December 2026',
    detail: 'Teams are expected to arrive by 5:00 p.m. on 7 December 2026. Alternatively, teams may arrive on the morning of 8 December 2026.', // [B] rule 12
    departure: 'Teams may depart after the Closing Ceremony on 10 December 2026, which is expected to conclude by 2:00 p.m.',
  },

  charges: {
    statement: 'Registration charges, as well as boarding and lodging expenses, are applicable as per the provisions of the IPSC Charter. We will release detailed information to all registered schools soon.', // [B] rule 14 + [I]
    amount: tbc('Registration fee, per school and per head. IPSC Charter rates not yet published to the committee'),
    boarding: tbc('Boarding & lodging rate per head per night'),
  },

  venue: {
    school: 'The Doon School',
    campus: 'Chandbagh',
    street: 'Mall Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    pin: '248001',
    country: 'India',
    tel: '+91 (0)135 2526 426',
    mapQuery: 'The Doon School, Mall Road, Dehradun',
  },

  contact: {
    email: 'ipscitfest2026@doonschool.com',            // [I]
    people: [
      { name: 'Mr Harshal Gunwant', role: 'Master-in-Charge', phone: '+91 97205 39005', code: 'HGT' },
      { name: 'Mr Ashutosh Tripathi', role: 'Master-in-Charge', phone: '+91 85589 61966', code: 'ATI' },
    ],
    headmaster: { name: 'Dr Jagpreet Singh', role: 'Headmaster, The Doon School' },
  },

  society: {
    line: 'The Indian Public Schools’ Society',
    registered: 'Registered office: The Doon School, Chandbagh, Dehradun, Uttarakhand',
    cin: 'U99999UR1928NPL002455',
    copyright: '© The Doon School, Dehradun, 2026',
  },

  social: tbc('Instagram / other handles for the fest, if any exist'),
};

/* ── Navigation ──────────────────────────────────────────────────────────── */
/* Sheet numbers are the drafting-sheet index; they are the page's real
   position in the set, not decoration.

   The Chandbagh sheet is archived: its data (CHANDBAGH) and its page function
   (pageChandbagh in build.mjs) are kept, but it is neither built nor linked.
   To bring it back, add it here and to the page list in build.mjs. */

export const NAV = [
  { slug: 'index',        title: 'Home',          sheet: '01' },
  { slug: 'events',       title: 'Events',        sheet: '02' },
  { slug: 'schedule',     title: 'Schedule',      sheet: '03' },
  { slug: 'registration', title: 'Registration',  sheet: '04' },
  { slug: 'rules',        title: 'Rules',         sheet: '05' },
  { slug: 'resources',    title: 'Resources',     sheet: '06' },
  { slug: 'committee',    title: 'Committee',     sheet: '07' },
  { slug: 'faq',          title: 'FAQ',           sheet: '08' },
];

/* ── The eight events ─────────────────────────────────────────────────────
   `rules` and `judging` are quoted from the brochure [B] — these are the
   published terms schools have already been sent, so they are reproduced
   faithfully rather than paraphrased.
   `sim` names the interactive figure built for that event's page.
   ------------------------------------------------------------------------ */

export const EVENTS = [
  {
    slug: 'terra-incognita',
    brand: 'Terra Incognita',
    technical: 'SLAM: Autonomous Mapping & Pathfinding',
    category: 'robotics',
    categoryLabel: 'Robotics',
    participants: 2,
    control: 'Fully autonomous',
    sim: 'slam',
    tagline: 'Map ground you have never seen, then find your way home.',
    summary: 'Robots map an unseen arena, push a block, and navigate back to the start, fully autonomously.',
    lede: 'The arena is not released beforehand and no prior map is permitted. The robot must build its own map while tracking its position inside it, and the error it accumulates doing so is the whole difficulty of the event.',
    rules: [
      'The robot explores an arena it has never seen, mapping the space while tracking its own position within it. No prior map is permitted and the layout is not released beforehand.',
      'Partway round, a movable block must be identified and pushed; pushing only, no lifting or grabbing.',
      'The robot must then return as closely as it can to the point it started from. Recognising where it has already been, and correcting for accumulated error, is the heart of the event.',
      'Operation is fully autonomous with all processing onboard; no remote control or wireless commands are permitted. LIDAR is not allowed, while ultrasonic, IR, time-of-flight, encoders and cameras are. The event rewards software skill over expensive hardware.',
    ],
    judging: [
      'Accuracy of the generated map against the official reference',
      'Accuracy of the robot’s final reported position',
      'Completion of the in-arena object task',
      'Navigation carries higher weight than mapping alone',
    ],
    sensors: { allowed: 'Ultrasonic · IR · time-of-flight · encoders · cameras', barred: 'LIDAR · remote control · wireless commands' },
    head: 'Trijat Sah',
    deputies: ['Aaryansh Kejriwal', 'Arnav Kejriwal'],
  },
  {
    slug: 'half-life',
    brand: 'Half-Life',
    technical: 'AGV: Autonomous Ground Vehicle Navigation',
    category: 'robotics',
    categoryLabel: 'Robotics',
    participants: 2,
    control: 'Fully autonomous',
    sim: 'astar',
    tagline: 'Sort what is dangerous from what is delicate, and the rules change each round.',
    summary: 'Robots sort hazardous, fragile and normal objects into matching bins while adapting to changing rules each round.',
    lede: 'A symbol shown before the run rewrites the sorting rules. The robot that wins is the one whose logic reads the symbol rather than the one whose route was memorised.',
    rules: [
      'The robot scans a field of objects belonging to three classes: hazardous, fragile and normal. Each class is identified by colour, and sorts them into the matching coloured bins.',
      'A symbol displayed before the run alters the sorting rules: a class may be redirected to a different bin, or the order of collection reversed. The symbol changes between rounds.',
      'Hazardous objects are time-critical once lifted and must be deposited before the limit expires. Fragile objects must not be crushed or deformed in handling.',
      'Objects are carried through a corridor network.',
      'On completing the sort, the robot returns to the parking zone and parks itself. The entire run is autonomous, with no human intervention once it has begun.',
    ],
    judging: [
      'Correct classification and placement',
      'Correct compliance with the symbol rule',
      'Condition of fragile items and timing on hazardous ones',
      'Return to station and total time',
    ],
    classes: [
      { key: 'hazardous', label: 'Hazardous', note: 'Time-critical once lifted' },
      { key: 'fragile', label: 'Fragile', note: 'Must not be crushed or deformed' },
      { key: 'normal', label: 'Normal', note: 'No handling constraint' },
    ],
    head: 'Samrat Gupta',
    deputies: ['Vivaan Kumbhat'],
  },
  {
    slug: 'build-different',
    brand: 'Build-Different',
    technical: 'Tele-Operated Robotics',
    category: 'robotics',
    categoryLabel: 'Robotics',
    participants: 2,
    control: 'Driver-controlled',
    sim: 'quadrant',
    tagline: 'Two stages you can prepare for. A third you cannot.',
    summary: 'Driver-controlled robots match plants by colour and assemble a monument, with a surprise final stage.',
    lede: 'Stage three is disclosed only once qualifying has ended. It demands no change to the robot’s hardware, but it will demand that you reprogram it on the day. Build for adaptability, and bring a laptop.',
    rules: [
      'A driver-controlled event fought across a quadrant-divided arena.',
      'Stage one: retrieve the plants and deposit each into the pot of the matching colour.',
      'Stage two: collect the pieces of the monument and assemble them in the prescribed configuration on the central platform. Full marks require the exact arrangement.',
      'Teams reaching the semi-finals and finals face a third stage, disclosed only once qualifying has ended. It demands no change to the robot’s hardware, but teams may reprogram. Build for adaptability, and bring a laptop.',
    ],
    judging: [
      'Correct colour-matching of every plant',
      'Accuracy of the assembled monument',
      'Driver precision with arena components',
      'Total time',
    ],
    withheld: 'Stage three is withheld until qualifying ends. It requires no hardware change.',
    head: 'Arnav Kharpude',
    deputies: ['Dhrubo Mishra', 'Yug Jain'],
  },
  {
    slug: 'brinkmanship',
    brand: 'Brinkmanship',
    technical: 'Sumo Bot',
    category: 'robotics',
    categoryLabel: 'Robotics',
    participants: 1,
    control: 'Autonomous, then manual',
    sim: 'sumo',
    tagline: 'A pushing contest, not a combat one.',
    summary: 'Robots push each other out of a ring, beginning autonomously before switching to manual control.',
    lede: 'Every match opens autonomous. Control is handed to the driver on the referee’s signal, so the opening seconds are won by code and the rest by hand.',
    rules: [
      'Two robots face each other in a circular ring. The objective is to push the opponent out of it while remaining inside yourself.',
      'Matches open with a fully autonomous phase, during which no driving is allowed; manual control is enabled for the remainder on the referee’s signal.',
      'A red band around the rim acts as a warning zone. A robot that enters it and fails to recover in time concedes a point to the opposition.',
      'Destructive designs are prohibited: no blades, flame, liquids or projectiles, as are mechanisms generating artificial downforce, such as vacuum suction or sticky tyres. This is a pushing contest, not a combat one.',
      'The event runs as a league, with the highest-scoring teams progressing to semi-finals and finals.',
    ],
    judging: ['League results: push-outs'],
    barred: 'Blades · flame · liquids · projectiles · vacuum downforce · sticky tyres',
    divisions: tbc('Junior and Senior SumoBot appear as separate slots in the draft schedule but not in the brochure. Is Brinkmanship split by age group?'),
    head: 'Atiksh Kasana',
    deputies: ['Atharv Jajodia'],
  },
  {
    slug: 'hackathon',
    brand: 'Hackathon',
    technical: 'Cross-school venture build',
    category: 'team',
    categoryLabel: 'Team event',
    participants: 3,
    control: 'Multi-school companies',
    sim: 'company',
    tagline: 'You will not be competing with your own school.',
    summary: 'Multi-school teams develop a prototype, business strategy and pitch around a surprise problem statement.',
    lede: 'Schools are dissolved into companies. Each company elects a CEO, CTO and CMO after the Opening Ceremony, and only then is the problem statement released.',
    rules: [
      'Participants transform conceptual ideas into market-ready business solutions, combining technical expertise with entrepreneurial thinking.',
      'The event forms corporate entities (“companies”) spanning multiple schools. For example, five companies may be established, each comprising five participating schools (15 members per company). Final numbers depend on total registrations and will be communicated to registered schools in September.',
      'After the Opening Ceremony, companies appoint a CEO, CTO and CMO to oversee task delegation, steer strategic choices and lead the company.',
      'The problem statement is released only after leadership selection. Companies then work until the final hour before the Closing Ceremony.',
      'Deliverables: a functional prototype (hardware, software or both), a viable business and marketing strategy, and a final pitch presentation.',
      'Personal hardware (laptops) is required. AI assistance is permitted for development and design, but teams must demonstrate a profound understanding of their entire output.',
    ],
    judging: [
      '15-minute corporate pitch',
      'Quality of the functional prototype',
      'Robustness of the marketing strategy',
      'Performance during the subsequent Q&A session',
    ],
    rubric: { total: 70, rows: [
      { label: 'Prototype', marks: 20 },
      { label: 'Marketing strategy', marks: 20 },
      { label: 'Presentation: quality and clarity', marks: 20 },
      { label: 'Q&A', marks: 10 },
    ]},
    fabrication: 'For hardware projects, participants have access to campus fabrication resources, including 3D printing facilities.',
    motto: 'Innovate. Collaborate. Pitch. Succeed.',
    companyCount: tbc('Final number of companies and schools per company, due to registered schools in September'),
    head: 'Vir Sandhu',
    deputies: [],
  },
  {
    slug: 'it-quiz',
    brand: 'IT Quiz',
    technical: 'Technology quiz',
    category: 'team',
    categoryLabel: 'Team event',
    participants: 2,
    control: 'Prelim, then live final',
    sim: 'rounds',
    tagline: 'Think fast. Answer smart. Stay ahead.',
    summary: 'A team-based technology quiz with an MCQ preliminary round followed by a live final with rapid-fire and buzzer rounds.',
    lede: 'The preliminary round is written on individual devices against a timer. The final is played on stage, and the Quizmaster sets the sequence.',
    rules: [
      'A team-based competition testing knowledge of technology, computers, and the evolving world of Information Technology.',
      'Preliminary round: conducted in a designated room using individual digital devices. Teams answer a series of Multiple Choice Questions before the timer expires. Top-scoring teams advance.',
      'Final round: finalists compete live on stage guided by the Quizmaster, featuring General IT Knowledge, Rapid Fire, Visual Identification, Audio/Video-Based Questions, a Buzzer Round, and Surprise or Special Rounds.',
      'Decisions made by the Quizmaster and judging panel are final.',
    ],
    judging: [
      'Accuracy of responses',
      'Speed where applicable',
      'Team coordination',
      'Overall performance across all rounds',
    ],
    rounds: ['General IT Knowledge', 'Rapid Fire', 'Visual Identification', 'Audio / Video', 'Buzzer', 'Surprise / Special'],
    motto: 'Think Fast. Answer Smart. Stay Ahead.',
    head: 'Siddhant Fatehpuria',
    deputies: [],
  },
  {
    slug: 'algorithm-challenge',
    brand: 'Algorithm Challenge',
    technical: 'Competitive programming',
    category: 'software',
    categoryLabel: 'Code',
    participants: 1,
    control: 'Paper design, then code',
    sim: 'complexity',
    tagline: 'Design before you code. On paper. It is marked.',
    summary: 'A coding contest requiring participants to design their solution on paper before implementation, judged on logic and code.',
    lede: 'Implementation may not begin until the paper design is complete and submitted. The design carries more than a third of the marks on its own.',
    rules: [
      'Participants demonstrate logical thinking, structured problem-solving and clean coding practices.',
      'Phase 1 (Design Before You Code): every participant must prepare a solution design on paper using a flowchart, pseudocode or step-by-step logic. Code implementation begins only after the paper design is complete.',
      'Phase 2 (Code Implementation): implement the solution in Python, Java, C or C++. Programs must be correct, efficient, well-structured, and capable of handling all valid test cases.',
    ],
    judging: [
      'Submissions undergo three LeetCode-style passes',
      'Weightage is given to both the algorithmic solution and the actual implementation',
    ],
    rubric: { total: 100, unit: '%', rows: [
      { label: 'Design', marks: 35 },
      { label: 'Code', marks: 45 },
      { label: 'Passing all test cases', marks: 20 },
    ]},
    languages: ['Python', 'Java', 'C', 'C++'],
    head: 'Udayan Narayan',
    deputies: [],
  },
  {
    slug: 'the-black-box',
    brand: 'The Black Box',
    technical: 'Applied machine learning',
    category: 'ml',
    categoryLabel: 'Machine learning',
    participants: 2,
    control: 'Five phases',
    sim: 'confusion',
    tagline: 'The dataset is broken on purpose. Find out how.',
    summary: 'Teams audit a flawed dataset, train a model, diagnose errors, and improve and retest their solution.',
    lede: 'You write down where you think the model will fail before you are allowed to train it. Accuracy alone is not enough. The marks are in the diagnosis.',
    rules: [
      'Teams open a sealed envelope containing a deliberately broken image dataset: imbalanced classes, colour and background bias, blurry shots, missing samples, and hidden artefacts such as stickers, hands and background cues. No prior access is allowed.',
      'Phase 1 (Autopsy): audit the data on paper. Log class counts, duplicate angles, lighting issues, background leaks and missing samples. Write a failure prediction: where will the model break, and why? Training starts only after this is submitted.',
      'Phase 2 (Baseline): train the model in Google Teachable Machine. Record overall accuracy, per-class scores and confidence. It must work across all classes.',
      'Phase 3 (Hunt): judges hand out 30 unseen test images. Test each, fill a confusion matrix, tag every error (colour bias, background bias, angle, occlusion, too few samples), tally them, and name your top two failure modes.',
      'Phase 4 (Override): shoot up to 10 targeted photos fixing those top two errors. Retrain. Re-test the same 30 images. Log hypothesis, fix, before/after numbers and trade-offs.',
      'Phase 5 (Presentation): walk the judges through what you found, what failed, what you fixed, what improved and what you learned. One judge question.',
    ],
    judging: [
      'How well you audited, predicted and planned',
      'How effectively the team identified and justified trade-offs',
      'Accuracy on the hidden test set after your fix',
      'Three review passes per team',
    ],
    rubric: { total: 100, unit: '%', rows: [
      { label: 'Design: data autopsy and strategy', marks: 35 },
      { label: 'Model performance and improvement', marks: 45 },
      { label: 'Passing the unseen challenge set', marks: 20 },
    ]},
    platform: 'Google Teachable Machine, web-based, no account required. Webcam for data collection. No code required.',
    errorTypes: ['Colour bias', 'Background bias', 'Angle', 'Occlusion', 'Too few samples'],
    testSetSize: 30,
    fixBudget: 10,
    seniorVersion: tbc('The senior variant (“System Override”) has no content written yet; juniors run “Glitch Hunters”. Is the fest running an age split here?'),
    head: 'Abin Mukherjee',
    deputies: [],
  },
];

/* ── Rules and regulations — verbatim from the brochure [B] ──────────────── */

export const RULES = [
  'Invitation is open to all IPSC member schools. Registration closes on 25th September 2026, by which date schools must forward an event-wise list of participants.',
  'Complete documentation for each event, including the detailed judging rubrics, will be released to all registered schools soon. This documentation will serve as the definitive reference for all participating schools.',
  'Teams design, build and bring their own robots. Robots are not provided, and shall not be built from scratch on campus on the day of the event.',
  'The competition is open to students of classes 9 to 12.',
  'Each school may send a maximum of 8 students, accompanied by 1 faculty advisor.',
  'Participants must bring their own laptops. The Hackathon Challenge is conducted on participants’ own machines.',
  'Robotics teams must bring their own tools, spares and consumables.',
  'Batteries must comply with the limits in each event’s robot specification. Damaged or swollen cells will not be permitted on campus.',
  'Destructive mechanisms are prohibited across all robotics events. No robot may be capable of damaging an opponent, the arena or its components.',
  'Internet access is provided where an event requires it and withheld where it does not, as stated in that event’s rulebook. Mobile phones may not be used during any competition round.',
  'Any unfair practice results in immediate disqualification. Judges assess all performances; where a referee or quizmaster officiates, their decision is final.',
  'Teams are expected to arrive by 5:00 p.m. on 7 December 2026. Alternatively, teams may arrive on the morning of 8 December 2026. Teams may depart after the Closing Ceremony on 10 December 2026, which is expected to conclude by 2:00 p.m.',
  'Schools are requested to make their own travel arrangements to and from The Doon School, Dehradun.',
  'The Host School will provide accommodation and meals for all participating teams and their accompanying faculty advisor who opt to stay on the school campus. Registration charges, as well as boarding and lodging expenses, will be applicable as per the IPSC Charter.',
  'All participants must carry school identity cards; those without proper identification will not be permitted to compete. Team escorts are responsible for the conduct of their teams at all times; any breach of discipline will lead to disqualification, in which event the rules and norms prescribed by the host school shall be followed.',
];

/* ── Schedule — "IPSC_Schedule (11 September draft)" ─────────────────────────
   Transcribed from assets/event schedule/. That draft carries 2025 weekdays
   (it calls 8 December a Monday); the weekdays below are the 2026 ones.
   Events are named by their fest names, not the draft's technical names:
   Tele-op Robotics = Build-Different, SLAM = Terra Incognita,
   AI Challenge = The Black Box, AGV Navigation = Half-Life,
   SumoBot = Brinkmanship, LeetCode Challenge = Algorithm Challenge.
   A venue left blank in the draft is left blank here. */

/* Venue names as they are actually used at Chandbagh. The schedule is written
   in abbreviations; only expand one where the expansion is verified.
   BML — confirmed from school circulars ("BML Munjal Auditorium").
   CDH — the abbreviation is used school-wide for the dining hall, but the
         expansion is not confirmed in writing, so it is not asserted here. */
export const VENUES = {
  BML: 'BML Munjal Auditorium',
  CDH: 'CDH',
  AMC: 'AMC',
  IT: 'IT Centre',
};

export const SCHEDULE = [
  {
    day: 'Setup', date: 'Sunday, 6 December', role: 'Setup & preparation', internal: true,
    slots: [
      { time: 'All day', title: 'Arena construction and testing', detail: 'All four robotics arenas built and tested', venue: 'BML', track: 'logistics' },
      { time: 'All day', title: 'House preparation', detail: 'Boarding houses readied for visiting delegations', venue: '', track: 'logistics' },
      { time: 'All day', title: 'Platform testing', detail: 'All coding platforms tested end to end', venue: 'IT', track: 'code' },
    ],
  },
  {
    day: 'Arrival', date: 'Monday, 7 December', role: 'Arrival day',
    slots: [
      { time: 'From 10:00', title: 'Visiting schools arrive', venue: 'Main Gate', track: 'logistics' },
      { time: 'On arrival', title: 'Registration desk opens', detail: 'Guides escort each group to its house', venue: 'Main Gate · Houses', track: 'logistics' },
      { time: 'On arrival', title: 'Welcome pack', detail: 'Event passes, schedule and Wi-Fi credentials issued; teachers briefed', venue: 'Main Building · Houses', track: 'logistics' },
      { time: '19:00 – 20:30', title: 'Welcome Dinner', venue: 'CDH', track: 'meal' },
    ],
  },
  {
    day: 'Day One', date: 'Tuesday, 8 December', role: 'Competition day 1',
    slots: [
      { time: '08:30 – 09:00', title: 'Breakfast', venue: 'CDH', track: 'meal' },
      { time: '09:00 – 09:45', title: 'Opening Ceremony', venue: 'BML', track: 'ceremony', key: true },
      { time: '10:00 – 10:30', title: 'Hackathon brief and school tour', venue: 'AMC', track: 'hack' },
      { time: '10:30 – 12:30', title: 'Build-Different: qualifying', venue: 'IT Centre / BML', track: 'robotics', event: 'build-different' },
      { time: '11:00 – 11:30', title: 'Mid-morning break', detail: 'Build-Different continues', track: 'meal' },
      { time: '12:30 – 14:00', title: 'Build-Different: qualifying', venue: 'BML', track: 'robotics', event: 'build-different' },
      { time: '13:45 – 14:30', title: 'Lunch', venue: 'CDH', track: 'meal' },
      { time: '14:30 – 16:00', title: 'IT Quiz: preliminary round', venue: 'IT', track: 'code', event: 'it-quiz' },
      { time: '14:30 – 16:00', title: 'Terra Incognita', venue: 'BML', track: 'robotics', event: 'terra-incognita' },
      { time: '16:00 – 17:00', title: 'Tea', track: 'meal' },
      { time: '16:00 – 17:30', title: 'Terra Incognita continues', track: 'robotics', event: 'terra-incognita' },
      { time: '17:30 – 18:00', title: 'Build-Different: finals', venue: 'BML', track: 'robotics', event: 'build-different' },
      { time: '18:00 – 19:00', title: 'Break', venue: 'BML', track: 'meal' },
      { time: '19:00 – 21:00', title: 'Headmaster’s Dinner', track: 'ceremony', key: true },
    ],
  },
  {
    day: 'Day Two', date: 'Wednesday, 9 December', role: 'Competition day 2',
    slots: [
      { time: '08:00 – 08:30', title: 'Breakfast', venue: 'CDH', track: 'meal' },
      { time: '09:00 – 12:00', title: 'The Black Box', venue: 'IT', track: 'ml', event: 'the-black-box' },
      { time: '09:00 – 12:00', title: 'Half-Life', venue: 'BML', track: 'robotics', event: 'half-life' },
      { time: '11:00 – 12:00', title: 'Break', track: 'meal' },
      { time: '11:30 – 13:30', title: 'Brinkmanship', venue: 'BML', track: 'robotics', event: 'brinkmanship' },
      { time: '13:30 – 14:30', title: 'Lunch', venue: 'CDH', track: 'meal' },
      { time: '14:30 – 16:30', title: 'IT Quiz: final', venue: 'BML', track: 'code', event: 'it-quiz', key: true },
      { time: '17:00 – 18:30', title: 'Algorithm Challenge', venue: 'IT', track: 'code', event: 'algorithm-challenge' },
      { time: '19:00 – 20:00', title: 'Dinner', venue: 'CDH', track: 'meal' },
    ],
  },
  {
    day: 'Day Three', date: 'Thursday, 10 December', role: 'Closing day',
    slots: [
      { time: '08:00 – 08:30', title: 'Breakfast', venue: 'CDH', track: 'meal' },
      { time: '09:00 – 13:00', title: 'Hackathon project presentations', track: 'hack', event: 'hackathon', key: true },
      { time: '11:00 – 11:30', title: 'Break', track: 'meal' },
      { time: '13:00 – 14:00', title: 'Brinkmanship: junior and senior finals', track: 'robotics', event: 'brinkmanship' },
      { time: '14:00 – 15:00', title: 'Lunch', venue: 'CDH', track: 'meal' },
      /* The draft prints "1:00 – 19:00", a dropped digit. 17:00 is the start the
         previous draft gave, and the end time is unchanged. */
      { time: '17:00 – 19:00', title: 'Closing Ceremony', detail: 'Prize distribution and winner announcements', venue: 'BML', track: 'ceremony', key: true },
      { time: 'From 18:00', title: 'Departures begin', detail: 'Schools check out of houses. 10 December night or 11 December morning.', venue: 'Main Gate · Houses', track: 'logistics' },
    ],
  },
];

/* Internal only — surfaced in the build report, never on the page. A visiting
   school has no use for our unresolved internal disagreements; it needs one
   answer, and we owe it to them to settle this before the schedule is issued. */
export const SCHEDULE_CONFLICTS = [
  tbc('Closing Ceremony: brochure says it concludes by 14:00 on 10 December; the draft schedule runs it 17:00–19:00. Schools have been sent the 14:00 figure.'),
];

/* ── Key dates [M] ───────────────────────────────────────────────────────── */

export const MILESTONES = [
  { date: '25 September 2026', iso: '2026-09-25', title: 'Registration closes', detail: 'Schools forward event-wise participant lists.', key: true },
  { date: 'Coming soon', title: 'Documentation released', detail: 'Full rules and detailed judging rubrics will be released to every registered school.', key: true },
  { date: 'Coming soon', title: 'Charges communicated', detail: 'Registration, boarding and lodging charges as per the IPSC Charter.' },
  { date: '5 December 2026', iso: '2026-12-05', title: 'School term ends', detail: 'The Doon School term concludes.' },
  { date: '7 December 2026', iso: '2026-12-07', title: 'Arrivals', detail: 'Teams arrive by 17:00, or on the morning of 8 December.', key: true },
  { date: '8–10 December 2026', iso: '2026-12-08', title: 'The Fest', detail: 'Three days, eight events.', key: true },
];

/* ── Organising committee [M] ────────────────────────────────────────────── */

export const COMMITTEE = {
  masters: {
    label: 'Masters-in-Charge',
    people: [
      { name: 'Mr Harshal Gunwant', code: 'HGT', note: 'Department of Computer Science' },
      { name: 'Mr Ashutosh Tripathi', code: 'ATI' },
      { name: tbc('VSM: full name of Master-in-Charge coded VSM'), code: 'VSM' },
      { name: tbc('SHM: full name of Master-in-Charge coded SHM'), code: 'SHM' },
    ],
  },
  students: {
    label: 'Students-in-Charge',
    people: [
      { name: 'Aarav Anand' },
      { name: 'Ved Agrawal' },
      { name: 'Hridhay Kanodia' },
    ],
  },
  portfolios: {
    label: 'Portfolios',
    people: [
      { name: 'Udayan Narayan', note: 'Participant Affairs' },
      { name: 'Abin Mukherjee', note: 'Design' },
    ],
  },
};

/* ── Resources [B][M] ────────────────────────────────────────────────────── */

/* `href` is a path under assets/ or a full URL. A row with `download` set gets
   a Download button that saves the file under that name instead of opening it. */
export const RESOURCES = [
  { title: 'Event brochure', kind: 'Brochure', status: 'available', note: 'All eight events, rules and regulations. The version circulated to Heads of School.', href: 'assets/brochure/IPSC IT FEST 2026 (1).pdf', download: 'IPSC-IT-Fest-2026-Brochure.pdf' },
  { title: 'Registration form', kind: 'Form', status: 'available', note: 'School details and event-wise participant information.', href: CONFIG.registration.formUrl },
  { title: 'Complete event documentation', kind: 'Rulebooks', status: 'pending', note: 'Rulebook, robot specification, arena specification, judging rubric, inspection & safety, and support material for each event. We will release these soon.' },
  { title: 'Detailed judging rubrics', kind: 'Rubrics', status: 'pending', note: 'Criteria, point values, scoring levels and tie-break order for every event. Released with the documentation.' },
  { title: 'Participant handbook', kind: 'Handbook', status: 'pending', note: 'Campus, houses, meals, medical, conduct and daily logistics for visiting delegations.' },
];


/* ── FAQ ─────────────────────────────────────────────────────────────────── */

export const FAQ = [
  { group: 'Registration', items: [
    { q: 'Who may enter?', a: 'All IPSC member schools. The competition is open to students of Classes 9 to 12.' },
    { q: 'How large a delegation may we send?', a: 'A maximum of 8 students, accompanied by 1 faculty advisor. One student may participate in a maximum of 3 events.' },
    { q: 'When does registration close?', a: 'On 25 September 2026. By that date schools must forward an event-wise list of participants. An earlier draft of the brochure carried 10 September; the version circulated to Heads of School gives 25 September, and that is the date in force.' },
    { q: 'How do we register?', a: 'Through the Google Form circulated with the Headmaster’s invitation letter. It asks for school details and event-wise participant information.' },
    { q: 'What does it cost?', a: 'Registration charges and boarding and lodging expenses are applicable as per the provisions of the IPSC Charter. We will release detailed figures to registered schools soon.' },
  ]},
  { group: 'Before you travel', items: [
    { q: 'Are robots provided?', a: 'No. Teams design, build and bring their own robots. Robots may not be built from scratch on campus on the day of the event. Tuning, debugging and repair on site are expected and permitted.' },
    { q: 'What must we bring?', a: 'Laptops for every participant. Robotics teams must also bring their own tools, spares and consumables. The Hackathon is conducted on participants’ own machines.' },
    { q: 'What are the battery rules?', a: 'Batteries must comply with the limits stated in each event’s robot specification, which will be published with the complete documentation soon. Damaged or swollen cells will not be permitted on campus.' },
    { q: 'When will we see the full rules?', a: 'Full documentation for each event, including detailed judging rubrics, will be released to all registered schools soon. The brochure and this website give an overview; that documentation gives the complete rules.' },
  ]},
  { group: 'On campus', items: [
    { q: 'When should we arrive?', a: 'By 5:00 p.m. on 7 December 2026. Teams may alternatively arrive on the morning of 8 December 2026.' },
    { q: 'When may we leave?', a: 'After the Closing Ceremony on 10 December 2026, which is expected to conclude by 2:00 p.m.' },
    { q: 'Is accommodation provided?', a: 'Yes. The host school provides accommodation and meals for all participating teams and their accompanying faculty advisor.' },
    { q: 'Is travel arranged?', a: 'No. Schools make their own travel arrangements to and from The Doon School, Dehradun.' },
    { q: 'Do participants need identification?', a: 'Yes. All participants must carry school identity cards. Those without proper identification will not be permitted to compete.' },
  ]},
  { group: 'During competition', items: [
    { q: 'Is there internet access?', a: 'Internet access is provided where an event requires it and withheld where it does not, as stated in that event’s rulebook. Mobile phones may not be used during any competition round.' },
    { q: 'May we use AI tools?', a: 'It depends on the event, and each rulebook states its position. In the Hackathon, AI assistance is permitted for development and design, but teams must demonstrate a profound understanding of their entire output. The Black Box runs on Google Teachable Machine, which requires no code.' },
    { q: 'What is prohibited in the robotics arenas?', a: 'Destructive mechanisms, across every robotics event and not only Brinkmanship. No robot may be capable of damaging an opponent, the arena or its components. In Brinkmanship specifically: no blades, flame, liquids or projectiles, and no artificial downforce such as vacuum suction or sticky tyres.' },
    { q: 'How are disputes settled?', a: 'Judges assess all performances. Where a referee or quizmaster officiates, their decision is final. Any unfair practice results in immediate disqualification.' },
  ]},
];

/* ── Chandbagh — the host campus ─────────────────────────────────────────── */
/* ARCHIVED. The Chandbagh sheet is not built or linked for now; this data is
   kept so the page can be restored later. See the note above NAV. */

export const CHANDBAGH = {
  lede: 'Chandbagh is the campus of The Doon School: seventy acres on Mall Road, in the valley below the first ridge of the Himalaya. It has been the school\u2019s home since it opened, and it is where the fest is held.',
  history: tbc('A short paragraph on the school and on Chandbagh (founding, the grounds, what the name means) in the school\u2019s own words'),
  life: tbc('A paragraph on life at Chandbagh during a fest: the houses, the routine visiting delegations join, what the campus feels like in December'),
  spaces: [
    { code: 'BML Munjal Auditorium', name: 'BML Munjal Auditorium', use: 'The Opening and Closing Ceremonies, the robotics arenas, and the IT Quiz final.' },
    { code: 'IT Centre', name: 'IT Centre', use: 'The Algorithm Challenge, The Black Box, and the IT Quiz preliminary round.' },
    { code: 'AMC', name: 'AMC', use: 'The Hackathon briefing and the companies\u2019 working space. Campus fabrication resources, including 3D printing, are available to hardware projects.' },
    { code: 'CDH', name: 'CDH', use: 'All meals across the three days.' },
  ],
  houses: 'Visiting delegations stay in the school\u2019s boarding houses, and are met at the Main Gate on arrival.',
  travel: [
    { mode: 'By air', detail: tbc('Nearest airport and approximate transfer time') },
    { mode: 'By rail', detail: tbc('Dehradun railway station and approximate transfer time') },
    { mode: 'By road', detail: tbc('Road approach from Delhi and other cities') },
  ],
};

/* ── People ───────────────────────────────────────────────────────────────
   One registry for everyone who appears on the site. Photographs live at
   assets/people/<slug>.jpg — drop a file in and it appears; until then the
   page draws a labelled portrait frame in its place, so a missing photograph
   is visible rather than silently absent.

   Recommended: 1:1 crop, 800×800 or larger, head and shoulders, JPEG.
   ------------------------------------------------------------------------ */

export const PEOPLE = {
  /* Masters-in-Charge */
  'harshal-gunwant': {
    name: 'Mr Harshal Gunwant', code: 'HGT', role: 'Master-in-Charge',
    note: 'Head of Department, Computer Science & Technology',
    bio: tbc('Write-up for Mr Harshal Gunwant (HGT), around 180 words'),
  },
  'ashutosh-tripathi': {
    name: 'Mr Ashutosh Tripathi', code: 'ATI', role: 'Master-in-Charge',
    note: 'Robotics',
    bio: tbc('Write-up for Mr Ashutosh Tripathi (ATI), around 180 words'),
  },
  'vishal-mohla': {
    name: 'Mr Vishal Mohla', code: 'VSM', role: 'Master-in-Charge',
    bio: tbc('Write-up for Mr Vishal Mohla (VSM), around 180 words, in the register of the DSMUN secretariat page'),
  },
  'shubham-sharma': {
    name: 'Mr Shubham Sharma', code: 'SHM', role: 'Master-in-Charge',
    bio: tbc('Write-up for Mr Shubham Sharma (SHM), around 180 words'),
  },

  /* Students-in-Charge */
  'aarav-anand': {
    name: 'Aarav Anand', role: 'Student-in-Charge',
    bio: tbc('Write-up for Aarav Anand, around 180 words: form, subjects, roles held in school, what he runs on the fest'),
  },
  'ved-agrawal': {
    name: 'Ved Agrawal', role: 'Student-in-Charge',
    bio: 'Ved is a Grade 11 student at The Doon School pursuing the IB Diploma Programme, with a keen interest in Physics, Mathematics and Robotics. He serves as the Student-in-Charge of Robotics and Artificial Intelligence. He has represented the School at the CISCE Inter-School Robotics Championship, the Asian Regional Space Settlement Design Competition and the World Robot Olympiad. He also writes on philosophy and cultural criticism. In his free time, he enjoys listening to Peter Cat Recording Co. He is honoured to serve as a Student-in-Charge of the IPSC IT Fest 2026.',
  },
  'hridhay-kanodia': {
    name: 'Hridhay Kanodia', role: 'Student-in-Charge',
    bio: tbc('Write-up for Hridhay Kanodia, around 180 words: form, subjects, roles held in school, what he runs on the fest'),
  },

  /* Portfolios */
  'udayan-narayan': {
    name: 'Udayan Narayan', role: 'Event Head, Algorithm Challenge',
    bio: tbc('Bio for Udayan Narayan, Algorithm Challenge'),
  },
  'abin-mukherjee': {
    name: 'Abin Mukherjee', role: 'Event Head, The Black Box',
    bio: tbc('Bio for Abin Mukherjee, The Black Box'),
  },

  /* Event heads */
  'trijat-sah':          { name: 'Trijat Sah', role: 'Event Head, Terra Incognita', bio: tbc('Bio for Trijat Sah, Terra Incognita (SLAM)') },
  'samrat-gupta':        { name: 'Samrat Gupta', role: 'Event Head, Half-Life', bio: 'Samrat is a Grade 11 student at The Doon School pursuing the ISC curriculum, with a keen interest in Robotics and Artificial Intelligence, and hopes to build a career where technology meets business and finance. He serves as the House Robotics Captain, training juniors and organising builds for his house. He has represented the School at the STEM Innovation Challenge in Mumbai and at the World Robotics Olympiad. He follows politics closely and plays whatever sport comes his way. He is honoured to serve as the Event Head of Half-Life at the IPSC IT Fest 2026.' },
  'arnav-kharpude':      { name: 'Arnav Kharpude', role: 'Event Head, Build-Different', bio: tbc('Bio for Arnav Kharpude, Build-Different (Tele-Op)') },
  'atiksh-kasana':       { name: 'Atiksh Kasana', role: 'Event Head, Brinkmanship', bio: 'Atiksh is a student at The Doon School pursuing the IB Diploma Programme, with a keen interest in design. He serves as the Boy-in-Charge of the Design and Technology Society. An aspiring automotive designer, he draws much of his inspiration from Formula One, whose engineering he follows as closely as its racing. He is also a committed sportsman, playing football and basketball and swimming regularly. In his free time, he enjoys sketching cars and watching a race weekend. He is honoured to serve as the Event Head of Brinkmanship at the IPSC IT Fest 2026.' },
  'vir-sandhu':          { name: 'Vir Sandhu', role: 'Event Head, Hackathon', bio: tbc('Bio for Vir Sandhu, Hackathon') },
  'siddhant-fatehpuria': { name: 'Siddhant Fatehpuria', role: 'Event Head, IT Quiz', bio: 'Siddhant is a Grade 11 student at The Doon School pursuing the IB Diploma Programme, with a keen interest in Science and Technology. He is a core member of both the Mathematics and Science Societies, and serves as the President of the School’s Space Settlement Design Competition team. An avid quizzer, he also follows geopolitics and current affairs closely. In his free time, he enjoys reading on world affairs and setting questions his friends cannot answer. He is delighted to serve as the Event Head of the IT Quiz at the IPSC IT Fest 2026.' },

  /* Deputy event heads — portrait only, no write-up */
  'aaryansh-kejriwal': { name: 'Aaryansh Kejriwal', role: 'Deputy Event Head' },
  'arnav-kejriwal':    { name: 'Arnav Kejriwal', role: 'Deputy Event Head' },
  'vivaan-kumbhat':    { name: 'Vivaan Kumbhat', role: 'Deputy Event Head' },
  'dhrubo-mishra':     { name: 'Dhrubo Mishra', role: 'Deputy Event Head' },
  'yug-jain':          { name: 'Yug Jain', role: 'Deputy Event Head' },
  'atharv-jajodia':    { name: 'Atharv Jajodia', role: 'Deputy Event Head' },
  'osman-kareem-huq':  { name: 'Osman Kareem Huq', role: 'Deputy Event Head' },
};

/** Who runs each event. Heads get a portrait and a write-up; deputies a portrait. */
export const EVENT_STAFF = {
  'terra-incognita':     { heads: ['trijat-sah'],          deps: ['aaryansh-kejriwal', 'arnav-kejriwal'] },
  'half-life':           { heads: ['samrat-gupta'],        deps: ['vivaan-kumbhat'] },
  'build-different':     { heads: ['arnav-kharpude'],      deps: ['dhrubo-mishra', 'yug-jain'] },
  'brinkmanship':        { heads: ['atiksh-kasana'],       deps: ['atharv-jajodia'] },
  'hackathon':           { heads: ['vir-sandhu'],          deps: [] },
  'it-quiz':             { heads: ['siddhant-fatehpuria'], deps: [] },
  'algorithm-challenge': { heads: ['udayan-narayan'],      deps: [] },
  'the-black-box':       { heads: ['abin-mukherjee'],      deps: [] },
};

/** The committee, grouped for the team page. Order is the order shown. */
/* The team sheet carries the Students-in-Charge and then the Masters-in-Charge,
   and nobody else. Event heads appear on their own event pages, where a reader
   who cares about that event will actually be looking for them. */
export const TEAM = [
  { label: 'Students-in-Charge', slugs: ['aarav-anand', 'ved-agrawal', 'hridhay-kanodia'] },
];

/* ── Letters from the Students-in-Charge ──────────────────────────────────
   Three letters, opened one at a time on the home page.

   `key`     one line, pulled out large. The sentence the letter turns on.
   `opening` the first few lines, shown before the letter is opened.
   `body`    the rest, shown when it is. Paste the real text over the tbc()
             and the ruled placeholder is replaced by the letter itself.
   ------------------------------------------------------------------------ */

export const LETTERS = [
  {
    slug: 'aarav-anand',
    title: 'Letter from the Students-in-Charge',
    key: "The best parts of life rarely come from knowing exactly what we are doing.",
    opening: "Over the three days in December, the IPSC IT Fest will be rather more than a competition. It will be a place where ideas collide, where friendships begin, where plans fail spectacularly, and where somebody discovers, usually at the worst possible moment, that the solution was much simpler than they thought.",
    body: [
      "As Student-in-Charge of Computer Science, I have the privilege of welcoming you to The Doon School. Beyond the events, the points and the trophies, I hope this fest reminds us of something fairly fundamental: that the best parts of life rarely come from knowing exactly what we are doing.",
      "We will make mistakes. We will improvise. We will start over. We will find people who think differently from us, and some of us will discover that they teach us more in three days than a textbook manages in a term.",
      "So come with ambition, but also with curiosity. Come to win, but be willing to lose. Come prepared, but leave room for the unexpected, because the events have been built to supply rather a lot of it.",
      "“Stay hungry. Stay foolish,” as Stewart Brand put it. For three days at Chandbagh we will step outside the ordinary and build something worth remembering.",
      "Welcome to the IPSC IT Fest 2026.",
    ],
  },
  {
    slug: 'ved-agrawal',
    title: 'Letter from the Students-in-Charge',
    key: "The machine was opaque to me at precisely the moment I needed it not to be.",
    opening: "At a robotics competition 2 years ago, I entered a maze solver. It had worked in the lab. On the day, it did nothing but drive into a wall, the same wall, several times, with a kind of confidence that was hard to watch. I stood there for the length of the run and understood almost nothing about why.",
    body: [
      "The failure itself is ordinary. Every team arriving in December will have one.",
      "What has stayed with me is narrower than the failure: I could not have told you where it began. Not the sensor, not the threshold, not the line of logic that had stopped being true somewhere between the lab and the arena. The machine was opaque to me at precisely the moment I needed it not to be, and standing in front of it was never going to open it.",
      "None of what would have opened it was a secret to me. Printing what the sensors were actually reading. Changing one thing and holding the rest as is. Running it again to see whether the failure came back with it. I knew all of this in the lab, where there was time and nobody was watching. In the arena, there was a clock, an audience, and a robot that had stopped making sense, and I did what most people do in front of something that has stopped making sense. I looked at it harder, as though it might be embarrassed into behaving.",
      "Most of this fest is built around some version of that moment. The Black Box gives you a dataset broken on purpose and makes you write down where your model will fail before you are allowed to train it. The Hackathon gives you a problem you have not seen and a company of people from schools you have never gone to, and people, unhelpfully, cannot be made to print what they are thinking.",
      "Building this fest, I kept returning to that wall, partly out of something like wisdom and mostly out of spite. Every document we have written for these events, from rulebooks to support material to arena diagrams, exists so that if your robot drives into a wall in December, it is at least a wall it has met before. No document takes the clock out of the arena, though. Or the people watching. Or the moment the thing you built simply stops answering you.",
      "We will see you at Chandbagh in December. Something there will refuse to explain itself to you, as mine did. It might be a robot. It might be a model, or a program, or a teammate you met that morning.",
    ],
  },
  {
    slug: 'hridhay-kanodia',
    title: 'Letter from the Students-in-Charge',
    key: tbc('Hridhay Kanodia: the one line his letter turns on'),
    opening: tbc('Hridhay Kanodia: opening three or four lines, shown on the closed card'),
    body: tbc('Hridhay Kanodia: the rest of the letter'
),
  },
];


/* ── Event document packs ─────────────────────────────────────────────────
   Six documents per event, in the same order every time. Each carries a `href`
   that is a tbc() until the Drive link exists — the row still renders, marked
   as not yet released, so schools can see exactly what is coming.

   Ved's proposal to SHM on 2 September was to hang a Drive link off each
   event's page rather than wait for one bundled release; this is that shape.
   ------------------------------------------------------------------------ */

const packDoc = (n, title, detail, note) => ({ n, title, detail, note });

export const EVENT_DOCS = (ev) => {
  const robotics = ev.category === 'robotics';
  return [
    packDoc(1, 'Rulebook',
      'Description and objective, team composition, format and progression, run structure and timings, permitted and prohibited actions, penalties, appeals, and definitions.'),
    robotics
      ? packDoc(2, 'Robot Specification',
          'Dimensions at start and expanded, mass, power source and voltage limits, permitted actuators and sensors, control method, communication protocol, prohibited materials.')
      : packDoc(2, 'Platform & Environment Specification',
          'Languages and libraries permitted, devices brought versus provided, internet access, policy on AI tools, provided datasets and platforms, submission format.'),
    robotics
      ? packDoc(3, 'Arena Specification',
          'A dimensioned scale drawing in plan view, all fixed dimensions with tolerances, surface material and finish, wall heights, printable colour references, and the exact range of any variation between rounds.',
          'A school must be able to build a practice replica from this document alone.')
      : null,
    packDoc(4, 'Judging Rubric',
      'Criteria with point values summing to a stated total, scoring levels, tie-break order, who scores what, and when scores are published.'),
    packDoc(5, 'Inspection & Safety',
      'Pre-competition inspection checklist and schedule, consequences of failed inspection, safety requirements during runs, spectator boundaries, and the emergency stop procedure.'),
    packDoc(6, 'Support Material',
      'A worked example, a starter guide to core techniques, the concepts a team should learn, common mistakes, and an FAQ.'),
  ].filter(Boolean);
};

/* Drive links, per event, filled in as each pack is signed off. Keys are event
   slugs; values map document number to a URL. Anything absent renders as
   "not yet released" rather than a dead link. */
export const EVENT_DOC_LINKS = {
  'terra-incognita': {},
  'half-life': {},
  'build-different': {},
  'brinkmanship': {},
  'hackathon': {},
  'it-quiz': {},
  'algorithm-challenge': {},
  'the-black-box': {},
};

/* ── Welcome ──────────────────────────────────────────────────────────────
   Adapted from the Headmaster's invitation letter to IPSC member schools
   (Drive, 29 August 2026). This is the school's own voice and the register
   the rest of the site should sit beside.
   ------------------------------------------------------------------------ */

export const WELCOME = {
  from: 'Dr Jagpreet Singh',
  role: 'Headmaster, The Doon School',
  key: 'A celebration of technology, innovation and problem-solving.',
  paras: [
    'It is a pleasure to invite all member schools of the Indian Public Schools’ Conference to the IPSC IT Fest 2026, hosted by The Doon School from 8 to 10 December 2026.',
    'This year’s fest features eight carefully curated events, designed in collaboration with academic and technology experts. They range across autonomous robotics, tele-operated engineering, competitive programming, applied machine learning and a cross-school hackathon. Together they ask rather more of a team than technical skill alone.',
    'We look forward to welcoming schools to Chandbagh in December, and to three days in which young people from across the country build, compete and learn from one another.',
  ],
};
