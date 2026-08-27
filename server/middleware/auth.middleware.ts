import { Request, Response, NextFunction } from 'express';
import { UserAccount } from '../db';
import { verifySessionToken } from '../auth';

export interface AuthenticatedRequest extends Request {
  user?: UserAccount;
  token?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthenticated. Session token missing.' });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Session expired or invalid token. Please log in.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}
