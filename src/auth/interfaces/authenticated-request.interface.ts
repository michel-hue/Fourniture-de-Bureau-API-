import { Request } from 'express';

import type { JwtPayload } from '../strategies/jwt.strategy';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
