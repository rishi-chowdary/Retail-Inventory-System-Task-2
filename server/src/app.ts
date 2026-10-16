import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerDocument } from './config/swagger';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/app-error';

export const createApp = (): Application => {
  const app = express();

  // Security and parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/+$/, '');
        const clientUrlClean = (env.CLIENT_URL || '').replace(/\/+$/, '');

        const isAllowed =
          env.CLIENT_URL === '*' ||
          cleanOrigin === clientUrlClean ||
          cleanOrigin.endsWith('.vercel.app') ||
          cleanOrigin.includes('localhost') ||
          cleanOrigin.includes('127.0.0.1');

        if (isAllowed) {
          return callback(null, true);
        }

        // Default allow during demo/assessment
        return callback(null, true);
      },
      credentials: true
    })
  );
  app.use(express.json());

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API modular routes
  app.use('/api', apiRoutes);

  // Catch-all route for unhandled endpoints
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('API endpoint not found', 404, 'NOT_FOUND'));
  });

  // Unified central error handling middleware
  app.use(errorHandler);

  return app;
};
