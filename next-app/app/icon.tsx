import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', background: '#0a0a08',
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
          fontSize: 22, color: '#c9a84c', fontWeight: 700, fontFamily: 'serif',
        }}
      >
        ☪
      </div>
    ),
    { ...size },
  );
}
