import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory buckets for IP and identifier rate limiting
const ipBuckets = new Map<string, RateLimitRecord>();
const identifierBuckets = new Map<string, RateLimitRecord>();

/**
 * Resets all rate-limiting memory stores (useful for automated testing)
 */
export function resetRateLimits() {
  ipBuckets.clear();
  identifierBuckets.clear();
}

/**
 * Extracts client IP address safely
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Generic Rate Limiter Factory
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxPerIp: number;
  maxPerIdentifier?: number;
  message?: string;
  keyPrefix?: string;
}) {
  const {
    windowMs,
    maxPerIp,
    maxPerIdentifier,
    message = 'Too many requests. Please try again later.',
    keyPrefix = 'rl',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const ipKey = `${keyPrefix}:ip:${ip}`;

    // 1. IP Check
    const ipRecord = ipBuckets.get(ipKey);
    if (!ipRecord || now > ipRecord.resetTime) {
      ipBuckets.set(ipKey, { count: 1, resetTime: now + windowMs });
    } else {
      if (ipRecord.count >= maxPerIp) {
        const retryAfterSeconds = Math.ceil((ipRecord.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          error: message,
          retryAfter: retryAfterSeconds,
        });
      }
      ipRecord.count++;
    }

    // 2. Identifier Check (if applicable, e.g. email, phone, target)
    if (maxPerIdentifier && req.body) {
      const identifier =
        req.body.identifier || req.body.email || req.body.phone || req.body.target;
      if (typeof identifier === 'string' && identifier.trim()) {
        const idKey = `${keyPrefix}:id:${identifier.trim().toLowerCase()}`;
        const idRecord = identifierBuckets.get(idKey);

        if (!idRecord || now > idRecord.resetTime) {
          identifierBuckets.set(idKey, { count: 1, resetTime: now + windowMs });
        } else {
          if (idRecord.count >= maxPerIdentifier) {
            const retryAfterSeconds = Math.ceil((idRecord.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfterSeconds);
            return res.status(429).json({
              error: 'Too many requests for this account. Please wait before trying again.',
              retryAfter: retryAfterSeconds,
            });
          }
          idRecord.count++;
        }
      }
    }

    next();
  };
}

// 1. General Authentication Rate Limiter (Login, Signup, Forgot/Reset Password, Verify OTP)
// 60 requests per 15 minutes per IP, 15 attempts per 15 minutes per identifier
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxPerIp: 60,
  maxPerIdentifier: 15,
  message: 'Too many authentication attempts from this IP. Please try again in a few minutes.',
  keyPrefix: 'auth',
});

// 2. OTP Dispatch Rate Limiter (Send OTP)
// 20 OTP requests per 15 minutes per IP, 6 OTP requests per 10 minutes per target
export const otpSendRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxPerIp: 20,
  maxPerIdentifier: 6,
  message: 'Too many verification code requests. Please wait a few minutes before requesting another code.',
  keyPrefix: 'otp_send',
});
