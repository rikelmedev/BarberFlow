// server/storage.ts
// Supabase Storage para fotos de cortes e logo do salão

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage"
  );
}

// Use service role key for server-side storage operations (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Bucket names (create these in Supabase Dashboard > Storage)
export const BUCKETS = {
  LOGOS: "salon-logos",
  HAIRCUT_PHOTOS: "haircut-photos",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Upload a file to Supabase Storage
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  bucket: BucketName,
  profileId: string,
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName) || ".jpg";
  const fileName = `${profileId}/${uuidv4()}${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Upload salon logo
 */
export async function uploadSalonLogo(
  profileId: string,
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  return uploadFile(BUCKETS.LOGOS, profileId, file, originalName, mimeType);
}

/**
 * Upload haircut photo
 */
export async function uploadHaircutPhoto(
  profileId: string,
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  return uploadFile(
    BUCKETS.HAIRCUT_PHOTOS,
    profileId,
    file,
    originalName,
    mimeType
  );
}

/**
 * Delete a file from Supabase Storage by its public URL
 */
export async function deleteFile(
  bucket: BucketName,
  publicUrl: string
): Promise<void> {
  // Extract file path from URL
  const urlObj = new URL(publicUrl);
  const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
  if (pathParts.length < 2) return;

  const filePath = pathParts[1];

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    console.error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Ensure required buckets exist (call on server startup)
 */
export async function ensureStorageBuckets(): Promise<void> {
  for (const bucketName of Object.values(BUCKETS)) {
    const { data: existing } = await supabase.storage.getBucket(bucketName);

    if (!existing) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      if (error && error.message !== "Bucket already exists") {
        console.error(`Failed to create bucket ${bucketName}:`, error.message);
      } else {
        console.log(`✅ Storage bucket created: ${bucketName}`);
      }
    }
  }
}
