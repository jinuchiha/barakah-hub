import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SADQA_DUAS } from '@/lib/duas';
import { VERSES as VERSE_TICKER } from '@/lib/i18n/verses';
import { VERSES as TOOLS_VERSES } from '@/lib/quran';

/**
 * The app quotes the Qur'an and hadith to a family of real users, on the
 * screen that asks them for money and on the one that thanks them for it.
 * Getting a citation wrong there is not a cosmetic bug.
 *
 * Four files carried the content rules as prose comments — "every entry is
 * sourced", "the translation must not say more than the quoted Arabic", "a
 * trailing … marks a quotation that stops before the end of the ayah" — and
 * nothing enforced any of them. The mobile content file had drifted away
 * from all three: a Qur'an quotation with verse 8's opening particle
 * attached to verse 7's words, two narrations paraphrased and then filed
 * under a Sahih Muslim number that says something else, and fragments of
 * ayat presented as whole verses.
 *
 * These tests are the rules made executable. They cannot check that a
 * narration is authentic — only a person with the collections can — but they
 * can refuse the specific shapes of mistake that have already happened here.
 */

const REPO = path.resolve(__dirname, '../../..');
const MOBILE_CONTENT = path.join(REPO, 'mobile/assets/daily-content.json');
const DUAS_WEB = path.join(REPO, 'next-app/lib/duas.ts');
const DUAS_MOBILE = path.join(REPO, 'mobile/lib/duas.ts');

interface Entry {
  arabic: string;
  english: string;
  urdu: string;
  reference: string;
  type: string;
}

const mobileEntries: Entry[] = JSON.parse(readFileSync(MOBILE_CONTENT, 'utf8')).verses;

/** Every quoted item in the product, normalised to one shape. */
const ALL: { where: string; arabic: string; ref: string; type?: string }[] = [
  ...mobileEntries.map((e, i) => ({
    where: `daily-content.json[${i}]`,
    arabic: e.arabic,
    ref: e.reference,
    type: e.type,
  })),
  ...SADQA_DUAS.map((d, i) => ({
    where: `duas.ts[${i}]`,
    arabic: d.arabic,
    ref: d.source,
    type: d.type,
  })),
  ...VERSE_TICKER.map((v, i) => ({
    where: `verses.ts[${i}]`,
    arabic: v.ar,
    ref: v.ref,
  })),
  ...TOOLS_VERSES.map((v, i) => ({
    where: `quran.ts[${i}]`,
    arabic: v.arabic,
    ref: v.reference,
    type: v.type,
  })),
];

/**
 * Bukhari and Muslim are sahih by the compilers' own criteria, so a bare
 * number is a complete claim. The Sunan and the Musnad are not — they
 * deliberately include narrations their own authors graded weak — so a bare
 * number from those carries no authenticity claim at all, which is exactly
 * how a weak narration gets into an app looking authoritative.
 */
const SELF_AUTHENTICATING = ['Sahih al-Bukhari', 'Sahih Muslim'];
const NEEDS_GRADING = [
  'Jami at-Tirmidhi',
  'Sunan Abi Dawud',
  'Sunan an-Nasai',
  'Sunan Ibn Majah',
  'Musnad Ahmad',
];
const COLLECTIONS = [...SELF_AUTHENTICATING, ...NEEDS_GRADING];

/**
 * Wordings that circulate widely and are graded weak. They are popular
 * precisely because they are quotable, which is what makes them likely to be
 * pasted into a file like this by a well-meaning editor.
 *
 * · الدعاء مخ العبادة — "supplication is the marrow of worship", Tirmidhi
 *   3371, weak chain. The authentic wording is الدعاء هو العبادة
 *   ("supplication IS worship"), Abu Dawud 1479, which the app already uses.
 */
const KNOWN_WEAK = [
  { arabic: 'مخ العبادة', instead: 'الدُّعَاءُ هُوَ الْعِبَادَةُ (Sunan Abi Dawud 1479)' },
];

