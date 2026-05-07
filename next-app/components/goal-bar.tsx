import { fmtRs } from '@/lib/i18n/dict';
import type { Config } from '@/lib/db/schema';

interface GoalBarProps {
  config: Pick<Config, 'goalAmount' | 'goalLabelUr' | 'goalLabelEn' | 'goalDeadline'>;
  totalFund: number;
  locale?: 'ur' | 'en';
}

export function GoalBar({ config, totalFund, locale = 'en' }: GoalBarProps) {
  if (!config.goalAmount || config.goalAmount === 0) return null;
  const pct = Math.min(100, Math.round((totalFund / config.goalAmount) * 100));
  const remaining = Math.max(0, config.goalAmount - totalFund);
  const labelUr = config.goalLabelUr || 'خاندانی ہدف';
  const labelEn = config.goalLabelEn || 'Family Goal';
  let daysLeft = '';
  if (config.goalDeadline) {
    const d = Math.ceil((new Date(config.goalDeadline).getTime() - Date.now()) / 86_400_000);
    daysLeft = d > 0 ? ` · ${d} ${locale === 'ur' ? 'دن باقی' : 'days left'}` : (locale === 'ur' ? ' · ہدف کی تاریخ گزر گئی' : ' · deadline passed');
  }
  let cheer = '';
  if (pct >= 100) cheer = locale === 'ur' ? '🎉 الحمدللہ! ہدف مکمل' : '🎉 Alhamdulillah! Goal achieved';
  else if (pct >= 75) cheer = locale === 'ur' ? '🔥 شاندار! بس تھوڑا اور' : '🔥 So close — keep going';
  else if (pct >= 50) cheer = locale === 'ur' ? '💪 آدھے سے زیادہ ہو گیا' : '💪 Past halfway';
  else if (pct >= 25) cheer = locale === 'ur' ? '🌱 آغاز ہو چکا' : '🌱 Off to a strong start';
  else cheer = locale === 'ur' ? '🤲 ہم سب مل کر کر سکتے ہیں' : '🤲 Together we can';

  return (
    <div className="mb-4 rounded-[var(--radius-r)] border border-[var(--border-2)]" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(27,107,69,0.06))' }}>
      <div className="px-6 py-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="font-[var(--font-display)] text-[11px] uppercase tracking-[2px] text-[var(--color-gold-4)]">🎯 {locale === 'ur' ? 'ہدف' : 'Goal'}</div>
            <div className="mt-0.5 font-[var(--font-arabic)] text-lg font-semibold text-[var(--color-cream)]">
              {locale === 'ur' ? labelUr : labelEn}
            </div>
          </div>
          <div className="text-right">
            <div className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
              {fmtRs(totalFund)} <span className="text-sm text-[var(--color-gold-4)]">/ {fmtRs(config.goalAmount)}</span>
            </div>
            <div className="font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">{pct}%{daysLeft}</div>
          </div>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-md bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
          <div
            className="relative h-full rounded-md bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)] shadow-[0_0_12px_rgba(201,168,76,0.4)] transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          >
            {pct > 0 && pct < 100 && (
              <div className="absolute right-0 top-0 h-full w-[3px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            )}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[var(--color-emerald-2)]">{cheer}</span>
          {remaining > 0 && (
            <span className="font-[var(--font-en)] italic text-[var(--color-gold-4)]">{fmtRs(remaining)} {locale === 'ur' ? 'باقی' : 'to go'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
