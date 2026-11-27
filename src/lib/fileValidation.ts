import type React from 'react';
import { toast } from 'sonner';

export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const DEFAULT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
];

const BLOCKED_EXTENSIONS = new Set([
  '.svg',
  '.html',
  '.htm',
  '.xhtml',
  '.js',
  '.mjs',
  '.cjs',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.jsp',
  '.asp',
  '.aspx',
]);

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export function validateUploadFile(
  file: File | null | undefined,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'No file selected' };

  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const allowedMimeTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const allowedExtensions = options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;

  const lowerName = (file.name || '').toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : '';

  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Unsupported or unsafe file type (${ext})` };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File size must be less than ${maxMb}MB` };
  }

  const mime = (file.type || '').toLowerCase().trim();
  if (mime) {
    if (!allowedMimeTypes.includes(mime)) {
      return { valid: false, error: 'Only PDF, JPG, PNG, WEBP, and GIF files are allowed' };
    }
  } else if (!ext || !allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Only PDF, JPG, PNG, WEBP, and GIF files are allowed' };
  }

  if (ext && !allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Only PDF, JPG, PNG, WEBP, and GIF files are allowed' };
  }

  return { valid: true };
}

export function pickValidatedFile(
  e: React.ChangeEvent<HTMLInputElement>,
  options: FileValidationOptions = {}
): File | null {
  const file = e.target.files?.[0] || null;
  if (!file) return null;

  const check = validateUploadFile(file, options);
  if (!check.valid) {
    toast.error(check.error || 'Invalid file');
    e.target.value = '';
    return null;
  }
  return file;
}

export function pickValidatedFiles(
  e: React.ChangeEvent<HTMLInputElement>,
  options: FileValidationOptions = {}
): File[] {
  const list = e.target.files ? Array.from(e.target.files) : [];
  if (list.length === 0) return [];

  const accepted: File[] = [];
  let firstError: string | undefined;

  for (const file of list) {
    const check = validateUploadFile(file, options);
    if (check.valid) {
      accepted.push(file);
    } else if (!firstError) {
      firstError = check.error;
    }
  }

  if (firstError) {
    toast.error(firstError);
  }
  if (accepted.length === 0) {
    e.target.value = '';
  }

  return accepted;
}
