import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * Dynamic favicon — Barakah Hub mark (Concept A geometric crescent).
 * Rendered via Next's ImageResponse to a PNG at `/icon`.
 */
export default function Icon() {
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
          borderRadius: 12,
        }}
      >
        <svg width="42" height="42" viewBox="0 0 128 128">
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
    { ...size },
  );
}
