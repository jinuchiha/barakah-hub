import Link from 'next/link';

export const metadata = { title: 'Terms of Use · Barakah Hub' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-[var(--txt-2)]">
      <Link href="/" className="mb-6 inline-block text-xs text-[var(--color-gold-4)] underline-offset-2 hover:underline">← Back to Barakah Hub</Link>
      <p className="mb-2 text-xs uppercase tracking-[2px] text-[var(--color-gold-4)]">Last updated July 2026</p>
      <h1 className="mb-8 text-3xl font-semibold text-[var(--color-cream)]">Terms of Use</h1>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">What you&apos;re agreeing to</h2>
          <p>Barakah Hub is a private tool built for one family&apos;s treasury — sadaqah, zakat, and qarz-e-hasana. Using it means agreeing to these plain terms, not a wall of legal text.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Money is real, so be accurate</h2>
          <p>What you submit as a payment, pledge, or loan request should reflect what actually happened. The two-person verification rule (a supervisor confirms cash arrived, a different admin verifies it) exists to protect the fund — deliberately falsifying a submission undermines a system your whole family relies on.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Votes and emergency cases</h2>
          <p>Emergency case requests should be genuine. Voting yes/no is a family decision made in good faith, not a formality — the threshold your admin sets exists so the community, not one person, decides who gets help.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Your account</h2>
          <p>New registrations wait for admin approval before they can do anything in the app — this is the actual gate, not a formality. Keep your password to yourself; if you suspect someone else has access, change it or tell your admin immediately.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">No warranty, best effort</h2>
          <p>This app is run for the family, by the family, without a company or paid support team behind it. It&apos;s built carefully and tested, but as with any software, occasional bugs or downtime are possible. The permanent audit trail means every money movement can always be reconstructed even if something else goes wrong.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">Changes</h2>
          <p>If these terms change in a way that matters, your admin will let you know. Continued use after that means you accept the update.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-gold-2)]">See also</h2>
          <p><a href="/privacy" className="text-[var(--color-gold)] underline">Privacy Policy</a> — what we store and why.</p>
        </section>
      </div>
    </main>
  );
}
