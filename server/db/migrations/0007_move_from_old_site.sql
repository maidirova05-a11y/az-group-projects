-- Перенос со старого сайта az-group.kz: регистрация, оферта и новости теперь на основном сайте.
-- Меняются только значения, которые всё ещё указывают на старый сайт (правки из админки не трогаем).

-- Новости: номер на старом сайте → legacy_id (для 301 со старых адресов /news/<id>), ссылка «источник» больше не нужна.
UPDATE "news" SET "legacy_id" = substring("external_url" from 'az-group\.kz/news/([0-9]+)')::int
WHERE "legacy_id" IS NULL AND "external_url" ~ '^https?://(www\.)?az-group\.kz/news/[0-9]+/?$'
  AND NOT EXISTS (SELECT 1 FROM "news" n2 WHERE n2."legacy_id" = substring("news"."external_url" from 'az-group\.kz/news/([0-9]+)')::int);
--> statement-breakpoint
UPDATE "news" SET "external_url" = NULL, "updated_at" = now()
WHERE "external_url" ~ '^https?://(www\.)?az-group\.kz/' AND "body" <> '';
--> statement-breakpoint

-- Мероприятия: ссылки регистрации на старый сайт → регистрация на основном сайте (пустое поле = /register).
UPDATE "events" SET "registration_url" = NULL, "updated_at" = now()
WHERE "registration_url" ~ '^https?://(www\.)?az-group\.kz';
--> statement-breakpoint

-- Настройки «Ссылки»: регистрация и кабинет → /register.
UPDATE "settings" SET "value" = jsonb_set("value", '{registration}', '"/register"'), "updated_at" = now()
WHERE "key" = 'links' AND "value"->>'registration' ~ '^https?://(www\.)?az-group\.kz';
--> statement-breakpoint
UPDATE "settings" SET "value" = jsonb_set("value", '{cabinet}', '"/register"'), "updated_at" = now()
WHERE "key" = 'links' AND "value"->>'cabinet' ~ '^https?://(www\.)?az-group\.kz';
--> statement-breakpoint

-- Настройки «Контакты»: публичная оферта → /offer.
UPDATE "settings" SET "value" = jsonb_set("value", '{offer}', '"/offer"'), "updated_at" = now()
WHERE "key" = 'contacts' AND "value"->>'offer' ~ '^https?://(www\.)?az-group\.kz';
--> statement-breakpoint

-- Оплата олимпиады Fibonacci через Kaspi (ссылка со старого сайта).
UPDATE "programs" SET "payment_url" = 'https://kaspi.kz/pay/CoursesUniversal?subservice_id=22909&region_id=19&started_from=share', "updated_at" = now()
WHERE "slug" = 'fibonacci-math' AND "payment_url" IS NULL;
--> statement-breakpoint

-- FAQ «Как зарегистрироваться»: вместо кабинета на старом сайте — регистрация здесь.
UPDATE "faqs" SET "answer" = 'Нажмите «Регистрация» в шапке сайта или «Участвовать» у нужной даты в разделе «Мероприятия». Выберите программу, город и дату, заполните анкету участника и примите условия публичной оферты. Для платных олимпиад сразу после регистрации появится кнопка оплаты через Kaspi, а менеджер подтвердит участие по телефону.', "updated_at" = now()
WHERE "answer" LIKE '%az-group.kz%';
--> statement-breakpoint
UPDATE "faqs" SET "translations" = jsonb_set("translations", '{kk,answer}', to_jsonb('Сайттың жоғарғы жағындағы «Тіркелу» батырмасын немесе «Іс-шаралар» бөліміндегі қажетті күннің жанындағы «Қатысу» батырмасын басыңыз. Бағдарламаны, қаланы және күнді таңдап, қатысушы анкетасын толтырып, жария оферта шарттарын қабылдаңыз. Ақылы олимпиадаларда тіркелгеннен кейін бірден Kaspi арқылы төлеу батырмасы шығады, ал менеджер қатысуды телефон арқылы растайды.'::text)), "updated_at" = now()
WHERE "translations"->'kk'->>'answer' LIKE '%az-group.kz%';
--> statement-breakpoint
UPDATE "faqs" SET "translations" = jsonb_set("translations", '{en,answer}', to_jsonb('Click “Register” at the top of the site or “Take part” next to a date in the “Events” section. Choose the programme, city and date, fill in the participant form and accept the public offer. For paid olympiads a Kaspi payment button appears right after registration, and a manager will confirm your participation by phone.'::text)), "updated_at" = now()
WHERE "translations"->'en'->>'answer' LIKE '%az-group.kz%';
--> statement-breakpoint

-- Цена тура олимпиады Fibonacci (25 000 ₸, как на сайте и в FAQ) — только там, где она не указана.
UPDATE "events" SET "price" = 25000, "updated_at" = now()
WHERE "price" IS NULL AND "month_only" = false AND "start_date" IS NOT NULL AND "place" = 'Астана'
  AND "program_id" IN (SELECT "id" FROM "programs" WHERE "slug" = 'fibonacci-math');
