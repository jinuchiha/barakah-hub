import { Target } from 'lucide-react';
import { fmtRs } from '@/lib/i18n/dict';
import type { Config } from '@/lib/db/schema';

interface GoalBarProps {
  config: Pick<Config, 'goalAmount' | 'goalLabelUr' | 'goalLabelEn' | 'goalDeadline'>;
  totalFund: number;
  locale?: 'ur' | 'en';
  daysRemaining?: number | null;
}

export function GoalBar({ config, totalFund, locale = 'en', daysRemaining = null }: GoalBarProps) {
  if (!config.goalAmount || config.goalAmount === 0) return null;
  const pct = Math.min(100, Math.round((totalFund / config.goalAmount) * 100));
  const remaining = Math.max(0, config.goalAmount - totalFund);
  const labelUr = config.goalLabelUr || 'خاندانی ہدف';
  const labelEn = config.goalLabelEn || 'Family Goal';

  let daysLeft = '';
  if (daysRemaining !== null) {
    daysLeft = daysRemaining > 0
      ? `${daysRemaining} ${locale === 'ur' ? 'دن باقی' : 'days left'}`
      : (locale === 'ur' ? 'ہدف کی تاریخ گزر گئی' : 'Deadline passed');
  }

  const milestone = (() => {
    if (pct >= 100) return { en: 'Goal achieved',  ur: 'الحمدللہ! ہدف مکمل',   tone: 'pill-success' as const };
    if (pct >= 75)  return { en: 'Almost there',   ur: 'بس تھوڑا اور',          tone: 'pill-warn'    as const };
    if (pct >= 50)  return { en: 'Past halfway',   ur: 'آدھے سے زیادہ',         tone: 'pill-info'    as const };
    if (pct >= 25)  return { en: 'Off to a start', ur: 'آغاز ہو چکا',           tone: 'pill-info'    as const };
    return            { en: 'Together we can', ur: 'ہم سب مل کر',          tone: 'pill-muted'   as const };
  })();

  return (
    <section
      className="mb-6 overflow-hidden rounded-[var(--radius-r-lg)] border border-[var(--border)] bg-[var(--surf-1)]"
      aria-label={locale === 'ur' ? 'خاندانی ہدف' : 'Family Goal'}
    >
      <div className="px-6 py-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-[rgba(200,155,60,0.10)] text-[var(--color-gold)]">
              <Target className="size-4" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--txt-3)]">
                {locale === 'ur' ? 'ہدف' : 'Goal'}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-[var(--color-cream)]">
                {locale === 'ur' ? labelUr : labelEn}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="num-display text-2xl text-[var(--color-cream)]">
              {fmtRs(totalFund)}
              <span className="ml-1.5 text-sm font-normal text-[var(--txt-3)]">/ {fmtRs(config.goalAmount)}</span>
            </div>
            <div className="tabular mt-0.5 text-[11px] text-[var(--txt-3)]">
              {pct}%{daysLeft ? ` · ${daysLeft}` : ''}
            </div>
          </div>
        </div>

        <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2d8a5f] via-[#c89b3c] to-[#e8c563] transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className={`pill ${milestone.tone}`}>
            {locale === 'ur' ? milestone.ur : milestone.en}
          </span>
          {remaining > 0 && (
            <span className="tabular text-[11px] text-[var(--txt-3)]">
              <span className="num">{fmtRs(remaining)}</span> {locale === 'ur' ? 'باقی' : 'to go'}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
