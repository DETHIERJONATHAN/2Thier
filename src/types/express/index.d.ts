import { JwtPayload } from '../../middlewares/auth';

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
    }
  }
}
