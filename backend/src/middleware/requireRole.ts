import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'You do not have permission to access this resource', 403);
      return;
    }
    next();
  };
};
