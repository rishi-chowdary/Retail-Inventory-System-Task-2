import { Request, Response, NextFunction } from 'express';
import {
  getLowStockProducts,
  adjustStock,
  getMovements
} from '../services/inventory.service';
import { sendSuccess } from '../utils/response';

export const getLowStock = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await getLowStockProducts();
    sendSuccess(res, products, 200);
  } catch (error) {
    next(error);
  }
};

export const createAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, type, quantity, reason, reference } = req.body;
    const result = await adjustStock(
      productId,
      type,
      quantity,
      reason,
      reference,
      req.user!
    );
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const listMovements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await getMovements(req.query);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
};
