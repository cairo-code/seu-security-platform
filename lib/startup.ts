import { validateEnv } from './auth/validateEnv';
import { validateFlagEnv } from './flags/validateFlagEnv';

const MIN_SECRET_LENGTH = 32;

export function validateAllEnv(): void {
  validateEnv();
  validateFlagEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  if (!process.env.CONTAINER_MANAGER_URL) {
    throw new Error('CONTAINER_MANAGER_URL must be set');
  }

  if (!process.env.CONTAINER_MANAGER_URL.startsWith('http')) {
    throw new Error('CONTAINER_MANAGER_URL must start with http');
  }

  if (!process.env.MANAGER_SECRET) {
    throw new Error('MANAGER_SECRET must be set');
  }

  if (process.env.MANAGER_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(`MANAGER_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const hasCloudinaryUrl = !!process.env.CLOUDINARY_URL;
  const hasCloudinaryVars =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinaryUrl && !hasCloudinaryVars) {
    throw new Error(
      'Either CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) must be set'
    );
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set');
  }
}

validateAllEnv();