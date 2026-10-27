/**
 * Публичная оферта ТОО «AZ GROUP LLC» — перенесена со старого сайта az-group.kz/public-offer (ru, kk, en).
 * Текст без изменений, кроме адреса сайта в реквизитах (теперь https://www.azgroup.kz).
 * Блоки: h — заголовок раздела, p — абзац (переносы строк сохраняются), li — пункт списка.
 * Обновили оферту — поменяйте текст здесь (и дату в updated).
 */
import type { Lang } from '@shared/i18n';

export interface OfferBlock { t: 'h' | 'p' | 'li'; x: string }
export interface OfferText { title: string; updated: string; blocks: OfferBlock[] }

export const offer: Record<Lang, OfferText> = {
  "ru": {
    "title": "Публичная оферта",
    "updated": "Последнее обновление: 18 февраля, 2026",
    "blocks": [
      {
        "t": "h",
        "x": "1. Общие положения"
      },
      {
        "t": "p",
        "x": "1.1. Настоящая Оферта определяет порядок и условия предоставления платных образовательных услуг Исполнителем, включая участие в олимпиадах, чемпионатах, тренингах, курсах, вебинарах, семинарах, зарубежных поездках и иных мероприятиях, проводимых под брендом AZ GROUP."
      },
      {
        "t": "p",
        "x": "1.2. Акцепт настоящей Оферты означает полное и безоговорочное согласие Заказчика со всеми её условиями и эквивалентен заключению договора об оказании услуг."
      },
      {
        "t": "p",
        "x": "1.3. Акцептом признаётся факт оплаты Заказчиком услуг Исполнителя (полной либо частичной, включая рассрочку) любым предложенным способом."
      },
      {
        "t": "p",
        "x": "1.4. В случае заключения договора в интересах несовершеннолетнего лица акцепт осуществляется его законным представителем, который подтверждает наличие законных оснований действовать от имени несовершеннолетнего."
      },
      {
        "t": "h",
        "x": "2. Предмет договора"
      },
      {
        "t": "p",
        "x": "2.1. Исполнитель обязуется предоставить Заказчику образовательные услуги (олимпиады, тренинги, семинары, курсы, обучение, вебинары и иные мероприятия), а Заказчик обязуется оплатить их в соответствии с установленными тарифами."
      },
      {
        "t": "p",
        "x": "2.2. Перечень, содержание, сроки, формат, продолжительность и стоимость услуг указываются на официальном сайте Исполнителя https://www.azgroup.kz, в информационных письмах и официальных материалах компании."
      },
      {
        "t": "p",
        "x": "2.3. В случае если конкретная услуга по своему характеру требует обязательного заключения отдельного письменного договора (в том числе при оказании комплексных программ, длительного обучения, международных поездок, либо по требованию законодательства Республики Казахстан), отношения сторон оформляются отдельным договором. В таком случае условия отдельного договора имеют приоритет перед условиями настоящей Оферты."
      },
      {
        "t": "h",
        "x": "3. Права и обязанности сторон"
      },
      {
        "t": "p",
        "x": "Исполнитель обязуется:"
      },
      {
        "t": "li",
        "x": "организовать и провести мероприятие в соответствии с заявленной программой;"
      },
      {
        "t": "li",
        "x": "предоставить необходимые материалы;"
      },
      {
        "t": "li",
        "x": "уведомлять Заказчика об изменении времени, места или формата проведения мероприятия;"
      },
      {
        "t": "li",
        "x": "обеспечить обработку персональных данных в соответствии с законодательством Республики Казахстан."
      },
      {
        "t": "p",
        "x": "Заказчик обязуется:"
      },
      {
        "t": "li",
        "x": "своевременно оплатить выбранную услугу;"
      },
      {
        "t": "li",
        "x": "соблюдать правила участия;"
      },
      {
        "t": "li",
        "x": "не распространять учебные и методические материалы без письменного согласия Исполнителя;"
      },
      {
        "t": "li",
        "x": "предоставлять достоверные данные при регистрации."
      },
      {
        "t": "h",
        "x": "4. Стоимость и порядок оплаты"
      },
      {
        "t": "p",
        "x": "4.1. Стоимость услуг определяется Исполнителем и публикуется на официальном сайте и/или в официальных информационных материалах."
      },
      {
        "t": "p",
        "x": "4.2. Оплата осуществляется в тенге (KZT) безналичным способом, включая онлайн-оплату и рассрочку."
      },
      {
        "t": "p",
        "x": "4.3. Моментом оплаты считается поступление денежных средств на расчётный счёт Исполнителя."
      },
      {
        "t": "h",
        "x": "5. Возврат средств"
      },
      {
        "t": "p",
        "x": "5.1. Заказчик вправе отказаться от исполнения договора в любое время до начала оказания услуги."
      },
      {
        "t": "p",
        "x": "5.2. В случае отказа Заказчика от участия денежные средства подлежат возврату за вычетом фактически понесённых и документально подтверждённых расходов Исполнителя, связанных с организацией участия Заказчика."
      },
      {
        "t": "p",
        "x": "5.3. К таким расходам могут относиться, в частности:"
      },
      {
        "t": "li",
        "x": "регистрационные сборы организаторов;"
      },
      {
        "t": "li",
        "x": "бронирование площадок;"
      },
      {
        "t": "li",
        "x": "изготовление персонализированных материалов;"
      },
      {
        "t": "li",
        "x": "банковские комиссии;"
      },
      {
        "t": "li",
        "x": "визовые сборы;"
      },
      {
        "t": "li",
        "x": "невозвратные авиабилеты;"
      },
      {
        "t": "li",
        "x": "расходы на бронирование проживания;"
      },
      {
        "t": "li",
        "x": "иные обязательства перед третьими лицами."
      },
      {
        "t": "p",
        "x": "5.4. Размер удержаний может зависеть от условий третьих лиц (авиакомпаний, гостиниц, партнёров и иных поставщиков услуг), если услуга включает элементы поездки или международного участия."
      },
      {
        "t": "p",
        "x": "5.5. В случае если услуга фактически оказана частично, возврат осуществляется пропорционально неоказанной части за вычетом понесённых расходов."
      },
      {
        "t": "h",
        "x": "6. Ответственность сторон"
      },
      {
        "t": "p",
        "x": "6.1. Стороны несут ответственность в соответствии с законодательством Республики Казахстан."
      },
      {
        "t": "p",
        "x": "6.2. Стороны освобождаются от ответственности за неисполнение обязательств при наступлении обстоятельств непреодолимой силы в соответствии со статьёй 359 Гражданского кодекса Республики Казахстан."
      },
      {
        "t": "p",
        "x": "6.3. Исполнитель не несёт ответственности за невозможность участия Заказчика по причинам, зависящим от Заказчика (в том числе отказ в визе, нарушение правил въезда, несоблюдение требований мероприятия)."
      },
      {
        "t": "h",
        "x": "7. Персональные данные"
      },
      {
        "t": "p",
        "x": "7.1. Заказчик даёт согласие на обработку и хранение персональных данных в целях исполнения настоящей Оферты."
      },
      {
        "t": "p",
        "x": "7.2. Обработка персональных данных осуществляется в соответствии с Законом Республики Казахстан «О персональных данных и их защите»."
      },
      {
        "t": "h",
        "x": "8. Заключительные положения"
      },
      {
        "t": "p",
        "x": "8.1. Настоящая Оферта действует бессрочно с момента её публикации на сайте Исполнителя."
      },
      {
        "t": "p",
        "x": "8.2. Исполнитель вправе вносить изменения в Оферту. Новая редакция применяется к правоотношениям, возникшим после даты её публикации."
      },
      {
        "t": "p",
        "x": "8.3. Все споры разрешаются путём переговоров, а при недостижении соглашения — в судебном порядке в соответствии с законодательством Республики Казахстан."
      },
      {
        "t": "h",
        "x": "9. Контактная информация"
      },
      {
        "t": "p",
        "x": "Компания: ТОО \"AZ GROUP LLC\"\nАдрес: Казахстан, Астана, Жилой массив Ақ-Бұлақ-3 улица АСКАР ТОКПАНОВ, дом 27\nБИН (ИИН): 241140003039\nБанк: АО \"Kaspi Bank\"\nКБе: 17\nБИК: CASPKZKA\nНомер счёта: KZ04722S000042220281\nEmail: info@az-group.kz\nWebsite: https://www.azgroup.kz"
      }
    ]
  },
  "kk": {
    "title": "Қоғамдық ұсыныс",
    "updated": "Соңғы жаңарту: 18 ақпан, 2026",
    "blocks": [
      {
        "t": "h",
        "x": "1. Жалпы ережелер"
      },
      {
        "t": "p",
        "x": "1.1. Осы Оферта Орындаушы тарапынан көрсетілетін ақылы білім беру қызметтерінің тәртібі мен шарттарын айқындайды. Оларға AZ GROUP брендімен өткізілетін олимпиадалар, чемпионаттар, тренингтер, курстар, вебинарлар, семинарлар, шетелдік сапарлар және өзге де іс-шаралар кіреді."
      },
      {
        "t": "p",
        "x": "1.2. Осы Офертаны акцепттеу Тапсырыс берушінің оның барлық талаптарымен толық және сөзсіз келісетінін білдіреді және қызмет көрсету туралы шарт жасасумен теңестіріледі."
      },
      {
        "t": "p",
        "x": "1.3. Акцепт болып Тапсырыс берушінің Орындаушы қызметтеріне толық немесе ішінара төлем жасауы (соның ішінде бөліп төлеу арқылы) танылады."
      },
      {
        "t": "p",
        "x": "1.4. Егер шарт кәмелетке толмаған тұлғаның мүддесіне жасалса, акцептті оның заңды өкілі жүзеге асырады және кәмелетке толмағанның атынан әрекет етуге заңды негіздерінің бар екенін растайды."
      },
      {
        "t": "h",
        "x": "2. Шарт мәні"
      },
      {
        "t": "p",
        "x": "2.1. Орындаушы Тапсырыс берушіге білім беру қызметтерін (олимпиадалар, тренингтер, семинарлар, курстар, оқыту, вебинарлар және өзге де іс-шаралар) көрсетуге міндеттенеді, ал Тапсырыс беруші белгіленген тарифтерге сәйкес оларды төлеуге міндеттенеді."
      },
      {
        "t": "p",
        "x": "2.2. Қызметтердің тізбесі, мазмұны, мерзімі, форматы, ұзақтығы және құны Орындаушының https://www.azgroup.kz ресми сайтында, ақпараттық хаттарында және ресми материалдарында көрсетіледі."
      },
      {
        "t": "p",
        "x": "2.3. Егер белгілі бір қызмет өзінің сипатына қарай міндетті түрде жеке жазбаша шарт жасасуды талап етсе (соның ішінде кешенді бағдарламалар, ұзақ мерзімді оқу, халықаралық сапарлар немесе Қазақстан Республикасының заңнамасына сәйкес талап етілген жағдайларда), тараптар жеке шарт жасасады. Мұндай жағдайда жеке шарттың талаптары осы Оферта талаптарынан басым болады."
      },
      {
        "t": "h",
        "x": "3. Тараптардың құқықтары мен міндеттері"
      },
      {
        "t": "p",
        "x": "3.1. Орындаушы міндеттенеді:"
      },
      {
        "t": "li",
        "x": "іс-шараны жарияланған бағдарламаға сәйкес ұйымдастыру және өткізу;"
      },
      {
        "t": "li",
        "x": "іс-шараның уақыты, орны немесе форматы өзгерген жағдайда Тапсырыс берушіні хабардар ету;"
      },
      {
        "t": "li",
        "x": "дербес деректерді Қазақстан Республикасының заңнамасына сәйкес өңдеу."
      },
      {
        "t": "p",
        "x": "3.2. Тапсырыс беруші міндеттенеді:"
      },
      {
        "t": "li",
        "x": "таңдалған қызмет үшін уақтылы төлем жасау;"
      },
      {
        "t": "li",
        "x": "Орындаушының жазбаша келісімінсіз оқу және әдістемелік материалдарды таратпау;"
      },
      {
        "t": "li",
        "x": "тіркеу кезінде дұрыс және шынайы мәліметтер ұсыну."
      },
      {
        "t": "h",
        "x": "4. Қызметтердің құны және төлем тәртібі"
      },
      {
        "t": "p",
        "x": "4.1. Қызметтердің құнын Орындаушы айқындайды және ол ресми сайтта және/немесе ресми ақпараттық материалдарда жарияланады."
      },
      {
        "t": "p",
        "x": "4.2. Төлем Қазақстан Республикасының ұлттық валютасы — теңгемен (KZT) қолма-қол ақшасыз тәсілмен, соның ішінде онлайн төлем және бөліп төлеу арқылы жүзеге асырылады."
      },
      {
        "t": "p",
        "x": "4.3. Төлем Орындаушының банктік шотына қаражат түскен сәттен бастап жасалған болып есептеледі."
      },
      {
        "t": "h",
        "x": "5. Қызметтен бас тарту және қаражатты қайтару"
      },
      {
        "t": "p",
        "x": "5.1. Тапсырыс беруші қызмет көрсетілу басталғанға дейін шарттан бас тартуға құқылы."
      },
      {
        "t": "p",
        "x": "5.2. Бас тартқан жағдайда төленген қаражат Орындаушының Тапсырыс берушінің қатысуын ұйымдастыруға байланысты нақты жұмсаған шығындарын шегере отырып қайтарылады."
      },
      {
        "t": "p",
        "x": "5.3. Мұндай шығындарға мыналар жатуы мүмкін:"
      },
      {
        "t": "li",
        "x": "іс-шара ұйымдастырушыларының тіркеу жарналары;"
      },
      {
        "t": "li",
        "x": "алаңдарды брондау;"
      },
      {
        "t": "li",
        "x": "дербестендірілген материалдарды дайындау;"
      },
      {
        "t": "li",
        "x": "банктік комиссиялар;"
      },
      {
        "t": "li",
        "x": "виза алымдары;"
      },
      {
        "t": "li",
        "x": "қайтарылмайтын әуе билеттері;"
      },
      {
        "t": "li",
        "x": "тұру орындарын брондау шығындары;"
      },
      {
        "t": "li",
        "x": "үшінші тұлғалар алдындағы өзге де міндеттемелер."
      },
      {
        "t": "p",
        "x": "5.4. Егер қызмет сапар немесе халықаралық қатысу элементтерін қамтыса, ұстап қалу мөлшері үшінші тұлғалардың (әуе компаниялары, қонақ үйлер, серіктестер және басқа да қызмет көрсетушілер) шарттарына байланысты болуы мүмкін."
      },
      {
        "t": "p",
        "x": "5.5. Қызмет ішінара көрсетілген жағдайда, қайтару көрсетілмеген бөлігіне пропорционалды түрде, жұмсалған шығындарды шегере отырып жүзеге асырылады."
      },
      {
        "t": "h",
        "x": "6. Тараптардың жауапкершілігі"
      },
      {
        "t": "p",
        "x": "6.1. Тараптар Қазақстан Республикасының заңнамасына сәйкес жауапкершілік көтереді."
      },
      {
        "t": "p",
        "x": "6.2. Тараптар Қазақстан Республикасы Азаматтық кодексінің 359-бабына сәйкес еңсерілмейтін күш жағдайлары туындаған кезде міндеттемелерді орындамағаны үшін жауапкершіліктен босатылады."
      },
      {
        "t": "p",
        "x": "6.3. Орындаушы Тапсырыс берушіге байланысты себептермен (виза беруден бас тарту, кіру ережелерін бұзу, іс-шара талаптарын сақтамау және т.б.) қатысу мүмкін болмаған жағдайда жауапты болмайды."
      },
      {
        "t": "h",
        "x": "7. Дербес деректер"
      },
      {
        "t": "p",
        "x": "7.1. Тапсырыс беруші осы Офертаны орындау мақсатында дербес деректерін өңдеуге және сақтауға келісім береді."
      },
      {
        "t": "p",
        "x": "7.2. Дербес деректер Қазақстан Республикасының «Дербес деректер және оларды қорғау туралы» Заңына сәйкес өңделеді."
      },
      {
        "t": "h",
        "x": "8. Қорытынды ережелер"
      },
      {
        "t": "p",
        "x": "8.1. Осы Оферта Орындаушының сайтында жарияланған сәттен бастап мерзімсіз қолданылады."
      },
      {
        "t": "p",
        "x": "8.2. Орындаушы Офертаға өзгерістер енгізуге құқылы. Жаңа редакция жарияланған күннен кейін туындаған құқықтық қатынастарға қолданылады."
      },
      {
        "t": "p",
        "x": "8.3. Даулар келіссөздер арқылы шешіледі, келісімге қол жеткізілмеген жағдайда — Қазақстан Республикасының заңнамасына сәйкес сот тәртібімен қаралады."
      },
      {
        "t": "h",
        "x": "9. Орындаушының деректемелері"
      },
      {
        "t": "p",
        "x": "Компания: «AZ GROUP LLC» ЖШС\nМекенжайы: Қазақстан Республикасы, Астана қаласы, Ақ-Бұлақ-3 тұрғын алабы Асқар Тоқпанов көшесі, 27 үй\nБСН: 241140003039\nБанк: «Kaspi Bank» АҚ\nКБе: 17\nБСК: CASPKZKA\nШот нөмірі: KZ04722S000042220281\nЭлектрондық пошта: info@az-group.kz\nВеб-сайт: https://www.azgroup.kz"
      }
    ]
  },
  "en": {
    "title": "Public Offer",
    "updated": "Last updated: February 18, 2026",
    "blocks": [
      {
        "t": "h",
        "x": "1. General Provisions"
      },
      {
        "t": "p",
        "x": "1.1. This Offer defines the procedure and conditions for the provision of paid educational services by the Service Provider, including participation in olympiads, championships, trainings, courses, webinars, seminars, international trips, and other events conducted under the AZ GROUP brand."
      },
      {
        "t": "p",
        "x": "1.2. Acceptance of this Offer constitutes full and unconditional agreement of the Client with all its terms and conditions and is legally equivalent to concluding a services agreement."
      },
      {
        "t": "p",
        "x": "1.3. Acceptance shall be deemed to occur upon payment by the Client for the Service Provider’s services (in full or in part, including installment payments) by any available payment method."
      },
      {
        "t": "p",
        "x": "1.4. Where the agreement is concluded in the interest of a minor, acceptance shall be made by the minor’s legal representative, who confirms having the legal authority to act on behalf of the minor."
      },
      {
        "t": "h",
        "x": "2. Subject of the Agreement"
      },
      {
        "t": "p",
        "x": "2.1. The Service Provider undertakes to provide the Client with educational services (including olympiads, trainings, seminars, courses, instruction, webinars, and other events), and the Client undertakes to pay for such services in accordance with the established tariffs."
      },
      {
        "t": "p",
        "x": "2.2. The list, content, duration, format, schedule, and cost of services are specified on the official website of the Service Provider at https://www.azgroup.kz, in informational letters, and in the official materials of the company."
      },
      {
        "t": "p",
        "x": "2.3. If a specific service by its nature requires the mandatory execution of a separate written agreement (including complex programs, long-term education, international trips, or where required by the legislation of the Republic of Kazakhstan), the parties shall formalize their relationship in a separate agreement. In such case, the terms of the separate agreement shall prevail over the terms of this Offer."
      },
      {
        "t": "h",
        "x": "3. Rights and Obligations of the Parties"
      },
      {
        "t": "p",
        "x": "3.1. The Service Provider undertakes to:"
      },
      {
        "t": "li",
        "x": "organize and conduct the event in accordance with the declared program;"
      },
      {
        "t": "li",
        "x": "provide necessary materials;"
      },
      {
        "t": "li",
        "x": "notify the Client of any changes in time, venue, or format of the event;"
      },
      {
        "t": "li",
        "x": "process personal data in compliance with the legislation of the Republic of Kazakhstan."
      },
      {
        "t": "p",
        "x": "3.2. The Client undertakes to:"
      },
      {
        "t": "li",
        "x": "pay for the selected service in a timely manner;"
      },
      {
        "t": "li",
        "x": "comply with participation rules;"
      },
      {
        "t": "li",
        "x": "refrain from distributing educational and methodological materials without the prior written consent of the Service Provider;"
      },
      {
        "t": "li",
        "x": "provide accurate information during registration."
      },
      {
        "t": "h",
        "x": "4. Cost of Services and Payment Procedure"
      },
      {
        "t": "p",
        "x": "4.1. The cost of services shall be determined by the Service Provider and published on the official website and/or in official informational materials."
      },
      {
        "t": "p",
        "x": "4.2. Payment shall be made in Kazakhstani tenge (KZT) via non-cash methods, including online payment and installment options."
      },
      {
        "t": "p",
        "x": "4.3. Payment shall be deemed completed upon receipt of funds in the Service Provider’s bank account."
      },
      {
        "t": "h",
        "x": "5. Refusal of Services and Refund Policy"
      },
      {
        "t": "p",
        "x": "5.1. The Client has the right to withdraw from the agreement at any time prior to the commencement of the service."
      },
      {
        "t": "p",
        "x": "5.2. In case of withdrawal, the paid amount shall be refunded less the actual expenses incurred by the Service Provider in organizing the Client’s participation."
      },
      {
        "t": "p",
        "x": "5.3. Such expenses may include, but are not limited to:"
      },
      {
        "t": "li",
        "x": "registration fees of event organizers;"
      },
      {
        "t": "li",
        "x": "venue reservations;"
      },
      {
        "t": "li",
        "x": "production of personalized materials;"
      },
      {
        "t": "li",
        "x": "bank commissions;"
      },
      {
        "t": "li",
        "x": "visa fees;"
      },
      {
        "t": "li",
        "x": "non-refundable airline tickets;"
      },
      {
        "t": "li",
        "x": "accommodation booking costs;"
      },
      {
        "t": "li",
        "x": "other obligations to third parties."
      },
      {
        "t": "p",
        "x": "5.4. The amount retained may depend on the terms and conditions of third parties (airlines, hotels, partners, and other service providers) if the service includes travel or international participation components."
      },
      {
        "t": "p",
        "x": "5.5. If the service has been partially provided, the refund shall be made proportionally to the unprovided part, less incurred expenses."
      },
      {
        "t": "h",
        "x": "6. Liability of the Parties"
      },
      {
        "t": "p",
        "x": "6.1. The parties shall bear liability in accordance with the legislation of the Republic of Kazakhstan."
      },
      {
        "t": "p",
        "x": "6.2. The parties shall be released from liability for failure to perform obligations in case of force majeure circumstances pursuant to Article 359 of the Civil Code of the Republic of Kazakhstan."
      },
      {
        "t": "p",
        "x": "6.3. The Service Provider shall not be liable for the Client’s inability to participate due to reasons attributable to the Client (including visa refusal, violation of entry rules, or failure to comply with event requirements)."
      },
      {
        "t": "h",
        "x": "7. Personal Data"
      },
      {
        "t": "p",
        "x": "7.1. The Client provides consent to the processing and storage of personal data for the purpose of executing this Offer."
      },
      {
        "t": "p",
        "x": "7.2. Personal data shall be processed in accordance with the Law of the Republic of Kazakhstan “On Personal Data and Their Protection.”"
      },
      {
        "t": "h",
        "x": "8. Final Provisions"
      },
      {
        "t": "p",
        "x": "8.1. This Offer shall remain valid indefinitely from the moment of its publication on the Service Provider’s website."
      },
      {
        "t": "p",
        "x": "8.2. The Service Provider reserves the right to amend this Offer. The new version shall apply to legal relations arising after the date of its publication."
      },
      {
        "t": "p",
        "x": "8.3. All disputes shall be resolved through negotiations, and if no agreement is reached, through judicial proceedings in accordance with the legislation of the Republic of Kazakhstan."
      },
      {
        "t": "h",
        "x": "9. Service Provider Details"
      },
      {
        "t": "p",
        "x": "Company Name: AZ GROUP LLC Limited Liability Partnership\nAddress: 27 Askar Tokpanov Street, Ak-Bulak-3 Residential Area, Astana, Republic of Kazakhstan\nBusiness Identification Number (BIN): 241140003039\nBank: JSC Kaspi Bank\nKBe: 17\nBIC: CASPKZKA\nAccount Number: KZ04722S000042220281\nEmail: info@az-group.kz\nWebsite: https://www.azgroup.kz"
      }
    ]
  }
};
