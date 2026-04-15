const FLAG_SECRET = process.env.FLAG_SECRET;
const MIN_SECRET_LENGTH = 32;

export function validateFlagEnv(): void {
  if (!FLAG_SECRET || FLAG_SECRET.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `FLAG_SECRET must be at least ${MIN_SECRET_LENGTH} characters`
    );
  }
}

validateFlagEnv();