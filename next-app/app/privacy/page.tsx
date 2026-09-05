import Link from 'next/link';

export const metadata = { title: 'Privacy Policy · Barakah Hub' };

/**
 * Plain-language privacy notice for a family-scale treasury app. Written
 * for the actual people using it (family members, not lawyers) — the
 * legal boilerplate stays minimal because the real audience is a
 * grandmother deciding whether to trust the app with her phone number.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[var(--txt-2)]">
      <Link href="/" className="mb-6 inline-block text-xs text-[var(--color-gold-4)] underline-offset-2 hover:underline">← Back to Barakah Hub</Link>
      <p className="mb-2 text-xs uppercase tracking-[2px] text-[var(--color-gold-4)]">Last updated July 2026</p>
      <h1 className="mb-8 text-3xl font-semibold text-[var(--color-cream)]">Privacy Policy</h1>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">What Barakah Hub is</h2>
          <p>Barakah Hub is a private treasury app for one family. It is not a public product, does not sell data, does not show ads, and does not share anything with any company outside the app. Only people your admin approves can see any of it.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">What we store</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-[var(--color-cream)]">Identity:</strong> your name (English + Urdu), father&apos;s name, relation, city — used to build the family tree and address you correctly.</li>
            <li><strong className="text-[var(--color-cream)]">Contact:</strong> email/username for sign-in, and phone number only if you provide one (used for WhatsApp receipts and reminders, and shown only to admins/supervisors as a contact point).</li>
            <li><strong className="text-[var(--color-cream)]">Money records:</strong> what you pledged, what you paid, loans issued to you, and votes you cast — this is the whole point of the app, and it&apos;s visible to admins for fund governance.</li>
            <li><strong className="text-[var(--color-cream)]">Photo:</strong> only if you upload one for your profile.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Sadaqah stays anonymous</h2>
          <p>Sadaqah and Zakat contributions are shown to other members with no donor name attached — &quot;a member gave amount&quot; — matching the Islamic principle of giving in secret. Only admins can see who gave what, because someone has to verify the money arrived. Qarz (loans) and emergency cases are not anonymous, since the community votes on those.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Who can see what</h2>
          <p>Members see their own records and the family&apos;s combined totals. Admins and supervisors see everything, because that&apos;s the role the family assigned them for fund governance — every action they take is written to a permanent audit trail that even they cannot edit or delete.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Where it lives</h2>
          <p>Data is stored on Neon (a managed Postgres database provider) and the app runs on Vercel. Notification delivery may pass through Resend (email) and Meta&apos;s WhatsApp Business platform (WhatsApp) — only for the messages the app actually sends you, never for advertising.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Your choices</h2>
          <p>You can update your profile at any time, and can ask your admin to correct or remove your record. Because this app keeps a financial ledger for a shared fund, transaction history that other members relied on to vote or verify money can&apos;t be silently deleted — but your admin can help with any specific concern.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Questions</h2>
          <p>Ask your family admin directly — they run this app for your family and can answer anything this page doesn&apos;t.</p>
        </section>
      </div>
    </main>
  );
}
