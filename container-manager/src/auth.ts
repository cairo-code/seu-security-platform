import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let managerSecret: string;

export function setManagerSecret(secret: string): void {
  managerSecret = secret;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(managerSecret);

    if (tokenBuffer.length !== secretBuffer.length) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const isValid = crypto.timingSafeEqual(tokenBuffer, secretBuffer);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}