/**
 * Политика конфиденциальности ТОО «AZ GROUP LLC» (ru, kk, en) — страница /privacy.
 * Формат тот же, что у оферты (src/data/offer.ts): h — заголовок раздела, p — абзац, li — пункт списка.
 * Меняете текст — обновите дату в updated. Перед публикацией текст должен проверить юрист.
 */
import type { Lang } from '@shared/i18n';
import type { OfferText } from './offer';

export const privacy: Record<Lang, OfferText> = {
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Последнее обновление: 3 ноября, 2026',
    blocks: [
      { t: 'h', x: '1. Общие положения' },
      { t: 'p', x: '1.1. Настоящая Политика описывает, какие персональные данные собирает сайт https://www.azgroup.kz, как они используются и защищаются. Оператор — ТОО «AZ GROUP LLC», БИН 241140003039, Казахстан, Астана, жилой массив Ақ-Бұлақ-3, улица Аскар Токпанов, дом 27 (далее — Компания).' },
      { t: 'p', x: '1.2. Обработка данных ведётся в соответствии с Законом Республики Казахстан «О персональных данных и их защите».' },
      { t: 'p', x: '1.3. Отправляя форму регистрации, вы подтверждаете, что ознакомились с настоящей Политикой и даёте согласие на обработку данных на описанных здесь условиях.' },

      { t: 'h', x: '2. Какие данные мы собираем' },
      { t: 'p', x: 'При регистрации на мероприятие:' },
      { t: 'li', x: 'участник: фамилия и имя, класс (или статус «педагог»), школа, город, выбранные предметы;' },
      { t: 'li', x: 'контактное лицо: имя, номер телефона, e-mail (необязательно);' },
      { t: 'li', x: 'комментарий, если вы его указали.' },
      { t: 'p', x: 'Автоматически: язык сайта, страница, с которой вы пришли, метки рекламных ссылок (utm), а также IP-адрес в виде необратимого хэша — он нужен только для защиты форм от спама и злоупотреблений, сам IP-адрес не хранится.' },
      { t: 'p', x: 'Мы не запрашиваем ИИН, дату рождения, домашний адрес, фотографии, документы и данные банковских карт. Оплата участия проходит на стороне платёжного сервиса (Kaspi), мы платёжных данных не получаем.' },

      { t: 'h', x: '3. Данные несовершеннолетних' },
      { t: 'p', x: '3.1. Участниками мероприятий в основном являются школьники. Данные несовершеннолетнего участника обрабатываются только с согласия его законного представителя (родителя, опекуна).' },
      { t: 'p', x: '3.2. Форму регистрации заполняет родитель или иной законный представитель. Если регистрацию заполняет педагог или представитель школы, он подтверждает, что получил согласие законного представителя участника на передачу и обработку его данных.' },
      { t: 'p', x: '3.3. Законный представитель может в любой момент отозвать согласие и потребовать удалить данные ребёнка (раздел 8).' },

      { t: 'h', x: '4. Цели обработки' },
      { t: 'li', x: 'регистрация и допуск к участию в олимпиадах, конкурсах, тренингах и других мероприятиях;' },
      { t: 'li', x: 'связь с участником или его представителем: подтверждение, напоминания, сообщение результатов, вручение дипломов и наград;' },
      { t: 'li', x: 'учёт оплаты, исполнение договора на условиях публичной оферты;' },
      { t: 'li', x: 'защита сайта от спама и злоупотреблений, улучшение работы сайта (без идентификации отдельных людей).' },
      { t: 'p', x: 'Данные не используются для рекламных рассылок без отдельного согласия.' },

      { t: 'h', x: '5. Хранение и защита' },
      { t: 'p', x: '5.1. Данные хранятся в базе данных на серверах, расположенных на территории Республики Казахстан (город Астана).' },
      { t: 'p', x: '5.2. Передача данных между вашим устройством и сайтом защищена шифрованием (HTTPS). Доступ к данным имеют только уполномоченные сотрудники Компании по индивидуальным учётным записям; действия в панели управления фиксируются в журнале. Пароли сотрудников хранятся только в виде хэша.' },
      { t: 'p', x: '5.3. Компания принимает организационные и технические меры, чтобы защитить данные от несанкционированного доступа, изменения и утраты.' },

      { t: 'h', x: '6. Передача третьим лицам' },
      { t: 'p', x: '6.1. Мы не продаём персональные данные и не передаём их для рекламы.' },
      { t: 'p', x: '6.2. Данные могут передаваться организаторам и партнёрам мероприятия, в котором вы участвуете (например, организаторам международной олимпиады), только в объёме, необходимом для участия, и только с согласия субъекта или его законного представителя. Передача за пределы Республики Казахстан осуществляется в соответствии с требованиями законодательства.' },
      { t: 'p', x: '6.3. Данные могут быть предоставлены государственным органам в случаях и порядке, установленных законом.' },

      { t: 'h', x: '7. Сроки хранения' },
      { t: 'p', x: 'Данные хранятся не дольше, чем это нужно для целей обработки, но не более 3 лет после завершения мероприятия, на которое была оформлена регистрация. После этого они удаляются или обезличиваются, если закон не требует хранить их дольше. Данные удаляются раньше по вашему требованию (раздел 8).' },

      { t: 'h', x: '8. Ваши права' },
      { t: 'p', x: 'Вы (или законный представитель участника) вправе:' },
      { t: 'li', x: 'узнать, какие данные о вас или ребёнке мы храним, и получить их копию;' },
      { t: 'li', x: 'потребовать исправить неточные данные;' },
      { t: 'li', x: 'отозвать согласие на обработку и потребовать удалить или заблокировать данные;' },
      { t: 'li', x: 'обратиться с жалобой в уполномоченный государственный орган.' },
      { t: 'p', x: 'Запрос отправьте на info@az-group.kz с указанием имени участника и номера телефона из регистрации. Мы ответим в сроки, установленные законодательством Республики Казахстан. Отзыв согласия не влияет на законность обработки, выполненной до отзыва.' },

      { t: 'h', x: '9. Cookie и локальное хранилище' },
      { t: 'p', x: 'Сайт не использует рекламные и аналитические cookie сторонних сервисов. В браузере сохраняются только ваши настройки (язык и тема оформления), а у сотрудников в панели управления — служебный cookie входа.' },

      { t: 'h', x: '10. Изменения Политики и контакты' },
      { t: 'p', x: 'Мы можем обновлять Политику; актуальная версия всегда доступна на этой странице, дата последнего обновления указана вверху.' },
      { t: 'p', x: 'ТОО «AZ GROUP LLC»\nАдрес: Казахстан, Астана, жилой массив Ақ-Бұлақ-3, улица Аскар Токпанов, дом 27\nE-mail: info@az-group.kz\nТелефон: +7 (777) 088-88-44' },
    ],
  },

  kk: {
    title: 'Құпиялылық саясаты',
    updated: 'Соңғы жаңарту: 3 қараша, 2026',
    blocks: [
      { t: 'h', x: '1. Жалпы ережелер' },
      { t: 'p', x: '1.1. Осы Саясат https://www.azgroup.kz сайтының қандай дербес деректерді жинайтынын, оларды қалай пайдаланатынын және қорғайтынын сипаттайды. Оператор — «AZ GROUP LLC» ЖШС, БСН 241140003039, Қазақстан, Астана қаласы, Ақ-Бұлақ-3 тұрғын алабы, Асқар Тоқпанов көшесі, 27 үй (бұдан әрі — Компания).' },
      { t: 'p', x: '1.2. Деректерді өңдеу «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының Заңына сәйкес жүргізіледі.' },
      { t: 'p', x: '1.3. Тіркеу нысанын жіберу арқылы сіз осы Саясатпен танысқаныңызды растайсыз және деректерді осында сипатталған шарттарда өңдеуге келісім бересіз.' },

      { t: 'h', x: '2. Қандай деректерді жинаймыз' },
      { t: 'p', x: 'Іс-шараға тіркелу кезінде:' },
      { t: 'li', x: 'қатысушы: тегі мен аты, сыныбы (немесе «педагог» мәртебесі), мектебі, қаласы, таңдаған пәндері;' },
      { t: 'li', x: 'байланыс тұлғасы: аты, телефон нөмірі, e-mail (міндетті емес);' },
      { t: 'li', x: 'егер жазған болсаңыз, пікір.' },
      { t: 'p', x: 'Автоматты түрде: сайт тілі, сіз келген бет, жарнамалық сілтеме белгілері (utm), сондай-ақ IP-мекенжай кері қайтарылмайтын хэш түрінде — ол тек нысандарды спам мен теріс пайдаланудан қорғау үшін қажет, IP-мекенжайдың өзі сақталмайды.' },
      { t: 'p', x: 'Біз ЖСН, туған күнін, тұрғылықты мекенжайын, фотосуреттерін, құжаттарын және банк карталарының деректерін сұрамаймыз. Қатысу ақысы төлем сервисі (Kaspi) тарапында төленеді, біз төлем деректерін алмаймыз.' },

      { t: 'h', x: '3. Кәмелетке толмағандардың деректері' },
      { t: 'p', x: '3.1. Іс-шараларға негізінен оқушылар қатысады. Кәмелетке толмаған қатысушының деректері тек оның заңды өкілінің (ата-анасының, қамқоршысының) келісімімен өңделеді.' },
      { t: 'p', x: '3.2. Тіркеу нысанын ата-ана немесе өзге заңды өкіл толтырады. Егер тіркеуді педагог немесе мектеп өкілі толтырса, ол қатысушының заңды өкілінен оның деректерін беруге және өңдеуге келісім алғанын растайды.' },
      { t: 'p', x: '3.3. Заңды өкіл кез келген уақытта келісімін қайтарып алып, баланың деректерін жоюды талап ете алады (8-бөлім).' },

      { t: 'h', x: '4. Өңдеу мақсаттары' },
      { t: 'li', x: 'олимпиадаларға, байқауларға, тренингтерге және басқа іс-шараларға тіркеу және қатысуға жіберу;' },
      { t: 'li', x: 'қатысушымен немесе оның өкілімен байланыс: растау, еске салу, нәтижелерді хабарлау, дипломдар мен марапаттарды табыстау;' },
      { t: 'li', x: 'төлемді есепке алу, жария оферта шарттарында шартты орындау;' },
      { t: 'li', x: 'сайтты спам мен теріс пайдаланудан қорғау, сайт жұмысын жақсарту (жеке адамдарды анықтамай).' },
      { t: 'p', x: 'Деректер бөлек келісімсіз жарнамалық тарату үшін пайдаланылмайды.' },

      { t: 'h', x: '5. Сақтау және қорғау' },
      { t: 'p', x: '5.1. Деректер Қазақстан Республикасы аумағында (Астана қаласы) орналасқан серверлердегі дерекқорда сақталады.' },
      { t: 'p', x: '5.2. Құрылғыңыз бен сайт арасындағы деректер беру шифрлаумен (HTTPS) қорғалған. Деректерге тек Компанияның уәкілетті қызметкерлері жеке есептік жазбалар арқылы қол жеткізе алады; басқару панеліндегі әрекеттер журналда тіркеледі. Қызметкерлердің құпия сөздері тек хэш түрінде сақталады.' },
      { t: 'p', x: '5.3. Компания деректерді рұқсатсыз қолжетімділіктен, өзгертуден және жоғалтудан қорғау үшін ұйымдастырушылық және техникалық шаралар қабылдайды.' },

      { t: 'h', x: '6. Үшінші тұлғаларға беру' },
      { t: 'p', x: '6.1. Біз дербес деректерді сатпаймыз және жарнама үшін бермейміз.' },
      { t: 'p', x: '6.2. Деректер сіз қатысатын іс-шараның ұйымдастырушылары мен әріптестеріне (мысалы, халықаралық олимпиада ұйымдастырушыларына) тек қатысу үшін қажетті көлемде және тек субъектінің немесе оның заңды өкілінің келісімімен берілуі мүмкін. Қазақстан Республикасынан тыс жерге беру заңнама талаптарына сәйкес жүзеге асырылады.' },
      { t: 'p', x: '6.3. Деректер мемлекеттік органдарға заңда белгіленген жағдайда және тәртіппен берілуі мүмкін.' },

      { t: 'h', x: '7. Сақтау мерзімдері' },
      { t: 'p', x: 'Деректер өңдеу мақсаттары үшін қажет мерзімнен артық сақталмайды, бірақ тіркеу рәсімделген іс-шара аяқталғаннан кейін 3 жылдан аспайды. Содан кейін заң ұзағырақ сақтауды талап етпесе, олар жойылады немесе иесіздендіріледі. Деректер сіздің талабыңыз бойынша ертерек жойылады (8-бөлім).' },

      { t: 'h', x: '8. Сіздің құқықтарыңыз' },
      { t: 'p', x: 'Сіз (немесе қатысушының заңды өкілі) мыналарға құқылысыз:' },
      { t: 'li', x: 'сіз немесе бала туралы қандай деректер сақталатынын білуге және олардың көшірмесін алуға;' },
      { t: 'li', x: 'дәл емес деректерді түзетуді талап етуге;' },
      { t: 'li', x: 'өңдеуге келісімді қайтарып алуға және деректерді жоюды немесе бұғаттауды талап етуге;' },
      { t: 'li', x: 'уәкілетті мемлекеттік органға шағыммен жүгінуге.' },
      { t: 'p', x: 'Өтінішті тіркеудегі қатысушының атын және телефон нөмірін көрсетіп, info@az-group.kz мекенжайына жіберіңіз. Біз Қазақстан Республикасының заңнамасында белгіленген мерзімде жауап береміз. Келісімді қайтарып алу қайтарып алғанға дейін жүргізілген өңдеудің заңдылығына әсер етпейді.' },

      { t: 'h', x: '9. Cookie және жергілікті сақтау' },
      { t: 'p', x: 'Сайт үшінші тарап сервистерінің жарнамалық және аналитикалық cookie файлдарын пайдаланбайды. Браузерде тек сіздің параметрлеріңіз (тіл және безендіру тақырыбы) сақталады, ал қызметкерлерде басқару панелінде — қызметтік кіру cookie файлы.' },

      { t: 'h', x: '10. Саясаттың өзгеруі және байланыс' },
      { t: 'p', x: 'Біз Саясатты жаңарта аламыз; өзекті нұсқа әрқашан осы бетте қолжетімді, соңғы жаңарту күні жоғарыда көрсетілген.' },
      { t: 'p', x: '«AZ GROUP LLC» ЖШС\nМекенжайы: Қазақстан, Астана қаласы, Ақ-Бұлақ-3 тұрғын алабы, Асқар Тоқпанов көшесі, 27 үй\nE-mail: info@az-group.kz\nТелефон: +7 (777) 088-88-44' },
    ],
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: November 3, 2026',
    blocks: [
      { t: 'h', x: '1. General provisions' },
      { t: 'p', x: '1.1. This Policy describes what personal data the website https://www.azgroup.kz collects, how it is used and how it is protected. The operator is AZ GROUP LLC, BIN 241140003039, 27 Askar Tokpanov Street, Ak-Bulak-3 Residential Area, Astana, Republic of Kazakhstan (the "Company").' },
      { t: 'p', x: '1.2. Data is processed in accordance with the Law of the Republic of Kazakhstan "On Personal Data and Their Protection".' },
      { t: 'p', x: '1.3. By submitting the registration form you confirm that you have read this Policy and consent to the processing of data on the terms described here.' },

      { t: 'h', x: '2. What data we collect' },
      { t: 'p', x: 'When you register for an event:' },
      { t: 'li', x: 'participant: first and last name, grade (or "teacher" status), school, city, selected subjects;' },
      { t: 'li', x: 'contact person: name, phone number, e-mail (optional);' },
      { t: 'li', x: 'a comment, if you add one.' },
      { t: 'p', x: 'Automatically: the site language, the page you came from, campaign tags (utm) and your IP address as an irreversible hash — it is used only to protect forms from spam and abuse; the IP address itself is not stored.' },
      { t: 'p', x: 'We do not ask for a personal ID number (IIN), date of birth, home address, photos, documents or bank card data. Payment is made through the payment service (Kaspi); we do not receive payment details.' },

      { t: 'h', x: '3. Data of minors' },
      { t: 'p', x: '3.1. Most participants are schoolchildren. A minor participant\'s data is processed only with the consent of their legal representative (parent or guardian).' },
      { t: 'p', x: '3.2. The registration form is filled in by a parent or other legal representative. If a teacher or school representative fills it in, they confirm that they have obtained the consent of the participant\'s legal representative to the transfer and processing of the data.' },
      { t: 'p', x: '3.3. A legal representative may withdraw consent at any time and ask us to delete the child\'s data (section 8).' },

      { t: 'h', x: '4. Purposes of processing' },
      { t: 'li', x: 'registration and admission to olympiads, competitions, trainings and other events;' },
      { t: 'li', x: 'contacting the participant or their representative: confirmations, reminders, results, awarding diplomas and prizes;' },
      { t: 'li', x: 'recording payment and performing the contract under the public offer;' },
      { t: 'li', x: 'protecting the site from spam and abuse, improving the site (without identifying individuals).' },
      { t: 'p', x: 'Data is not used for marketing mailings without separate consent.' },

      { t: 'h', x: '5. Storage and protection' },
      { t: 'p', x: '5.1. Data is stored in a database on servers located in the Republic of Kazakhstan (Astana).' },
      { t: 'p', x: '5.2. Data sent between your device and the site is encrypted (HTTPS). Only authorized Company staff have access, using individual accounts; actions in the admin panel are logged. Staff passwords are stored only as hashes.' },
      { t: 'p', x: '5.3. The Company takes organizational and technical measures to protect data from unauthorized access, alteration and loss.' },

      { t: 'h', x: '6. Disclosure to third parties' },
      { t: 'p', x: '6.1. We do not sell personal data or share it for advertising.' },
      { t: 'p', x: '6.2. Data may be passed to the organizers and partners of the event you take part in (for example, the organizers of an international olympiad) only to the extent necessary for participation and only with the consent of the data subject or their legal representative. Any transfer outside the Republic of Kazakhstan is made in accordance with the law.' },
      { t: 'p', x: '6.3. Data may be provided to government authorities in the cases and manner established by law.' },

      { t: 'h', x: '7. Retention' },
      { t: 'p', x: 'Data is kept no longer than needed for the purposes of processing, and in any case no more than 3 years after the event for which the registration was made. After that it is deleted or anonymized unless the law requires longer retention. Data is deleted earlier on your request (section 8).' },

      { t: 'h', x: '8. Your rights' },
      { t: 'p', x: 'You (or the participant\'s legal representative) have the right to:' },
      { t: 'li', x: 'find out what data we hold about you or the child and receive a copy;' },
      { t: 'li', x: 'ask us to correct inaccurate data;' },
      { t: 'li', x: 'withdraw consent to processing and ask us to delete or block the data;' },
      { t: 'li', x: 'complain to the authorized government body.' },
      { t: 'p', x: 'Send your request to info@az-group.kz with the participant\'s name and the phone number used at registration. We will respond within the time limits set by the legislation of the Republic of Kazakhstan. Withdrawing consent does not affect the lawfulness of processing carried out before the withdrawal.' },

      { t: 'h', x: '9. Cookies and local storage' },
      { t: 'p', x: 'The site does not use advertising or analytics cookies from third-party services. Your browser stores only your preferences (language and theme); for staff in the admin panel, a technical login cookie is used.' },

      { t: 'h', x: '10. Changes and contacts' },
      { t: 'p', x: 'We may update this Policy; the current version is always available on this page, and the date of the last update is shown at the top.' },
      { t: 'p', x: 'AZ GROUP LLC\nAddress: 27 Askar Tokpanov Street, Ak-Bulak-3 Residential Area, Astana, Republic of Kazakhstan\nE-mail: info@az-group.kz\nPhone: +7 (777) 088-88-44' },
    ],
  },
};
