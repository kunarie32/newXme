import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    isVerified: boolean;
    admin: number;
  };
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'User not authenticated'
      });
      return;
    }

    if (req.user.admin !== 1) {
      logger.warn(`Non-admin user ${req.user.username} attempted to access admin endpoint`);
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'Admin authorization failed'
    });
  }
}

export async function checkAdminStatus(userId: number): Promise<boolean> {
  try {
    const db = getDatabase();
    const user = await db.get(
      'SELECT admin FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    
    return user?.admin === 1;
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
}