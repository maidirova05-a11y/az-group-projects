-- Тексты новостей со старого сайта az-group.kz/news/<id> (ru) и переводы kk/en.
-- Заполняются только пустые поля: тексты, уже введённые в админке, не перезаписываются.
UPDATE "news" SET "body" = $nb$В Риме встретились 623 команды из 18 стран, чтобы показать свои лучшие инженерные и творческие решения на Fibonacci International Robot Olympiad 2025. Среди них — яркие и сильные команды из Казахстана, которые вновь заявили о себе на мировом уровне.

Результаты сборной Казахстана: 19 золотых медалей, 13 серебряных, 8 бронзовых и 12 мотивационных наград Jury Award. От страны выступили 59 команд и 96 участников, и каждый из них внёс вклад в этот успех.

Особая гордость — команды из Астаны: 17 золотых, 7 серебряных, 3 бронзовых медали и 5 наград Jury Award. Столица в очередной раз доказала, что является одним из флагманов робототехники в стране.

Казахстан вновь стал абсолютным чемпионом в общем медальном зачёте, завоевав больше всех золотых медалей среди 18 стран. Поздравляем — это сильнейшее выступление Казахстана за всю историю соревнований!$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/12' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$Римде 18 елден келген 623 команда Fibonacci International Robot Olympiad 2025 олимпиадасында өздерінің ең үздік инженерлік және шығармашылық шешімдерін көрсетті. Олардың арасында әлемдік деңгейде тағы да өзін танытқан Қазақстанның жарқын әрі мықты командалары болды.

Қазақстан құрамасының нәтижелері: 19 алтын, 13 күміс, 8 қола медаль және 12 Jury Award ынталандыру марапаты. Елімізден 59 команда мен 96 қатысушы өнер көрсетті, әрқайсысы осы жетістікке үлес қосты.

Ерекше мақтанышымыз — Астана командалары: 17 алтын, 7 күміс, 3 қола медаль және 5 Jury Award марапаты. Елорда тағы да елдегі робототехниканың көшбасшыларының бірі екенін дәлелдеді.

Қазақстан 18 елдің ішінде ең көп алтын медаль жеңіп алып, жалпы медальдық есепте тағы да абсолютті чемпион атанды. Құттықтаймыз — бұл жарыстар тарихындағы Қазақстанның ең мықты өнері!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/12' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$In Rome, 623 teams from 18 countries came together to show their best engineering and creative solutions at the Fibonacci International Robot Olympiad 2025. Among them were bright and strong teams from Kazakhstan, who once again made their mark on the world stage.

Team Kazakhstan's results: 19 gold, 13 silver and 8 bronze medals, plus 12 Jury Award motivational prizes. The country was represented by 59 teams and 96 participants, and every one of them contributed to this success.

We are especially proud of the teams from Astana: 17 gold, 7 silver and 3 bronze medals and 5 Jury Awards. The capital has proven once again that it is one of the country's leaders in robotics.

