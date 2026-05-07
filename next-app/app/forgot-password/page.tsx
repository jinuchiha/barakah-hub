import { Card, CardBody } from '@/components/ui/card';
import ForgotForm from './forgot-form';

export const metadata = { title: 'Reset Password · BalochSath' };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-[480px] max-w-full">
        <Card className="overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <div className="border-b border-[var(--border)] bg-[rgba(201,168,76,0.04)] p-6 text-center">
            <h1 className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">🔐 پاس ورڈ ری سیٹ</h1>
            <div className="mt-1 font-[var(--font-en)] text-[11px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Reset Password</div>
          </div>
          <CardBody>
            <div className="mb-4 rounded-md border border-[var(--border)] bg-[rgba(201,168,76,0.06)] p-3 text-center">
              <div className="font-[var(--font-arabic)] text-sm text-[var(--color-gold)]">يَسْأَلُونَكَ مَاذَا يُنفِقُونَ ۖ قُلِ الْعَفْوَ</div>
              <div className="mt-1 font-[var(--font-en)] text-[10px] italic text-[var(--txt-3)]">They ask what they should spend — say: what is beyond your needs · Al-Baqarah 2:219</div>
            </div>
            <ForgotForm />
            <p className="mt-4 text-center text-xs italic text-[var(--color-gold-4)]">
              <a href="/login" className="text-[var(--color-gold)] hover:underline">← Back to login</a>
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
