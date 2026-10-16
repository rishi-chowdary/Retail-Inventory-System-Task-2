import { Request, Response, NextFunction } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct
} from '../services/product.service';
import { sendSuccess } from '../utils/response';

export const listProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await getProducts(req.query);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
};

export const getSingleProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await getProductById(req.params.id as string);
    sendSuccess(res, product, 200);
  } catch (error) {
    next(error);
  }
};

export const addProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await createProduct(req.body, req.user!._id.toString());
    sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
};

export const editProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await updateProduct(req.params.id as string, req.body);
    sendSuccess(res, product, 200);
  } catch (error) {
    next(error);
  }
};

export const disableProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await deactivateProduct(req.params.id as string);
    sendSuccess(res, product, 200);
  } catch (error) {
    next(error);
  }
};
