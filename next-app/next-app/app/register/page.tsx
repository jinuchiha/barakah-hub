import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-server';
import { Card, CardBody } from '@/components/ui/card';
import RegisterForm from './register-form';

export const metadata = { title: 'Register · Barakah Hub' };

export default async function RegisterPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-[480px] max-w-full">
        <Card className="overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <div className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-6 text-center">
            <h1 className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">📝 رجسٹریشن</h1>
            <div className="mt-1 font-[var(--font-en)] text-[11px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Create your account</div>
          </div>
          <CardBody>
            <RegisterForm />
            <p className="mt-4 text-center text-xs italic text-[var(--color-gold-4)]">
              Already registered? <a href="/login" className="text-[var(--color-gold)] hover:underline">Sign in</a>
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
