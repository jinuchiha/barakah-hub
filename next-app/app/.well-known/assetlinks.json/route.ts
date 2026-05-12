import { NextResponse } from 'next/server';

/**
 * Digital Asset Links — required for the Android TWA to load this site
 * without the URL bar. The Android Worker fetches this file at
 * `https://<host>/.well-known/assetlinks.json` and confirms the SHA-256
 * of the signing key matches the APK that's trying to embed us.
 *
 * Bubblewrap prints the SHA-256 fingerprint at `bubblewrap build` time —
 * paste it into the env var `ANDROID_APP_SHA256` (Worker secret) and
 * redeploy. Multiple fingerprints (debug + release) can be added.
 *
 * One-time setup, then the TWA installs without showing the browser chrome.
 */
export const runtime = 'edge';

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? 'app.barakahhub.twa';
  const sha256 = process.env.ANDROID_APP_SHA256;

  if (!sha256) {
    return NextResponse.json([], { status: 200 });
  }

  const fingerprints = sha256.split(',').map((s) => s.trim()).filter(Boolean);

  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
