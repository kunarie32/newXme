import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth.js';
import { UserService } from '../services/userService.js';
import { RateLimiter } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../types/user.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        isVerified: boolean;
        admin?: number;
      };
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      } as ApiResponse);
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await AuthUtils.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        error: 'TOKEN_REVOKED'
      } as ApiResponse);
      return;
    }

    // Verify token
    const decoded = AuthUtils.verifyToken(token);
    
    // Get user from database to ensure they still exist and are active
    const user = await UserService.getUserById(decoded.userId);
    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_INACTIVE'
      } as ApiResponse);
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.is_verified,
      admin: user.admin
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    let message = 'Invalid token';
    let errorCode = 'INVALID_TOKEN';
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        message = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (error.message.includes('invalid')) {
        message = 'Invalid token format';
        errorCode = 'INVALID_TOKEN_FORMAT';
      }
    }

    res.status(401).json({
      success: false,
      message,
      error: errorCode
    } as ApiResponse);
  }
}

export function requireVerifiedUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    } as ApiResponse);
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required',
      error: 'EMAIL_NOT_VERIFIED'
    } as ApiResponse);
    return;
  }

  next();
}

export function requireUnverifiedUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED'
    } as ApiResponse);
    return;
  }

  if (req.user.isVerified) {
    res.status(400).json({
      success: false,
      message: 'User is already verified',
      error: 'ALREADY_VERIFIED'
    } as ApiResponse);
    return;
  }

  next();
}

// Rate limiting middleware factory
export function createRateLimitMiddleware(
  action: string, 
  maxRequests: number = 5, 
  windowMinutes: number = 15
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = AuthUtils.extractIPAddress(req);
      const key = AuthUtils.generateRateLimitKey(ip, action);
      const windowSeconds = windowMinutes * 60;

      const result = await RateLimiter.checkRateLimit(key, maxRequests, windowSeconds);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          message: `Too many ${action} attempts. Please try again later.`,
          error: 'RATE_LIMIT_EXCEEDED',
          data: {
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          }
        } as ApiResponse);
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis is down
      next();
    }
  };
}

// Specific rate limiting middleware
export const loginRateLimit = createRateLimitMiddleware('login', 5, 15);
export const registerRateLimit = createRateLimitMiddleware('register', 3, 60);
export const forgotPasswordRateLimit = createRateLimitMiddleware('forgot-password', 3, 15);
export const verifyEmailRateLimit = createRateLimitMiddleware('verify-email', 5, 15);
export const resendVerificationRateLimit = createRateLimitMiddleware('resend-verification', 3, 5);

// Input validation middleware
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error: any) {
      logger.warn('Validation error:', error);
      
      let errors: Array<{ field: string; message: string }> = [];
      
      // Handle Zod validation errors
      if (error.errors && Array.isArray(error.errors)) {
        errors = error.errors.map((err: any) => {
          const field = err.path && err.path.length > 0 ? err.path.join('.') : 'unknown';
          let message = err.message || 'Invalid value';
          
          // Provide more specific error messages based on error code
          switch (err.code) {
            case 'too_small':
              if (err.type === 'string') {
                message = `${field} must be at least ${err.minimum} characters long`;
              }
              break;
            case 'too_big':
              if (err.type === 'string') {
                message = `${field} must be no more than ${err.maximum} characters long`;
              }
              break;
            case 'invalid_string':
              if (err.validation === 'email') {
                message = 'Please enter a valid email address';
              } else if (err.validation === 'regex') {
                if (field === 'username') {
                  message = 'Username can only contain letters, numbers, hyphens, and underscores';
                } else if (field === 'password') {
                  message = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
                }
              }
              break;
            case 'custom':
              // Handle custom validation errors (like badword filter)
              if (field === 'username' && message.includes('inappropriate')) {
                message = 'Username contains inappropriate content. Please choose a different username.';
              } else if (field === 'confirmPassword' && message.includes("don't match")) {
                message = 'Password confirmation does not match the password';
              }
              break;
            default:
              // Keep the original message if we don't have a specific handler
              break;
          }
          
          return {
            field,
            message
          };
        });
      } else {
        // Fallback for non-Zod errors
        errors = [{ 
          field: 'general', 
          message: error.message || 'Validation failed. Please check your input and try again.' 
        }];
      }

      // Create a more descriptive main message
      let mainMessage = 'Validation failed';
      if (errors.length === 1 && errors[0]) {
        mainMessage = `Validation failed: ${errors[0].message}`;
      } else if (errors.length > 1) {
        mainMessage = `Validation failed for ${errors.length} field(s)`;
      }

      res.status(400).json({
        success: false,
        message: mainMessage,
        error: 'VALIDATION_ERROR',
        data: { errors }
      } as ApiResponse);
    }
  };
}

// Security headers middleware
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  });
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const ip = AuthUtils.extractIPAddress(req);
  const userAgent = AuthUtils.extractUserAgent(req);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.id || 'anonymous';
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent,
      userId
    });
  });

  next();
}

// Error handling for async routes
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}