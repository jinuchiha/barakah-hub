import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * 192×192 PNG icon for PWA / Android home screen / TWA.
 * Bubblewrap reads this from the manifest icons array.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#14171c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="128" height="128" viewBox="0 0 128 128">
          <defs>
            <mask id="cr">
              <rect width="128" height="128" fill="black" />
              <circle cx="64" cy="64" r="48" fill="white" />
              <circle cx="84.4" cy="56.5" r="42" fill="black" />
            </mask>
          </defs>
          <circle cx="64" cy="64" r="48" fill="#ebe7dd" mask="url(#cr)" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
