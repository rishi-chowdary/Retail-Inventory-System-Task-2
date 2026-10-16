import { Request, Response, NextFunction } from 'express';
import { authenticateUser, formatUserProfile } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const authData = await authenticateUser(email, password);
    sendSuccess(res, authData, 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = formatUserProfile(req.user!);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
};
