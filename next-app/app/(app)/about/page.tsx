import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { getMeOrRedirect } from '@/lib/auth-server';

export const metadata = { title: 'About This Fund · Barakah Hub' };

const REFS = [
  {
    arabic: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍ مِّا۟ئَةُ حَبَّةٍ…',
    english: 'The example of those who spend in the way of Allah is like a seed that grows seven ears; in every ear a hundred grains…',
    urdu: 'جو لوگ اللہ کی راہ میں اپنا مال خرچ کرتے ہیں ان کی مثال اس دانے کی سی ہے جس سے سات بالیاں اگیں، ہر بالی میں سو دانے…',
    ref: 'Al-Baqarah 2:261',
    topic: 'Sadaqah',
  },
  {
    arabic: 'وَمَا أَنفَقْتُم مِّن شَىْءٍ فَهُوَ يُخْلِفُهُۥ ۖ وَهُوَ خَيْرُ ٱلرَّٰزِقِينَ',
    english: 'Whatever you spend, He will replace it, and He is the best of providers.',
    urdu: 'اور جو کچھ تم خرچ کرتے ہو اللہ اس کا بدلہ دیتا ہے اور وہ بہترین رزق دینے والا ہے۔',
    ref: 'Saba 34:39',
    topic: 'Sadaqah',
  },
  {
    arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَأَطِيعُوا الرَّسُولَ لَعَلَّكُمْ تُرْحَمُونَ',
    english: 'Establish prayer and give zakah and obey the Messenger that you may receive mercy.',
    urdu: 'نماز قائم کرو، زکوٰة دو، اور رسول کی اطاعت کرو، تاکہ تم پر رحم کیا جائے۔',
    ref: 'An-Nur 24:56',
    topic: 'Zakat',
  },
  {
    arabic: 'مَن ذَا ٱلَّذِى يُقْرِضُ ٱللَّهَ قَرْضًا حَسَنًا فَيُضَٰعِفَهُۥ لَهُۥٓ أَضْعَافًا كَثِيرَةً…',
    english: 'Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?',
    urdu: 'کون ہے جو اللہ کو قرض حسنہ دے تاکہ اللہ اسے کئی گنا بڑھا کر لوٹائے؟',
    ref: 'Al-Baqarah 2:245',
    topic: 'Qarz-e-Hasana',
  },
  {
    arabic: 'وَإِن كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ ۚ وَأَن تَصَدَّقُوا۟ خَيْرٌ لَّكُمْ ۖ إِن كُنتُمْ تَعْلَمُونَ',
    english: 'If the debtor is in hardship, let there be postponement until ease. And if you remit it as charity, it is better for you — if you only knew.',
    urdu: 'اگر قرض لینے والا تنگدست ہو تو اسے آسانی تک مہلت دو، اور معاف کر دو تو تمہارے لیے بہتر ہے، اگر تم جانو۔',
    ref: 'Al-Baqarah 2:280',
    topic: 'Qarz-e-Hasana',
  },
];

const TOPIC_COLORS: Record<string, string> = {
  'Sadaqah': 'text-[#4ec38d] bg-[rgba(45,138,95,0.12)] border-[rgba(45,138,95,0.25)]',
  'Zakat': 'text-[#e8c563] bg-[rgba(200,155,60,0.12)] border-[rgba(200,155,60,0.28)]',
  'Qarz-e-Hasana': 'text-[#92b3df] bg-[rgba(96,141,215,0.12)] border-[rgba(96,141,215,0.25)]',
};

export default async function AboutPage() {
  await getMeOrRedirect();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 border-b border-[var(--border)] pb-5">
        <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[var(--color-cream)]">About This Fund</h1>
        <p dir="rtl" className="font-[var(--font-arabic)] text-[15px] leading-8 text-[var(--color-gold-2)] [text-align:start]">اس فنڈ کے بارے میں</p>
        <p className="mt-1 text-sm text-[var(--txt-3)]">Islamic basis of this family fund</p>
      </header>

      <Card className="mb-6">
        <CardBody>
          <p className="text-sm leading-relaxed text-[var(--txt-2)]">
            Barakah Hub aik private, invite-only family fund hai jis mein sadaqah (donation), zakat, aur qarz-e-hasana (interest-free loan) Islam ke usoolon ke mutabiq manage kiye jaate hain.
            Har contribution mein donor ka naam sirf admin dekh sakta hai · sadqa ki roohaniyat ke mutabiq (giving in secret).
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REFS.map((r) => (
          <Card key={r.ref}>
            <CardBody>
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${TOPIC_COLORS[r.topic] ?? ''}`}>
                  {r.topic}
                </span>
                <span className="text-[10px] text-[var(--txt-4)]">{r.ref}</span>
              </div>
              {/* Scripture is never visually truncated — the full quoted text renders. */}
              <p dir="rtl" lang="ar" className="mb-3 font-[var(--font-quran)] text-[15px] leading-8 text-[var(--color-gold-2)]">
                {r.arabic}
              </p>
              <p className="text-[12px] italic text-[var(--txt-3)]">&ldquo;{r.english}&rdquo;</p>
              <p className="mt-1.5 font-[var(--font-arabic)] text-[11px] text-[var(--txt-4)]" dir="rtl">{r.urdu}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>How This Fund Works</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-4 text-sm text-[var(--txt-2)] sm:grid-cols-2">
            {[
              ['Sadaqah', 'Monthly voluntary donations. Donor identity is hidden from other members per the principle of giving in secret.'],
              ['Zakat', 'Annual obligatory charity on qualifying wealth. Routed to eligible recipients through the admin.'],
              ['Qarz-e-Hasana', 'Interest-free loan to a family member in need. Community votes on approval; repaid without any extra charge.'],
              ['Emergency Vote', 'Cases are submitted and voted on by all approved members. Threshold can be set by admin (30 to 75%).'],
              ['Privacy', 'Sadaqah donors are never named to other members · only the admin can see who gave what.'],
              ['Audit Trail', 'Every action is logged with actor, timestamp, and detail. The log is append-only and cannot be altered.'],
            ].map(([title, desc]) => (
              <div key={String(title)} className="rounded-lg border border-[var(--border)] p-3">
                <div className="mb-1 font-semibold text-[var(--color-cream)]">{title}</div>
                <div className="text-[12px]">{desc}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
