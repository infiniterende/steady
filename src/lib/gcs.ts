import "server-only";
import { Storage } from "@google-cloud/storage";
import { PHOTO_MAX_BYTES } from "@/lib/photos";

// Journal photos live in a private Google Cloud Storage bucket. The browser never gets a bucket key:
// it uploads and views through short-lived signed URLs this server hands out after checking who is asking.
const bucketName = () => process.env.GCS_BUCKET ?? "";

let storage: Storage | null = null;
function bucket() {
  if (!storage) storage = new Storage({ credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON ?? "{}") });
  return storage.bucket(bucketName());
}

/** Header the browser must send with the upload; the bucket refuses anything larger than the photo limit. */
export const UPLOAD_SIZE_HEADER = { "x-goog-content-length-range": `0,${PHOTO_MAX_BYTES}` };

export async function signUpload(path: string, contentType: string): Promise<string> {
  const [url] = await bucket().file(path).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType,
    extensionHeaders: UPLOAD_SIZE_HEADER,
  });
  return url;
}

export async function signReads(paths: string[], seconds = 60 * 60): Promise<Map<string, string>> {
  const entries = await Promise.all(
    paths.map(async (p) => {
      const [url] = await bucket().file(p).getSignedUrl({ version: "v4", action: "read", expires: Date.now() + seconds * 1000 });
      return [p, url] as [string, string];
    }),
  );
  return new Map(entries);
}

/** Size in bytes of each path that exists, so uploads can be confirmed before they're recorded. */
export async function statObjects(paths: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(
    paths.map(async (p) => {
      const [exists] = await bucket().file(p).exists();
      if (exists) {
        const [meta] = await bucket().file(p).getMetadata();
        out.set(p, Number(meta.size ?? 0));
      }
    }),
  );
  return out;
}

export async function removeObjects(paths: string[]): Promise<void> {
  await Promise.all(paths.map((p) => bucket().file(p).delete({ ignoreNotFound: true })));
}
