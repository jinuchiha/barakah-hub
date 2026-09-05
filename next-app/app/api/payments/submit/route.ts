import { NextRequest, NextResponse } from 'next/server';
import { isAllowedReceiptUrl } from '@/lib/file-access';
import { z } from 'zod';
import { submitDonation } from '@/app/actions';
import { errorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Member self-submits a donation (mobile).
 *
 * Delegates to the `submitDonation` server action rather than re-implementing
 * the insert. This route used to carry its own copy of the schema, the insert
 * and the notification fan-out; the two drifted (the action gained the
 * idempotency guard, this route did not), which is exactly the failure the
 * "one mutation choke point" architecture exists to prevent.
 *
 * `idempotencyKey` is what makes a client retry safe: the mobile app generates
 * one per submission attempt and reuses it when the request times out, so a
 * request that committed server-side but lost its response converges on the
 * original payment instead of creating a second one.
 */
const schema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
  // https-only · z.string().url() alone also accepts javascript:/data: schemes
  // App-internal storage references only — see isAllowedReceiptUrl.
  receiptUrl: z.string().max(500)
    .refine(isAllowedReceiptUrl, 'Receipt must be uploaded through the app')
    .optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());
    const created = await submitDonation(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return errorResponse(err, 'POST /api/payments/submit');
  }
}
