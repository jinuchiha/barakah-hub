import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * 512×512 maskable PNG icon for Android adaptive icons.
 * The safe zone for content is the inner 80% of the canvas — outside
 * may be cropped to a circle, squircle, rounded square etc. by the OS.
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
        <svg width="280" height="280" viewBox="0 0 128 128">
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
    { width: 512, height: 512 },
  );
}
