import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../types/user.js';

export function notFoundHandler(req: Request, res: Response): void {
  const message = `Route ${req.originalUrl} not found`;
  
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message,
    error: 'ROUTE_NOT_FOUND',
    data: {
      availableRoutes: [
        'GET /health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/refresh',
        'POST /api/auth/forgot-password',
        'POST /api/auth/reset-password',
        'POST /api/auth/verify-email',
        'POST /api/auth/resend-verification',
        'GET /api/user/profile',
        'PUT /api/user/profile'
      ]
    }
  } as ApiResponse);
}