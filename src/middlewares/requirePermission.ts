import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from './auth';
import { db } from '../lib/database';

const prisma = db;

export function requirePermission(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as JwtPayload;
      // ...logique d'autorisation à compléter...
      next();
    } catch (error) {
      res.status(403).json({ error: 'Permission refusée' });
    }
  };
}
