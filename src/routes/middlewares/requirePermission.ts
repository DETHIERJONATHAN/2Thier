import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from './auth';
import pkg from '@prisma/client';

const PrismaClient = (pkg as any).PrismaClient;
const prisma = new PrismaClient();

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
