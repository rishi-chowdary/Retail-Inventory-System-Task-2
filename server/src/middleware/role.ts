import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { AppError } from '../utils/app-error';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to perform this action`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
