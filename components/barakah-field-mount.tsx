'use client';
import dynamic from 'next/dynamic';

// three.js stays out of the main bundle — loaded only in the browser,
// after hydration, and skipped entirely under reduced motion (the field
// component itself checks the media query before creating a context).
const BarakahField = dynamic(() => import('./barakah-field'), { ssr: false });

export function BarakahFieldMount() {
  return <BarakahField />;
}
