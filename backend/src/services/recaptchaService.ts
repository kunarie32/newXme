import axios from 'axios';
import { logger } from '../utils/logger.js';

export class RecaptchaService {
  private static readonly RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
  private static readonly RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  /**
   * Verify reCAPTCHA token with Google's API
   * @param token - reCAPTCHA token from frontend
   * @param remoteip - Client IP address (optional)
   * @returns Promise<boolean> - true if verification successful
   */
  static async verifyRecaptcha(token: string, remoteip?: string): Promise<boolean> {
    if (!this.RECAPTCHA_SECRET_KEY) {
      logger.warn('reCAPTCHA secret key not configured, skipping verification');
      return true; // Allow requests when reCAPTCHA is not configured (development)
    }

    if (!token) {
      logger.warn('reCAPTCHA token not provided');
      return false;
    }

    try {
      const response = await axios.post(this.RECAPTCHA_VERIFY_URL, null, {
        params: {
          secret: this.RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: remoteip
        },
        timeout: 10000
      });

      const { success, score, action, 'error-codes': errorCodes } = response.data;

      if (!success) {
        logger.warn('reCAPTCHA verification failed:', {
          errorCodes,
          token: token.substring(0, 20) + '...' // Log partial token for debugging
        });
        return false;
      }

      // For reCAPTCHA v3, check score (0.0 to 1.0, higher is better)
      if (typeof score === 'number') {
        const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
        if (score < minScore) {
          logger.warn('reCAPTCHA score too low:', {
            score,
            minScore,
            action
          });
          return false;
        }
      }

      logger.info('reCAPTCHA verification successful:', {
        score,
        action
      });

      return true;
    } catch (error) {
      logger.error('reCAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Check if reCAPTCHA is enabled
   * @returns boolean
   */
  static isEnabled(): boolean {
    return !!this.RECAPTCHA_SECRET_KEY;
  }
}

export const recaptchaService = new RecaptchaService();