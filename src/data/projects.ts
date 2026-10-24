/**
 * Единственный источник правды по проектам компании.
 * Чтобы добавить проект на лендинг, допишите объект в массив `projects` —
 * сетка, фильтры по категориям, схема связей и подвал строятся из него.
 * Даты событий живут отдельно — в `src/data/calendar.ts`.
 *
 * Описания пишем для посетителя: что это за проект, для кого и что он даёт.
 * Устройство сайта — админки, CRM, приём заявок, языковые версии — сюда
 * не попадает: это внутренняя кухня, читателю витрины она не адресована.
 */

export type ProjectCategory =
  | 'Олимпиады'
  | 'Робототехника'
  | 'Наука'
  | 'Зарубежные лагеря'
  | 'Творчество';

export interface Project {
  /** Короткий идентификатор, он же ключ в React и связь с календарём. */
  slug: string;
  name: string;
  /** Подзаголовок в одну строку — показывается под названием на карточке. */
  tagline: string;
  description: string;
  category: ProjectCategory;
  url: string;
  /** Домен без протокола — печатается в подвале карточки. */
  domain: string;
  /** Логотип проекта в `public/logos/`. */
  logo: string;
  /**
   * Во сколько раз увеличить логотип в схеме связей и на карточке. Знаки
   * сильно разнятся по «воздуху» внутри макета, а высокие (герб с надписью
   * под ним) без поправки выглядят мельче широких словомарок.
   */
  logoScale: number;
}

export const projects: Project[] = [
  {
    slug: 'fibonacci',
    name: 'Fibonacci International Olympiad',
    tagline: 'Международные предметные олимпиады',
    description:
      'Предметные олимпиады для школьников 3–12 классов: математика, информатика, физика, химия и биология. Республиканский этап проходит в городах Казахстана, мировой финал — в Турции, Италии и Испании. Победителей ждут ценные призы, бесплатные зарубежные поездки и гранты в ведущие вузы.',
    category: 'Олимпиады',
    url: 'https://fibonacci-olympiads.kz',
    domain: 'fibonacci-olympiads.kz',
    logo: '/logos/fibonacci.png',
    logoScale: 1,
  },
  {
    slug: 'atlantia',
    name: 'Atlantia STEM Olympiads',
    tagline: 'Международные предметные олимпиады',
    description:
      'Международные олимпиады по математике, физике, информатике, химии и биологии для учеников 3–11 (12) классов. Отдельное направление Atlantia STEM — олимпиады по робототехнике. Мировой финал проходит в Турции и Испании.',
    category: 'Олимпиады',
    url: 'https://atlantia-olympiads.kz',
    domain: 'atlantia-olympiads.kz',
    logo: '/logos/atlantia.png',
    logoScale: 1.4,
  },
  {
    slug: 'itecx',
    name: 'ITECX',
    tagline: 'Международный научный конгресс для школьников',
    description:
      'Научный конгресс для школьников, которые ведут собственные исследования. Этапы проходят в Астане и Риме. Участники учатся проводить исследование, оформлять результаты и уверенно представлять их публике — это первый шаг в настоящую науку.',
    category: 'Наука',
    url: 'https://itecx.kz',
    domain: 'itecx.kz',
    logo: '/logos/itecx.svg',
    logoScale: 1,
  },
  {
    slug: 'astanatechcup',
    name: 'Astana Tech Cup',
    tagline: 'Республиканский чемпионат по робототехнике и дронам',
    description:
      'Масштабный чемпионат по робототехнике и дронам в три этапа: Астана, Турция и Италия. Участвовать могут дошкольники, школьники и студенты — это шанс выйти на международную арену и получить ценный соревновательный опыт.',
    category: 'Робототехника',
    url: 'https://astanatechcup.kz',
    domain: 'astanatechcup.kz',
    logo: '/logos/astanatechcup.png',
    logoScale: 1,
  },
  {
    slug: 'smarthub',
    name: 'SmartHub',
    tagline: 'Академия робототехники и дронов',
    description:
      'Академия робототехники и программирования для детей: Lego и Arduino, дроны, механика и код. Занятия ведут практикующие преподаватели, а ученики выступают на чемпионатах.',
    category: 'Робототехника',
    url: 'https://smarthub-kz.com',
    domain: 'smarthub-kz.com',
    logo: '/logos/smarthub.png',
    logoScale: 1,
  },
  {
    slug: 'ascora',
    name: 'Ascora Education',
    tagline: 'Зарубежные летние лагеря',
    description:
      'Летние лагеря за рубежом: Болгария, Испания, Малайзия, Англия и ещё более 40 стран. Сопровождаем семью на каждом шаге — от подбора программы до выезда.',
    category: 'Зарубежные лагеря',
    url: 'https://www.ascora.education',
    domain: 'ascora.education',
    logo: '/logos/ascora.png',
    logoScale: 0.92,
  },
  {
    slug: 'onerlab',
    name: 'OnerLab',
    tagline: 'Академия живописи для детей в Астане',
    description:
      'Офлайн-академия живописи в Астане для школьников 1–8 классов: небольшие группы, живая мастерская и галерея работ учеников.',
    category: 'Творчество',
    url: 'https://onerlab.kz',
    domain: 'onerlab.kz',
    logo: '/logos/onerlab.png',
    logoScale: 0.95,
  },
];

export const categories: ProjectCategory[] = [
  'Олимпиады',
  'Робототехника',
  'Наука',
  'Зарубежные лагеря',
  'Творчество',
];

/**
 * Программы компании без отдельного сайта — с основного сайта az-group.kz.
 * Подробности и регистрация — в разделе «Мероприятия».
 */
export interface CompanyProgram { name: string; tagline: string; description: string; category: ProjectCategory | 'Фестивали' }
export const companyPrograms: CompanyProgram[] = [
  {
    name: 'Global Edtech Festival',
    tagline: 'Образовательный фестиваль',
    description: 'Фестиваль, который собирает вместе образовательные компании и организации, преподавателей, родителей и школьников.',
    category: 'Фестивали',
  },
  {
    name: 'International Camp',
    tagline: 'Зарубежные образовательные лагеря',
    description: 'Лагеря для школьников в Турции, ОАЭ, Азербайджане, Нидерландах, Бельгии, Эстонии, Швеции и Финляндии. Интерактивное обучение для тех, кто хочет провести каникулы весело и с пользой.',
    category: 'Зарубежные лагеря',
  },
  {
    name: 'Fibonacci Exchange Program',
    tagline: 'Международная программа обмена',
    description: 'Программа обмена для победителей олимпиад Fibonacci: поездки в Турцию, Азербайджан, Нидерланды, Бельгию, Эстонию, Швецию и Финляндию.',
    category: 'Олимпиады',
  },
  {
    name: 'RoboCoach International',
    tagline: 'Тренинги по робототехнике для педагогов',
    description: 'Международные тренинги по робототехнике для педагогов в Астане, Алматы и Шымкенте.',
    category: 'Робототехника',
  },
  {
    name: 'Bilim Talks',
    tagline: 'Семинар для педагогов',
    description: 'Семинар в Астане для учителей и представителей организаций образования.',
    category: 'Наука',
  },
];

/** Цифры для блока статистики. Источник — сайт az-group.kz. */
export const stats = [
  { value: 20, suffix: '+', label: 'организованных проектов' },
  { value: 30, suffix: '+', label: 'стран-партнёров' },
  { value: 32, suffix: '', label: 'школ-партнёров в Казахстане' },
  // Считается из массива, чтобы число не расходилось с реальной сеткой.
  { value: projects.length, suffix: '', label: 'действующих проектов' },
];