Kazakhstan again became the overall champion of the medal table, winning the most gold medals among 18 countries. Congratulations — this was Kazakhstan's strongest performance in the history of the competition!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/12' AND coalesce("translations"->'en'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "body" = $nb$Наша компания провела семинар для учителей школ-партнёров на базе Future School на тему «Интеграция искусственного интеллекта в образование».

Участники обсудили актуальные направления и практические методы внедрения ИИ в учебный процесс, познакомились с эффективными способами применения современных технологий в обучении и поделились собственным опытом. Учителя отметили содержательность, актуальность и интересную подачу материала, а также высокий уровень организации.

Bilim Talks — площадка для обмена опытом: новые и актуальные темы, профессиональное общение и развитие в сфере образования. Присоединяйтесь к нам и станьте частью сообщества, которое формирует будущее образования!$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/5' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$Компаниямыз Future School базасында серіктес мектептердің мұғалімдеріне арналған «Жасанды интеллектіні білім беруге енгізу» тақырыбында семинар өткізді.

Қатысушылар ЖИ-ді оқу үдерісіне енгізудің өзекті бағыттары мен практикалық әдістерін талқылап, заманауи технологияларды оқытуда тиімді қолдану тәсілдерімен танысты және өз тәжірибелерімен бөлісті. Мұғалімдер материалдың мазмұнды, өзекті әрі қызықты берілгенін, сондай-ақ ұйымдастырудың жоғары деңгейін атап өтті.

Bilim Talks — тәжірибе алмасу алаңы: жаңа әрі өзекті тақырыптар, кәсіби қарым-қатынас және білім беру саласындағы даму. Бізге қосылып, білім берудің болашағын қалыптастыратын қауымдастықтың бір бөлігі болыңыз!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/5' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$Our company held a seminar for teachers from partner schools at Future School on the topic “Integrating artificial intelligence into education”.

Participants discussed current trends and practical methods for bringing AI into the classroom, learned effective ways to use modern technology in teaching and shared their own experience. Teachers praised the substance, relevance and engaging delivery of the material, as well as the high level of organisation.

Bilim Talks is a platform for sharing experience: new and relevant topics, professional networking and growth in education. Join us and become part of a community that shapes the future of education!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/5' AND coalesce("translations"->'en'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "body" = $nb$11 и 12 октября мы провели в Алматы международный тренинг по робототехнике для учителей. Обучение прошло на базе нашей школы-партнёра Fiztex Almaty при поддержке «Алматы Дарыны».

Два дня участники проходили интенсивное практическое обучение, участвовали в мини-турнире и прокачивали свои навыки. Тренинги провели опытные тренеры сборной Казахстана и ведущие зарубежные специалисты из Турции. Участники отметили высокий профессионализм, организацию и пользу курса.

Напоминаем: все наши тренинги подходят для аттестации учителей. Присоединяйтесь к нам и откройте мир больших возможностей!$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/4' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$11–12 қазанда Алматыда мұғалімдерге арналған робототехника бойынша халықаралық тренинг өткіздік. Оқу «Алматы дарыны» орталығының қолдауымен серіктес мектебіміз Fiztex Almaty базасында өтті.

Екі күн бойы қатысушылар қарқынды практикалық оқудан өтіп, шағын турнирге қатысып, дағдыларын шыңдады. Тренингтерді Қазақстан құрамасының тәжірибелі жаттықтырушылары мен Түркиядан келген жетекші шетелдік мамандар жүргізді. Қатысушылар жоғары кәсібилікті, ұйымдастыруды және курстың пайдасын атап өтті.

Еске саламыз: біздің барлық тренингтеріміз мұғалімдерді аттестаттауға жарамды. Бізге қосылып, үлкен мүмкіндіктер әлемін ашыңыз!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/4' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$On 11–12 October we held an international robotics training for teachers in Almaty. It took place at our partner school Fiztex Almaty with the support of Almaty Daryny.

For two days participants went through intensive hands-on training, took part in a mini-tournament and sharpened their skills. The sessions were led by experienced coaches of the Kazakhstan national team and leading international specialists from Turkey. Participants highlighted the professionalism, the organisation and the practical value of the course.

A reminder: all our trainings count towards teacher attestation. Join us and discover a world of opportunities!$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/4' AND coalesce("translations"->'en'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "body" = $nb$11–12 октября в Алматы состоится международный тренинг по робототехнике от ведущих мировых специалистов в области робототехники, программирования и пилотирования дронов. Организаторы — образовательная компания AZ Group совместно с «Алматы Дарыны».

Участников ждут два дня интенсивных занятий с упором на практику с зарубежными экспертами: работа с Arduino, LEGO Mindstorms и дронами, написание программ на Arduino для line following, прохождения лабиринта и категории Mini Sumo, основы создания собственных печатных плат (PCB).

Прохождение курса учитывается при аттестации педагога и включено в платформу «Устаз».$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/2' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$11–12 қазанда Алматыда робототехника, бағдарламалау және дрон басқару салаларындағы әлемдік жетекші мамандардан робототехника бойынша халықаралық тренинг өтеді. Ұйымдастырушылар — AZ Group білім беру компаниясы мен «Алматы дарыны».

Қатысушыларды шетелдік сарапшылармен практикаға бағытталған екі күндік қарқынды сабақтар күтеді: Arduino, LEGO Mindstorms және дрондармен жұмыс, line following, лабиринттен өту және Mini Sumo санаттары үшін Arduino-да бағдарлама жазу, жеке баспа платаларын (PCB) жасау негіздері.

Курстан өту педагогті аттестаттау кезінде ескеріледі және «Ұстаз» платформасына енгізілген.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/2' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$On 11–12 October Almaty will host an international robotics training led by world-class specialists in robotics, programming and drone piloting. It is organised by the education company AZ Group together with Almaty Daryny.

Participants can expect two days of intensive, practice-focused sessions with international experts: working with Arduino, LEGO Mindstorms and drones, programming Arduino for line following, maze solving and the Mini Sumo category, and the basics of designing their own printed circuit boards (PCBs).

Completing the course counts towards teacher attestation and is included in the Ustaz platform.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/2' AND coalesce("translations"->'en'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "body" = $nb$8 ноября в Астане и других городах Казахстана стартуют олимпиады Fibonacci по математике, информатике, физике, химии и биологии. С ноября по февраль учащиеся 3–12 классов смогут принять участие и побороться за ценные призы: современные гаджеты, образовательные поездки за рубеж, гранты в частные школы и вузы.

Участвовать можно несколько раз и по разным предметам — каждое призовое место засчитывается отдельно, поэтому участие ещё выгоднее. Все, кто наберёт больше 50% правильных ответов, получают возможность выйти в мировой финал в одной из стран на выбор: Турция или Италия.

Результаты олимпиад также учитываются при аттестации учителей — это дополнительное преимущество для школ.$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/3' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$8 қарашада Астанада және Қазақстанның басқа қалаларында математика, информатика, физика, химия және биология пәндері бойынша Fibonacci олимпиадалары басталады. Қарашадан ақпанға дейін 3–12 сынып оқушылары қатысып, бағалы сыйлықтар үшін күресе алады: заманауи гаджеттер, шетелге білім беру сапарлары, жеке мектептер мен жоғары оқу орындарына гранттар.

Бірнеше рет және әртүрлі пәндер бойынша қатысуға болады — әр жүлделі орын жеке есептеледі, сондықтан қатысу одан да тиімді. Дұрыс жауаптардың 50%-дан астамын жинағандардың бәрі таңдауы бойынша Түркия немесе Италияда өтетін әлемдік финалға шығу мүмкіндігіне ие болады.

Олимпиада нәтижелері мұғалімдерді аттестаттау кезінде де ескеріледі — бұл мектептер үшін қосымша артықшылық.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/3' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$On 8 November the Fibonacci olympiads in mathematics, computer science, physics, chemistry and biology start in Astana and other cities of Kazakhstan. From November to February, students in grades 3–12 can take part and compete for valuable prizes: modern gadgets, educational trips abroad, and grants to private schools and universities.

You can take part several times and in different subjects — each prize-winning place counts separately, which makes participation even more worthwhile. Everyone who scores more than 50% correct answers gets the chance to reach the world final in a country of their choice: Turkey or Italy.

Olympiad results also count towards teacher attestation — an extra advantage for schools.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/3' AND coalesce("translations"->'en'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "body" = $nb$27–28 сентября в Астане образовательная компания AZ Group совместно с «Астана Дарыны» провела международный тренинг RoboCoach International.

Учителя получили практические и теоретические занятия с зарубежными экспертами, работу с Arduino, LEGO Mindstorms и дронами, подготовку к турнирам, полезные рекомендации, общение и обмен опытом. Участникам также объяснили написание программ на Arduino для line following, прохождения лабиринта и категории Mini Sumo и основы создания собственных печатных плат (PCB).

Прохождение курса учитывается при аттестации педагога и включено в платформу «Устаз».$nb$, "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/1' AND "body" = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{kk}', coalesce("translations"->'kk', '{}'::jsonb) || jsonb_build_object('body', $nb$27–28 қыркүйекте Астанада AZ Group білім беру компаниясы «Астана дарыны» орталығымен бірге RoboCoach International халықаралық тренингін өткізді.

Мұғалімдер шетелдік сарапшылармен практикалық және теориялық сабақтардан өтіп, Arduino, LEGO Mindstorms және дрондармен жұмыс істеді, турнирлерге дайындалып, пайдалы ұсыныстар алды, тәжірибе алмасты. Қатысушыларға line following, лабиринттен өту және Mini Sumo санаттары үшін Arduino-да бағдарлама жазу мен жеке баспа платаларын (PCB) жасау негіздері де түсіндірілді.

Курстан өту педагогті аттестаттау кезінде ескеріледі және «Ұстаз» платформасына енгізілген.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/1' AND coalesce("translations"->'kk'->>'body', '') = '';
--> statement-breakpoint
UPDATE "news" SET "translations" = jsonb_set("translations", '{en}', coalesce("translations"->'en', '{}'::jsonb) || jsonb_build_object('body', $nb$On 27–28 September in Astana, the education company AZ Group, together with Astana Daryny, held the international training RoboCoach International.

Teachers received practical and theoretical sessions with international experts, worked with Arduino, LEGO Mindstorms and drones, prepared for tournaments, got useful advice and exchanged experience. Participants were also taught how to program Arduino for line following, maze solving and the Mini Sumo category, and the basics of designing their own printed circuit boards (PCBs).

Completing the course counts towards teacher attestation and is included in the Ustaz platform.$nb$)), "updated_at" = now() WHERE "external_url" = 'https://az-group.kz/news/1' AND coalesce("translations"->'en'->>'body', '') = '';
