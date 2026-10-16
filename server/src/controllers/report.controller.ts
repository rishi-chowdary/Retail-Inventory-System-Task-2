import { Request, Response, NextFunction } from 'express';
import {
  getSalesReport,
  generateSalesCsv,
  getProfitReport
} from '../services/report.service';
import { sendSuccess } from '../utils/response';

export const handleSalesReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query;
    const report = await getSalesReport(from as string, to as string);
    sendSuccess(res, report, 200);
  } catch (error) {
    next(error);
  }
};

export const handleExportSalesCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query;
    const csvContent = await generateSalesCsv(from as string, to as string);
    const filename = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const handleProfitReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { from, to } = req.query;
    const profitReport = await getProfitReport(from as string, to as string);
    sendSuccess(res, profitReport, 200);
  } catch (error) {
    next(error);
  }
};