describe('religious content — sourcing', () => {
  it('types every entry so a hadith is never labelled an ayah', () => {
    for (const e of mobileEntries) {
      expect(['verse', 'hadith'], e.reference).toContain(e.type);
    }
    for (const d of SADQA_DUAS) {
      expect(['quran', 'hadith', 'dua'], d.source).toContain(d.type);
    }
  });

  it('cites every quotation as surah:ayah or collection + number', () => {
    const quran = /^[A-Z][A-Za-z' -]+ (\d{1,3}):(\d{1,3})$/;
    for (const { where, ref } of ALL) {
      const collection = COLLECTIONS.find((c) => ref.startsWith(c));
      if (collection) {
        // "<Collection> <number>" with an optional " · <grading>" suffix.
        const rest = ref.slice(collection.length);
        expect(rest, `${where}: ${ref}`).toMatch(/^ \d+( · .+)?$/);
      } else {
        const m = quran.exec(ref);
        expect(m, `${where}: ${ref} is neither a known collection nor surah:ayah`).not.toBeNull();
        expect(Number(m![1]), `${where}: surah number`).toBeGreaterThanOrEqual(1);
        expect(Number(m![1]), `${where}: surah number`).toBeLessThanOrEqual(114);
        expect(Number(m![2]), `${where}: ayah number`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('requires an explicit grading for collections that contain weak material', () => {
    for (const { where, ref } of ALL) {
      const collection = NEEDS_GRADING.find((c) => ref.startsWith(c));
      if (!collection) continue;
      expect(ref, `${where}: a bare ${collection} number asserts nothing about authenticity`)
        .toMatch(/ · .*(sahih|hasan)/i);
    }
  });

  it('spells each surah the same way everywhere it is cited', () => {
    const byNumber = new Map<string, { name: string; where: string }>();
    for (const { where, ref } of ALL) {
      const m = /^(.+) (\d{1,3}):\d{1,3}$/.exec(ref);
      if (!m) continue;
      const [, name, num] = m;
      const seen = byNumber.get(num);
      if (seen) {
        expect(name, `surah ${num}: "${name}" at ${where} vs "${seen.name}" at ${seen.where}`)
          .toBe(seen.name);
      } else {
        byNumber.set(num, { name, where });
      }
    }
  });
});

describe('religious content — quotation integrity', () => {
  it('never carries a known weak wording', () => {
    for (const { where, arabic } of ALL) {
      for (const weak of KNOWN_WEAK) {
        expect(arabic.includes(weak.arabic), `${where}: weak wording — use ${weak.instead}`)
          .toBe(false);
      }
    }
  });

  it('keeps Arabic free of Latin letters and ASCII digits', () => {
    for (const { where, arabic } of ALL) {
      expect(arabic, `${where}`).not.toMatch(/[A-Za-z0-9]/);
    }
  });

  it('gives one Arabic wording exactly one reference', () => {
    // The 2580/2699 mixup was this shape: the wording of one hadith filed
    // under another's number, with both present in the product.
    const byArabic = new Map<string, { ref: string; where: string }>();
    for (const { where, arabic, ref } of ALL) {
      const key = arabic.replace(/[ً-ْٰۖ-ۭ…]/g, '').trim();
      const seen = byArabic.get(key);
      if (seen) {
        const a = seen.ref.split(' · ')[0];
        const b = ref.split(' · ')[0];
        expect(b, `same Arabic cited as "${seen.ref}" (${seen.where}) and "${ref}" (${where})`)
          .toBe(a);
      } else {
        byArabic.set(key, { ref, where });
      }
    }
  });

  it('marks a Qur’an quotation that stops short of a full ayah', () => {
    // Not every partial quotation can be detected mechanically, but the
    // three languages of one entry always quote the same cut — so if any one
    // of them is marked, all three must be. Silent disagreement here means
    // someone edited one language and forgot the others.
    for (const [i, e] of mobileEntries.entries()) {
      if (e.type !== 'verse') continue;
      const marks = [e.arabic, e.english, e.urdu].map((s) => ({
        lead: s.startsWith('…'),
        trail: s.endsWith('…'),
      }));
      const where = `daily-content.json[${i}] ${e.reference}`;
      expect(new Set(marks.map((m) => m.lead)).size, `${where}: leading …`).toBe(1);
      expect(new Set(marks.map((m) => m.trail)).size, `${where}: trailing …`).toBe(1);
    }
  });
});

describe('religious content — no silent drift between platforms', () => {
  it('keeps duas.ts identical in the web app and the mobile app', () => {
    // These two files are duplicated rather than shared. A correction made
    // to one and not the other is invisible until a member sees the wrong
    // one, which is how the mobile content file came to disagree with this
    // one about a Sahih Muslim narration.
    expect(readFileSync(DUAS_MOBILE, 'utf8')).toBe(readFileSync(DUAS_WEB, 'utf8'));
  });
});
