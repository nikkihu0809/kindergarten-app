// Standard S3-compatible storage helpers (works with AWS S3, MinIO, Cloudflare R2, etc.)
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const config: any = {
      region: ENV.s3Region,
      credentials: {
        accessKeyId: ENV.s3AccessKey,
        secretAccessKey: ENV.s3SecretKey,
      },
    };
    if (ENV.s3Endpoint) {
      config.endpoint = ENV.s3Endpoint;
      config.forcePathStyle = true;
    }
    _s3Client = new S3Client(config);
  }
  return _s3Client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!ENV.s3Bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const key = normalizeKey(relKey);
  const client = getS3Client();
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  // If a public URL prefix is configured, use it directly
  if (ENV.s3PublicUrl) {
    const publicUrl = ENV.s3PublicUrl.endsWith("/")
      ? `${ENV.s3PublicUrl}${key}`
      : `${ENV.s3PublicUrl}/${key}`;
    return { key, url: publicUrl };
  }

  // Otherwise generate a presigned URL
  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  }), { expiresIn: 7 * 24 * 60 * 60 }); // 7 days

  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!ENV.s3Bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  const key = normalizeKey(relKey);

  if (ENV.s3PublicUrl) {
    const publicUrl = ENV.s3PublicUrl.endsWith("/")
      ? `${ENV.s3PublicUrl}${key}`
      : `${ENV.s3PublicUrl}/${key}`;
    return { key, url: publicUrl };
  }

  const client = getS3Client();
  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  }), { expiresIn: 7 * 24 * 60 * 60 });

  return { key, url };
}
