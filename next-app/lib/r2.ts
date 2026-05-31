import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 object storage via the S3-compatible API. Works from any
 * Node runtime (Vercel functions, local dev, Workers/node-compat).
 *
 * Required env (see .env.example):
 *   R2_ACCOUNT_ID         Cloudflare account id
 *   R2_ACCESS_KEY_ID      R2 API token access key
 *   R2_SECRET_ACCESS_KEY  R2 API token secret
 *   R2_BUCKET             bucket name
 *   R2_PUBLIC_URL         public base URL for the bucket (https://…),
 *                         e.g. the r2.dev domain or a custom CDN domain
 */
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID as string, secretAccessKey: SECRET_ACCESS_KEY as string },
    });
  }
  return client;
}

/** Upload bytes to R2 and return the public HTTPS URL. */
export async function uploadToR2(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (!isR2Configured()) throw new Error('R2 storage not configured');
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return `${(PUBLIC_URL as string).replace(/\/$/, '')}/${key}`;
}
