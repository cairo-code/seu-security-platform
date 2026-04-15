const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const MIN_SECRET_LENGTH = 32;

export function validateEnv(): void {
  if (!JWT_SECRET || JWT_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`
    );
  }

  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`
    );
  }
}

export function validateAuthEnv(): void {
  validateEnv();
}

validateEnv();