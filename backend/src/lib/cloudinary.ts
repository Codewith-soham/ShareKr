import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

// Minimal Cloudinary helper (no SDK needed): signs browser uploads and deletes assets.
// The browser uploads straight to Cloudinary; our server never touches image bytes.

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;

interface Credentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

const credentials = (): Credentials => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ApiError(503, 'Image uploads are not configured', 'IMAGE_UPLOAD_UNAVAILABLE');
  }
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  };
};

// Cloudinary signature: sha1 of "k1=v1&k2=v2" (keys sorted) + api secret.
export const signParams = (params: Record<string, string | number>, apiSecret: string): string => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
};

export const profileFolder = (userId: string): string => `sharekar/profiles/${userId}`;

export interface UploadSignature {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxBytes: number;
}

export const createProfileUploadSignature = (
  userId: string,
  now: Date = new Date(),
): UploadSignature => {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(now.getTime() / 1000);
  const folder = profileFolder(userId);
  const allowedFormats = PROFILE_IMAGE_FORMATS.join(',');
  // Every param the browser sends (besides file, api_key, signature) must be signed here.
  const signature = signParams(
    {
      allowed_formats: allowedFormats,
      folder,
      timestamp,
    },
    apiSecret,
  );
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    allowedFormats,
    maxBytes: PROFILE_IMAGE_MAX_BYTES,
  };
};

// Accepts only images that live in THIS user's folder in OUR Cloudinary account.
// Returns the public id (used later for deletion) or null when the URL is not acceptable.
export const parseOwnProfileImageUrl = (url: string, userId: string): string | null => {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
  if (parsed.search || parsed.hash) return null;

  const prefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  // Remaining: optional "v123/" version, then "sharekar/profiles/<userId>/<name>.<ext>"
  const rest = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, '');
  const folder = `${profileFolder(userId)}/`;
  if (!rest.startsWith(folder)) return null;
  const file = rest.slice(folder.length);
  if (!/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(file)) return null;
  return `${folder}${file.replace(/\.[^.]+$/, '')}`;
};

const destroyRequest = async (path: string, params: Record<string, string | number>) => {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { ...params, timestamp };
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(signed).map(([k, v]) => [k, String(v)])),
    api_key: apiKey,
    signature: signParams(signed, apiSecret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${path}`, {
    method: 'POST',
    body,
  });
  if (!response.ok) throw new Error(`Cloudinary responded ${response.status}`);
};

// Asks Cloudinary how big a stored image is. Cloudinary's upload API cannot enforce a
// per-upload size limit, so we enforce it here before saving the link.
// Returns null when the image does not exist; throws ApiError 503 if Cloudinary is unreachable.
export const getStoredImageSize = async (url: string): Promise<number | null> => {
  let response: Response;
  try {
    response = await fetch(url, { method: 'HEAD' });
  } catch {
    throw new ApiError(503, 'Could not check the image, try again', 'IMAGE_CHECK_UNAVAILABLE');
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ApiError(503, 'Could not check the image, try again', 'IMAGE_CHECK_UNAVAILABLE');
  }
  const length = Number(response.headers.get('content-length'));
  return Number.isFinite(length) && length > 0 ? length : null;
};

// Removes everything in a user's folder (used when a deleted account is anonymized).
// Uses the Admin API, which authenticates with HTTP Basic auth instead of a signature.
const deleteFolderImages = async (folder: string): Promise<void> => {
  const { cloudName, apiKey, apiSecret } = credentials();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`);
  url.searchParams.set('prefix', `${folder}/`);
  url.searchParams.set('invalidate', 'true'); // also drop copies cached on the CDN
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) throw new Error(`Cloudinary responded ${response.status}`);
};

export const deleteProfileFolder = async (userId: string): Promise<void> => {
  try {
    await deleteFolderImages(profileFolder(userId));
  } catch (error) {
    console.error(
      'Cloudinary folder delete failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }
};

// Best effort: a failed cleanup must never break the user's request. Orphans are harmless.
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await destroyRequest('image/destroy', { public_id: publicId, invalidate: 'true' });
  } catch (error) {
    console.error(
      'Cloudinary image delete failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }
};
