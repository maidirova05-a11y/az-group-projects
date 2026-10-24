/** Мультиязычность в API: ?lang= у публичного контента, translations в админ-API, переводы настроек. */
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { PublicContent } from '../shared/schemas';
import { applyTranslations } from '../server/db/seed';
import { Client, asEditor, asOwner, db, expectJson, schema, uniq } from './helpers';

let owner: Client;
let editor: Client;
beforeAll(async () => { owner = await asOwner(); editor = await asEditor(); });

const content = async (lang?: string) => {
  const res = await new Client().get(`/public/content${lang === undefined ? '' : `?lang=${lang}`}`);
  return { res, data: await expectJson<PublicContent & { lang: string }>(res, 200) };
};

describe('GET /api/public/content?lang=', () => {
  it('default and unknown lang → ru; lang echoed; no translations field; cache header kept', async () => {
    const def = await content();
    const bad = await content('de');
    const ru = await content('ru');
    expect(def.data.lang).toBe('ru');
    expect(bad.data.lang).toBe('ru');
    expect(bad.data).toEqual(ru.data);
    expect(def.data).toEqual(ru.data);
    for (const lang of ['ru', 'kk', 'en']) {
      const { res, data } = await content(lang);
      expect(data.lang).toBe(lang);
      expect(res.headers.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=600');
      expect(JSON.stringify(data)).not.toContain('"translations"');
    }
  });

  it('kk/en: translated fields win, empty translation falls back to Russian, other fields untouched', async () => {
    const slug = uniq('i18n').toLowerCase();
    const p = await expectJson(await owner.post('/admin/programs', {
      slug, name: 'Программа', subtitle: 'Подзаголовок', category: 'science',
      translations: { kk: { name: 'Бағдарлама', subtitle: '' }, en: { name: 'Program', subtitle: 'Subtitle' } },
    }), 201);
    await expectJson(await owner.post(`/admin/programs/${p.id}/events`, {
      label: 'Май', place: 'Астана', startDate: '2027-05-01', translations: { en: { label: 'May' } },
    }), 201);
    const faq = await expectJson(await owner.post('/admin/faqs', {
      question: uniq('Вопрос'), answer: 'Ответ', translations: { kk: { question: 'Сұрақ', answer: '  ' } },
    }), 201);
    try {
      const kk = (await content('kk')).data;
      const en = (await content('en')).data;
      const ru = (await content('ru')).data;
      const pk = kk.programs.find(x => x.id === p.id)!;
      const pe = en.programs.find(x => x.id === p.id)!;
      const pr = ru.programs.find(x => x.id === p.id)!;
      expect(pk).toMatchObject({ name: 'Бағдарлама', subtitle: 'Подзаголовок', slug, category: 'science' });
      expect(pe).toMatchObject({ name: 'Program', subtitle: 'Subtitle' });
      expect(pr).toMatchObject({ name: 'Программа', subtitle: 'Подзаголовок' });
      expect(pe.events[0]).toMatchObject({ label: 'May', place: 'Астана', startDate: '2027-05-01' });
      expect(pk.events[0]).toMatchObject({ label: 'Май', place: 'Астана' });
      expect(kk.faqs.find(f => f.id === faq.id)).toMatchObject({ question: 'Сұрақ', answer: 'Ответ' });
      expect(en.faqs.find(f => f.id === faq.id)).toMatchObject({ question: faq.question, answer: 'Ответ' });
      // структура и порядок одинаковы на всех языках
      expect(kk.programs.map(x => x.id)).toEqual(ru.programs.map(x => x.id));
      expect(en.faqs.map(x => x.id)).toEqual(ru.faqs.map(x => x.id));
    } finally {
      await owner.del(`/admin/programs/${p.id}`);
      await owner.del(`/admin/faqs/${faq.id}`);
    }
  });

  it('seeded translations (src/i18n/content) are applied when present', async () => {
    const rows = await db().select().from(schema.programs);
    const withKk = rows.find(r => r.published && r.translations?.kk?.subtitle?.trim());
    if (!withKk) return; // файлов переводов нет — нечего проверять
    const kk = (await content('kk')).data;
    expect(kk.programs.find(p => p.id === withKk.id)?.subtitle).toBe(withKk.translations.kk!.subtitle!.trim());
  });

  it('settings: deep merge, arrays only with equal length', async () => {
    const [cur] = await db().select().from(schema.settings).where(eq(schema.settings.key, 'about'));
    const ruAbout = (await content('ru')).data.settings.about;
    try {
      await db().update(schema.settings).set({
        translations: {
          en: {
            title: 'About us',
            pillars: ruAbout.pillars.map((_, i) => ({ title: i === 0 ? 'First' : '', text: '' })),
            directions: ['only one'],
          },
        },
      }).where(eq(schema.settings.key, 'about'));
      const en = (await content('en')).data.settings.about;
      expect(en.title).toBe('About us');
      expect(en.pillars[0]).toEqual({ ...ruAbout.pillars[0], title: 'First' });
      expect(en.pillars.slice(1)).toEqual(ruAbout.pillars.slice(1));
      expect(en.directions).toEqual(ruAbout.directions.length === 1 ? ['only one'] : ruAbout.directions);
      expect(en.achievements).toEqual(ruAbout.achievements);
      expect((await content('kk')).data.settings.about).toEqual(ruAbout);
    } finally {
      await db().update(schema.settings).set({ translations: cur.translations }).where(eq(schema.settings.key, 'about'));
    }
  });
});

describe('admin translations', () => {
  it('round-trip on simple resources and per-language PATCH merge', async () => {
    const created = await expectJson(await editor.post('/admin/projects', {
      slug: uniq('trp').toLowerCase(), name: 'Проект', category: 'Олимпиады',
      translations: { kk: { name: 'Жоба' }, en: { name: 'Project', tagline: 'Tagline' } },
    }), 201);
    try {
      expect(created.translations).toEqual({ kk: { name: 'Жоба' }, en: { name: 'Project', tagline: 'Tagline' } });
      const list = await expectJson<any[]>(await owner.get('/admin/projects'), 200);
      expect(list.find(x => x.id === created.id).translations).toEqual(created.translations);

      // только kk — en сохраняется, kk заменяется целиком
      const p1 = await expectJson(await owner.patch(`/admin/projects/${created.id}`, { translations: { kk: { tagline: 'Тагл' } } }), 200);
      expect(p1.translations).toEqual({ kk: { tagline: 'Тагл' }, en: { name: 'Project', tagline: 'Tagline' } });
      // PATCH без translations их не трогает
      const p2 = await expectJson(await owner.patch(`/admin/projects/${created.id}`, { name: 'Проект 2' }), 200);
      expect(p2.translations).toEqual(p1.translations);
      // пустые строки допустимы и означают «нет перевода»
      const p3 = await expectJson(await owner.patch(`/admin/projects/${created.id}`, { translations: { en: { name: '' } } }), 200);
      expect(p3.translations).toEqual({ kk: { tagline: 'Тагл' }, en: { name: '' } });
      // валидация длины и формы
      const bad = await expectJson(await owner.patch(`/admin/projects/${created.id}`, { translations: { en: { name: 'x'.repeat(161) } } }), 422);
      expect(Object.keys(bad.error.fields)[0]).toMatch(/^translations/);
      expect((await owner.patch(`/admin/projects/${created.id}`, { translations: { en: { name: 5 } } })).status).toBe(422);
      // без translations при создании — {}
      const plain = await expectJson(await owner.post('/admin/faqs', { question: uniq('В'), answer: 'О' }), 201);
      expect(plain.translations).toEqual({});
      await owner.del(`/admin/faqs/${plain.id}`);
    } finally {
      await owner.del(`/admin/projects/${created.id}`);
    }
  });

  it('programs and events: translations in GET, PATCH merges per language', async () => {
    const p = await expectJson(await owner.post('/admin/programs', {
      slug: uniq('trprog').toLowerCase(), name: 'П', category: 'robotics', translations: { en: { name: 'P' } },
    }), 201);
    try {
      expect(p.translations).toEqual({ en: { name: 'P' } });
      const ev = await expectJson(await owner.post(`/admin/programs/${p.id}/events`, {
        label: 'Июнь', place: 'Алматы', translations: { kk: { label: 'Маусым' }, en: { label: 'June' } },
      }), 201);
      expect(ev.translations).toEqual({ kk: { label: 'Маусым' }, en: { label: 'June' } });
      const pp = await expectJson(await owner.patch(`/admin/programs/${p.id}`, { translations: { kk: { name: 'Б' } } }), 200);
      expect(pp.translations).toEqual({ en: { name: 'P' }, kk: { name: 'Б' } });
      expect(pp.events[0].translations).toEqual(ev.translations);
      const pe = await expectJson(await owner.patch(`/admin/events/${ev.id}`, { translations: { en: { place: 'Almaty' } } }), 200);
      expect(pe.translations).toEqual({ kk: { label: 'Маусым' }, en: { place: 'Almaty' } });
      const pe2 = await expectJson(await owner.patch(`/admin/events/${ev.id}`, { place: 'Астана' }), 200);
      expect(pe2.translations).toEqual(pe.translations);
      const list = await expectJson<any[]>(await owner.get('/admin/programs'), 200);
      expect(list.find(x => x.id === p.id).events[0].translations).toEqual(pe.translations);
    } finally {
      await owner.del(`/admin/programs/${p.id}`);
    }
  });
});

describe('settings translations', () => {
  it('old GET/PUT shapes unchanged (backwards compatible)', async () => {
    const s = await expectJson(await owner.get('/admin/settings'), 200);
    expect(Object.keys(s).sort()).toEqual(['about', 'contacts', 'links', 'stats']);
    expect(s.contacts).toHaveProperty('phone');
    expect(s.contacts).not.toHaveProperty('value');
    expect(Array.isArray(s.stats)).toBe(true);
    const saved = await expectJson(await owner.put('/admin/settings/stats', s.stats), 200);
    expect(saved).toEqual(s.stats);
  });

  it('GET /settings/translations, PUT /settings/:key/translations (per-language merge), public merge', async () => {
    const before = await expectJson(await owner.get('/admin/settings/translations'), 200);
    expect(Object.keys(before).sort()).toEqual(['about', 'contacts', 'links', 'stats']);
    try {
      expect((await editor.put('/admin/settings/contacts/translations', { en: { address: 'x' } })).status).toBe(403);
      const r1 = await expectJson(await owner.put('/admin/settings/contacts/translations', { kk: { address: 'Астана қ.' }, en: { address: 'Astana' } }), 200);
      expect(r1).toEqual({ ...before.contacts, kk: { address: 'Астана қ.' }, en: { address: 'Astana' } });
      const r2 = await expectJson(await owner.put('/admin/settings/contacts/translations', { en: { address: 'Astana city' } }), 200);
      expect(r2).toEqual({ ...before.contacts, kk: { address: 'Астана қ.' }, en: { address: 'Astana city' } });
      const all = await expectJson(await owner.get('/admin/settings/translations'), 200);
      expect(all.contacts).toEqual(r2);
      expect((await content('en')).data.settings.contacts.address).toBe('Astana city');
      expect((await content('kk')).data.settings.contacts.address).toBe('Астана қ.');
      // старый GET не изменился
      const s = await expectJson(await owner.get('/admin/settings'), 200);
      expect(s.contacts).not.toHaveProperty('translations');
      // ошибки
      expect((await owner.put('/admin/settings/secret/translations', {})).status).toBe(404);
      expect((await owner.put('/admin/settings/stats/translations', { en: [{ value: 1 }] })).status).toBe(422);
      expect((await owner.put('/admin/settings/contacts/translations', { kk: { address: 'x'.repeat(201) } })).status).toBe(422);
      expect((await new Client().put('/admin/settings/contacts/translations', {})).status).toBe(401);
    } finally {
      await db().update(schema.settings).set({ translations: before.contacts }).where(eq(schema.settings.key, 'contacts'));
    }
  });

  it('PUT /settings/:key accepts { value, translations? } as well as the plain value', async () => {
    const s = await expectJson(await owner.get('/admin/settings'), 200);
    const tr = await expectJson(await owner.get('/admin/settings/translations'), 200);
    try {
      const res = await expectJson(await owner.put('/admin/settings/stats', {
        value: s.stats, translations: { en: s.stats.map((x: { value: string; label: string }) => ({ value: x.value, label: `EN ${x.label}` })) },
      }), 200);
      expect(res.value).toEqual(s.stats);
      expect(res.translations.en[0].label).toBe(`EN ${s.stats[0].label}`);
      if (tr.stats.kk) expect(res.translations.kk).toEqual(tr.stats.kk); // kk не стёрт
      expect((await content('en')).data.settings.stats[0].label).toBe(`EN ${s.stats[0].label}`);
      // { value } без translations — переводы сохраняются
      const res2 = await expectJson(await owner.put('/admin/settings/stats', { value: s.stats }), 200);
      expect(res2.translations).toEqual(res.translations);
      // плоское значение — ответ прежней формы, переводы сохраняются
      expect(await expectJson(await owner.put('/admin/settings/stats', s.stats), 200)).toEqual(s.stats);
      expect((await expectJson(await owner.get('/admin/settings/translations'), 200)).stats).toEqual(res.translations);
      // невалидное значение в новой форме → 422 с путём value.*
      const bad = await expectJson(await owner.put('/admin/settings/contacts', { value: { ...s.contacts, email: 'nope' } }), 422);
      expect(bad.error.fields).toHaveProperty('value.email');
    } finally {
      await db().update(schema.settings).set({ translations: tr.stats }).where(eq(schema.settings.key, 'stats'));
    }
  });
});

describe('seed applyTranslations', () => {
  it('maps natural keys to rows and merges per language without touching Russian content', async () => {
    const [prog] = await db().select().from(schema.programs).where(eq(schema.programs.slug, 'fibonacci-math'));
    if (!prog) return;
    const [faq0] = await db().select().from(schema.faqs).orderBy(schema.faqs.sort).limit(1);
    const before = { prog, faq0 };
    try {
      const src = {
        programs: { 'fibonacci-math': { subtitle: 'TEST subtitle' }, 'no-such-program': { name: 'x' } },
        events: {}, projects: {}, news: {}, partners: {}, faqs: [], settings: {},
      };
      const res = await applyTranslations(db() as never, { en: src });
      expect(res.missing).toContain('program:no-such-program');
      const [after] = await db().select().from(schema.programs).where(eq(schema.programs.id, prog.id));
      expect(after.name).toBe(prog.name);
      expect(after.translations.en).toEqual({ subtitle: 'TEST subtitle' });
      expect(after.translations.kk).toEqual(prog.translations.kk);
    } finally {
      await db().update(schema.programs).set({ translations: before.prog.translations }).where(eq(schema.programs.id, prog.id));
    }
  });
});
