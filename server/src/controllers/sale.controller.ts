import { Request, Response, NextFunction } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  processSaleReturn
} from '../services/sale.service';
import { sendSuccess } from '../utils/response';

export const handleCreateSale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sale = await createSale(req.body, req.user!);
    sendSuccess(res, sale, 201);
  } catch (error) {
    next(error);
  }
};

export const handleGetSales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const salesData = await getSales(req.query);
    sendSuccess(res, salesData, 200);
  } catch (error) {
    next(error);
  }
};

export const handleGetSaleById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const saleDetail = await getSaleById(req.params.id as string);
    sendSuccess(res, saleDetail, 200);
  } catch (error) {
    next(error);
  }
};

export const handleSaleReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await processSaleReturn(
      req.params.id as string,
      req.body.items,
      req.body.reason,
      req.user!
    );
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};
