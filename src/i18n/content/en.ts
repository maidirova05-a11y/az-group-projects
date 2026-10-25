import type { ContentTranslationSource } from '../../../shared/i18n';

/** English translations of src/data/*.ts content. Keys: shared/i18n.ts → ContentTranslationSource. */
const t: ContentTranslationSource = {
  programs: {
    'fibonacci-math': { name: 'Fibonacci', subtitle: 'International Math Olympiad' },
    'atlantia-science': { name: 'Atlantia', subtitle: 'Science Olympiads' },
    itecx: { name: 'ITECX', subtitle: 'Science Congress' },
    eurika: { name: 'Eurika', subtitle: 'Online Olympiad' },
    'atlantia-stem': { name: 'Atlantia STEM', subtitle: 'Robotics Olympiads' },
    'astana-tech-cup': { name: 'Astana Tech Cup', subtitle: 'Robotics and Drone Championship' },
    'fibonacci-robot': { name: 'Fibonacci Robot', subtitle: 'International Robot Olympiad' },
    'robocoach-academy': { name: 'RoboCoach Academy', subtitle: 'Robotics training for teachers' },
    'smart-robot-games': { name: 'Smart Robot Games', subtitle: 'Robotics tournament' },
    'robocoach-cup': { name: 'RoboCoach Cup', subtitle: 'Tournament for teachers' },
    'ascora-fest': { name: 'Ascora Fest', subtitle: 'Education fair' },
    'ascora-camp': { name: 'Ascora Camp', subtitle: 'Camps abroad' },
    'ascora-international': { name: 'Ascora International', subtitle: 'Educational trips' },
  },

  events: {
    'fibonacci-math#0': { label: '17 October 2026', place: 'Astana' },
    'fibonacci-math#1': { label: '14 November 2026', place: 'Astana' },
    'fibonacci-math#2': { label: '19 December 2026', place: 'Astana' },
    'fibonacci-math#3': { label: '13 February 2027', place: 'Astana' },
    'fibonacci-math#4': { label: 'April 2027', place: 'Antalya' },
    'fibonacci-math#5': { label: 'May 2027', place: 'Rome' },

    'atlantia-science#0': { label: '24 October 2026', place: 'Astana' },
    'atlantia-science#1': { label: '21 November 2026', place: 'Astana' },
    'atlantia-science#2': { label: '12 December 2026', place: 'Astana' },
    'atlantia-science#3': { label: '20 February 2027', place: 'Astana' },
    'atlantia-science#4': { label: 'January 2027', place: 'Antalya' },
    'atlantia-science#5': { label: 'May 2027', place: 'Barcelona' },

    'itecx#0': { label: '18 September 2026', place: 'Astana' },
    'itecx#1': { label: '13 March 2027', place: 'Astana' },
    'itecx#2': { label: '5 May 2027', place: 'Astana' },
    'itecx#3': { label: 'November 2026', place: 'Rome' },
    'itecx#4': { label: 'April 2027', place: 'Antalya' },
    'itecx#5': { label: 'November 2027', place: 'Rome' },

    'eurika#0': { label: 'Throughout the school year', place: 'Online' },

    'atlantia-stem#0': { label: '12 December 2026', place: 'Astana' },
    'atlantia-stem#1': { label: 'January 2027', place: 'Antalya' },
    'atlantia-stem#2': { label: 'May 2027', place: 'Barcelona' },

    'astana-tech-cup#0': { label: '15–16 May 2027', place: 'Astana' },

    'fibonacci-robot#0': { label: '20–25 November 2026', place: 'Rome' },
    'fibonacci-robot#1': { label: '27–28 February 2027', place: 'Astana' },
    'fibonacci-robot#2': { label: 'April 2027', place: 'Antalya' },
    'fibonacci-robot#3': { label: 'November 2027', place: 'Rome' },

    'robocoach-academy#0': { label: '17–18 October 2026', place: 'Astana' },
    'robocoach-academy#1': { label: '30–31 January 2027', place: 'Astana' },

    'smart-robot-games#0': { label: 'During school holidays', place: 'Astana' },

    'robocoach-cup#0': { label: '9 January 2027', place: 'Astana' },
    'robocoach-cup#1': { label: '27 May 2027', place: 'Astana' },

    'ascora-fest#0': { label: 'October 2026', place: 'Astana' },
    'ascora-fest#1': { label: 'December 2026', place: 'Astana' },
    'ascora-fest#2': { label: 'January 2027', place: 'Astana' },
    'ascora-fest#3': { label: 'April 2027', place: 'Astana' },
    'ascora-fest#4': { label: 'November 2026', place: 'Almaty' },
    'ascora-fest#5': { label: 'March 2027', place: 'Almaty' },

    'ascora-camp#0': { label: 'During school holidays', place: 'Europe, Asia, the USA and other countries' },

    'ascora-international#0': { label: '26–30 October 2026', place: 'Europe, Asia, the USA and other countries' },
    'ascora-international#1': { label: '21–25 June 2027', place: 'Europe, Asia, the USA and other countries' },
  },

  projects: {
    fibonacci: {
      name: 'Fibonacci International Olympiad',
      tagline: 'International subject olympiads',
      description:
        'Subject olympiads for students in grades 3–12: mathematics, computer science, physics, chemistry and biology. The national stage takes place in cities across Kazakhstan, and the world final is held in Turkey, Italy and Spain. Winners receive valuable prizes, free trips abroad and grants to leading universities.',
      category: 'Olympiads',
    },
    atlantia: {
      name: 'Atlantia STEM Olympiads',
      tagline: 'International subject olympiads',
      description:
        'International olympiads in mathematics, physics, computer science, chemistry and biology for students in grades 3–11 (12). Atlantia STEM is a separate track of robotics olympiads. The world final is held in Turkey and Spain.',
      category: 'Olympiads',
    },
    itecx: {
      name: 'ITECX',
      tagline: 'International science congress for school students',
      description:
        'A science congress for school students who carry out their own research. Its stages take place in Astana and Rome. Participants learn how to conduct research, write up their findings and present them confidently to an audience — a first step into real science.',
      category: 'Science',
    },
    astanatechcup: {
      name: 'Astana Tech Cup',
      tagline: 'National robotics and drone championship',
      description:
        'A large-scale robotics and drone championship in three stages: Astana, Turkey and Italy. Preschoolers, school students and university students can take part — a chance to step onto the international stage and gain valuable competition experience.',
      category: 'Robotics',
    },
    smarthub: {
      name: 'SmartHub',
      tagline: 'Robotics and drone academy',
      description:
        'A robotics and programming academy for children: Lego and Arduino, drones, mechanics and coding. Classes are taught by practising instructors, and students compete in championships.',
      category: 'Robotics',
    },
    ascora: {
      name: 'Ascora Education',
      tagline: 'Summer camps abroad',
      description:
        'Summer camps abroad: Bulgaria, Spain, Malaysia, England and more than 40 other countries. We support families every step of the way — from choosing a programme to departure.',
      category: 'Camps abroad',
    },
    onerlab: {
      name: 'OnerLab',
      tagline: 'Painting academy for children in Astana',
      description:
        'An in-person painting academy in Astana for students in grades 1–8: small groups, a real working studio and a gallery of students’ work.',
      category: 'Creativity',
    },
    'global-edtech-festival': {
      name: 'Global Edtech Festival',
      tagline: 'Education festival',
      description: 'A festival that brings together education companies and organisations, teachers, parents and school students.',
      category: 'Festivals',
    },
    'international-camp': {
      name: 'International Camp',
      tagline: 'Educational camps abroad',
      description:
        'Camps for school students in Turkey, the UAE, Azerbaijan, the Netherlands, Belgium, Estonia, Sweden and Finland. Interactive learning for those who want to spend their holidays having fun and learning something useful.',
      category: 'Camps abroad',
    },
    'fibonacci-exchange-program': {
      name: 'Fibonacci Exchange Program',
      tagline: 'International exchange programme',
      description:
        'An exchange programme for winners of the Fibonacci olympiads: trips to Turkey, Azerbaijan, the Netherlands, Belgium, Estonia, Sweden and Finland.',
      category: 'Olympiads',
    },
    'robocoach-international': {
      name: 'RoboCoach International',
      tagline: 'Robotics training for teachers',
      description: 'International robotics training sessions for teachers in Astana, Almaty and Shymkent.',
      category: 'Robotics',
    },
    'bilim-talks': {
      name: 'Bilim Talks',
      tagline: 'Seminar for teachers',
      description: 'A seminar in Astana for teachers and representatives of educational organisations.',
      category: 'Science',
    },
  },

  news: {
    '12': { title: 'Team Kazakhstan achieves outstanding results at the Fibonacci Robotics World Final in Rome',
      body: "In Rome, 623 teams from 18 countries came together to show their best engineering and creative solutions at the Fibonacci International Robot Olympiad 2025. Among them were bright and strong teams from Kazakhstan, who once again made their mark on the world stage.\n\nTeam Kazakhstan's results: 19 gold, 13 silver and 8 bronze medals, plus 12 Jury Award motivational prizes. The country was represented by 59 teams and 96 participants, and every one of them contributed to this success.\n\nWe are especially proud of the teams from Astana: 17 gold, 7 silver and 3 bronze medals and 5 Jury Awards. The capital has proven once again that it is one of the country's leaders in robotics.\n\nKazakhstan again became the overall champion of the medal table, winning the most gold medals among 18 countries. Congratulations — this was Kazakhstan's strongest performance in the history of the competition!" },
    '5': { title: 'Bilim Talks: a seminar for teachers',
      body: "Our company held a seminar for teachers from partner schools at Future School on the topic “Integrating artificial intelligence into education”.\n\nParticipants discussed current trends and practical methods for bringing AI into the classroom, learned effective ways to use modern technology in teaching and shared their own experience. Teachers praised the substance, relevance and engaging delivery of the material, as well as the high level of organisation.\n\nBilim Talks is a platform for sharing experience: new and relevant topics, professional networking and growth in education. Join us and become part of a community that shapes the future of education!" },
    '4': { title: 'RoboCoach International: international robotics training in Almaty',
      body: "On 11–12 October we held an international robotics training for teachers in Almaty. It took place at our partner school Fiztex Almaty with the support of Almaty Daryny.\n\nFor two days participants went through intensive hands-on training, took part in a mini-tournament and sharpened their skills. The sessions were led by experienced coaches of the Kazakhstan national team and leading international specialists from Turkey. Participants highlighted the professionalism, the organisation and the practical value of the course.\n\nA reminder: all our trainings count towards teacher attestation. Join us and discover a world of opportunities!" },
    '2': { title: 'RoboCoach International in Almaty: robotics training for teachers',
      body: "On 11–12 October Almaty will host an international robotics training led by world-class specialists in robotics, programming and drone piloting. It is organised by the education company AZ Group together with Almaty Daryny.\n\nParticipants can expect two days of intensive, practice-focused sessions with international experts: working with Arduino, LEGO Mindstorms and drones, programming Arduino for line following, maze solving and the Mini Sumo category, and the basics of designing their own printed circuit boards (PCBs).\n\nCompleting the course counts towards teacher attestation and is included in the Ustaz platform." },
    '3': { title: 'Fibonacci International Olympiads',
      body: "On 8 November the Fibonacci olympiads in mathematics, computer science, physics, chemistry and biology start in Astana and other cities of Kazakhstan. From November to February, students in grades 3–12 can take part and compete for valuable prizes: modern gadgets, educational trips abroad, and grants to private schools and universities.\n\nYou can take part several times and in different subjects — each prize-winning place counts separately, which makes participation even more worthwhile. Everyone who scores more than 50% correct answers gets the chance to reach the world final in a country of their choice: Turkey or Italy.\n\nOlympiad results also count towards teacher attestation — an extra advantage for schools." },
    '1': { title: 'RoboCoach International: international robotics training in Astana',
      body: "On 27–28 September in Astana, the education company AZ Group, together with Astana Daryny, held the international training RoboCoach International.\n\nTeachers received practical and theoretical sessions with international experts, worked with Arduino, LEGO Mindstorms and drones, prepared for tournaments, got useful advice and exchanged experience. Participants were also taught how to program Arduino for line following, maze solving and the Mini Sumo category, and the basics of designing their own printed circuit boards (PCBs).\n\nCompleting the course counts towards teacher attestation and is included in the Ustaz platform." },
  },

  partners: {
    'Zerdeli International School, Астана': { name: 'Zerdeli International School, Astana' },
    'Школа Бином имени Қ. Сатпаева, Астана': { name: 'Binom School named after K. Satpayev, Astana' },
    'Neotech Digital School, Астана': { name: 'Neotech Digital School, Astana' },
    'Физико-математический лицей «ФЛАГМАН», Астана': { name: '“FLAGMAN” Physics and Mathematics Lyceum, Astana' },
    'Alpamys School, Астана': { name: 'Alpamys School, Astana' },
    'Future School, Астана': { name: 'Future School, Astana' },
    'Школа «Академия Успеха», Павлодар': { name: '“Akademiya Uspekha” (Academy of Success) School, Pavlodar' },
    'Школа «Fiztex School», Алматы': { name: 'Fiztex School, Almaty' },
    'Школа-лицей №2 «Дарын», Астана': { name: 'School-Lyceum No. 2 “Daryn”, Astana' },
    'Школа «Seed Uniker School», Астана': { name: 'Seed Uniker School, Astana' },
    'Лицей-интернат для одарённых девочек «Білім-инновация»': { name: '“Bilim-Innovation” Boarding Lyceum for Gifted Girls' },
    'Школа Бином имени А. Байтұрсынұлы, Астана': { name: 'Binom School named after A. Baitursynuly, Astana' },
    'Школа Бином имени Қ. Мырза Әлі, Астана': { name: 'Binom School named after K. Myrza Ali, Astana' },
    'Школа Бином имени Ы. Алтынсарина, Астана': { name: 'Binom School named after I. Altynsarin, Astana' },
    'Школа Бином имени А. Бөкейхана, Астана': { name: 'Binom School named after A. Bokeikhan, Astana' },
    'Школа цифровых технологий Skillset': { name: 'Skillset School of Digital Technologies' },
    'Школа всестороннего развития Milestone': { name: 'Milestone School of All-Round Development' },
    'Umka School — начальная школа': { name: 'Umka School — primary school' },
    'Школа-лицей №84': { name: 'School-Lyceum No. 84' },
    'Школа-гимназия №97': { name: 'School-Gymnasium No. 97' },
    'Начальная школа «Kemel»': { name: 'Kemel Primary School' },
    'Школа-лицей №8': { name: 'School-Lyceum No. 8' },
    'Средняя школа №107': { name: 'Secondary School No. 107' },
    'Международная школа №81 Astana English School': { name: 'International School No. 81 Astana English School' },
    'Гимназия №90 им. Қайыма Мұхамедханова': { name: 'Gymnasium No. 90 named after Kayym Mukhamedkhanov' },
    'Национальный лицей QAZBILIM, Астана': { name: 'QAZBILIM National Lyceum, Astana' },
    'Школа QAZBILIM, Алматы': { name: 'QAZBILIM School, Almaty' },
    'Национальный лицей QAZBILIM, Костанай': { name: 'QAZBILIM National Lyceum, Kostanay' },
    'Национальный лицей QAZBILIM, Кызылорда': { name: 'QAZBILIM National Lyceum, Kyzylorda' },
    'Национальный лицей QAZBILIM, Караганда': { name: 'QAZBILIM National Lyceum, Karaganda' },
    'Harmony School': { name: 'Harmony School' },
    'Дворец школьников «Bolashaq Saraiy», Кокшетау': { name: 'Bolashaq Saraiy Palace of Schoolchildren, Kokshetau' },
    'Дворец школьников имени Аль-Фараби, Астана': { name: 'Al-Farabi Palace of Schoolchildren, Astana' },
    'Школа робототехники и программирования «Rolab Academy», Алматы': { name: 'Rolab Academy School of Robotics and Programming, Almaty' },
    'Центр по выявлению и поддержке одарённых детей и талантливой молодёжи «Астана дарыны»': {
      name: '“Astana Daryny” Centre for Identifying and Supporting Gifted Children and Talented Youth',
    },
  },

  faqs: [
    {
      question: 'How do I register for an olympiad?',
      answer: 'Open the “Events” section and click “Register” — you will be taken to your personal account on az-group.kz. Choose the olympiad, fill in the participant form and pay the entry fee there.',
    },
    {
      question: 'Who can take part and how much does it cost?',
      answer: 'Students in grades 3–12 can take part — each competes in their own age category (see the Olympiad Regulations for details). A single entry costs 25,000 ₸. While registration is open, you can take part more than once.',
    },
    {
      question: 'Which subjects do the olympiads cover?',
      answer: 'Fibonacci olympiads are held in mathematics, physics, chemistry, biology, computer science and natural science. Atlantia covers mathematics, physics, computer science, chemistry and biology, and its Atlantia STEM track covers robotics.',
    },
    {
      question: 'What prizes do winners receive?',
      answer: 'At the national stage, winners receive valuable prizes — gadgets. At the world final, participants can win a trip abroad and even a grant to study at university.',
    },
    {
      question: 'Where is the national stage held?',
      answer: 'The national stage of the Fibonacci Olympiad takes place in cities across Kazakhstan. Round dates for the 2026–2027 season are listed in the “Events” section.',
    },
    {
      question: 'Where are the world finals held?',
      answer: 'The world finals of the Fibonacci and Atlantia olympiads take place in Turkey (Antalya), Italy (Rome) and Spain (Barcelona). In the 2026–2027 season, the Fibonacci finals will be held in Antalya and Rome, and the Atlantia finals in Antalya and Barcelona. The months are listed in the “Events” section.',
    },
    {
      question: 'Where can I see the Fibonacci Olympiad results?',
      answer: 'Results are published via the “Fibonacci Olympiad results” link in the “Popular” block on the home page.',
    },
    {
      question: 'Are there programmes for teachers?',
      answer: 'Yes. At RoboCoach Academy, teachers learn how to teach robotics; at the RoboCoach Cup tournament, they compete themselves; and RoboCoach International training sessions are held in Astana, Almaty and Shymkent. We also run the Bilim Talks seminar for teachers and representatives of educational organisations. Our projects are included in the “Astana Daryny” register used for teacher certification.',
    },
    {
      question: 'How can a school become an AZ Group partner?',
      answer: 'Send a request through the “Contacts” section or message us on WhatsApp. We will sign a memorandum of cooperation and bring your students and teachers into our projects.',
    },
  ],

  settings: {
    contacts: { address: 'Astana, 8 Tokpanov Street' },
    stats: [
      { value: '30+', label: 'partner countries' },
      { value: 'No. 1', label: 'in training robotics specialists — and more' },
      { value: '20+', label: 'projects organised' },
      { value: '32', label: 'partner schools in Kazakhstan' },
    ],
    about: {
      title: 'AZ Group — the leading international education company in Kazakhstan and the CIS',
      pillars: [
        { title: 'Mission', text: 'Our mission is to develop education in Kazakhstan and raise its quality.' },
        {
          title: 'What we do',
          text: 'We run international subject olympiads, training sessions and seminars for students and teachers, education festivals, academic exchange programmes and camps abroad.',
        },
        {
          title: 'Goals',
          text: 'Our goal is to open up new educational opportunities for students, teachers and leaders of schools and other educational organisations.',
        },
      ],
      directions: ['Expanding opportunities', 'Professional development', 'International growth', 'Study abroad'],
      achievements: [
        { value: '20+', label: 'projects organised' },
        { value: 'Thousands', label: 'of participants every year' },
        { value: 'Prize winners', label: 'Our students win top places at the Fibonacci olympiads and take home valuable prizes' },
        { value: '“Astana Daryny”', label: 'Our projects are included in the register of events recognised in teacher certification' },
        { value: 'Memoranda', label: 'Schools and education centres across Kazakhstan work with us under memoranda of cooperation' },
      ],
    },
  },
};

export default t;
