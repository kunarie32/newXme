import { Request, Response, NextFunction } from 'express';
import { RecaptchaService } from '../services/recaptchaService.js';
import { BadRequestError } from './errorHandler.js';
import { AuthUtils } from '../utils/auth.js';

/**
 * Middleware to verify reCAPTCHA token
 */
export const verifyRecaptcha = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip reCAPTCHA verification if not enabled (development mode)
    if (!RecaptchaService.isEnabled()) {
      return next();
    }

    const recaptchaToken = req.body.recaptchaToken;
    
    if (!recaptchaToken) {
      throw new BadRequestError('reCAPTCHA verification required', 'RECAPTCHA_REQUIRED');
    }

    // Get client IP address
    const clientIP = AuthUtils.extractIPAddress(req);

    // Verify reCAPTCHA token
    const isValid = await RecaptchaService.verifyRecaptcha(recaptchaToken, clientIP);
    
    if (!isValid) {
      throw new BadRequestError('reCAPTCHA verification failed. Please try again.', 'RECAPTCHA_FAILED');
    }

    // Remove reCAPTCHA token from request body to avoid validation errors
    delete req.body.recaptchaToken;
    
    next();
  } catch (error) {
    next(error);
  }
};