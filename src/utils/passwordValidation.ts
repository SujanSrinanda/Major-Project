export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'admin1234',
  'sentinelfin',
  'sentinelfin123',
  'letmein123',
  'welcome123',
]);

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }

  const trimmed = password.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Password cannot be empty or whitespace only.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }

  // Check for repeated single character (e.g. "aaaaaaaa", "11111111")
  if (/^(.)\1+$/.test(password)) {
    return { valid: false, error: 'Password cannot consist of a single repeated character.' };
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common and easily guessed. Please choose a stronger password.' };
  }

  return { valid: true };
}
