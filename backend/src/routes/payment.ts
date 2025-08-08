import express from 'express';
import { Request, Response } from 'express';
import { tripayService } from '../services/tripayService.js';
import { authenticateToken } from '../middleware/auth.js';
import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = express.Router();

// Get payment channels
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const channels = await tripayService.getPaymentChannels();
    res.json({
      success: true,
      data: channels
    });
  } catch (error: any) {
    logger.error('Failed to get payment channels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment channels',
      error: error.message
    });
  }
});

// Create payment transaction
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      method,
      amount,
      customer_name,
      customer_email,
      customer_phone,
      order_items,
      return_url,
      user_id,
      quantity
    } = req.body;

    // Generate merchant reference with user ID and product info
    const merchant_ref = `INV/${user_id}/${order_items.map((item: any) => `${item.sku}-${item.quantity}`).join('/')}`;

    // Set expiry time (24 hours from now)
    const expired_time = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    const transactionRequest = {
      method,
      merchant_ref,
      amount,
      customer_name,
      customer_email,
      customer_phone,
      order_items,
      return_url,
      expired_time
    };

    const transaction = await tripayService.createTransaction(transactionRequest);

    // Save order to database
    const db = getDatabase();
    await db.run(`
      INSERT INTO orders (uid, merchant_ref, status, amount, quantity, total_amount, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id,
      merchant_ref,
      'processing',
      amount / quantity, // amount per unit
      quantity,
      amount, // total amount
      method
    ]);

    res.json({
      success: true,
      data: transaction.data
    });
  } catch (error: any) {
    logger.error('Failed to create payment transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment transaction',
      error: error.message
    });
  }
});

// Payment callback endpoint
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const privateKey = process.env['TRIPAY_PRIVATE_KEY'] || '';
    const jsonData = JSON.stringify(req.body);
    const callbackSignature = req.headers['x-callback-signature'] as string;
    
    // Create signature for validation
    const signature = crypto.createHmac('sha256', privateKey).update(jsonData).digest('hex');
    
    if (callbackSignature !== signature) {
      logger.warn('Invalid callback signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const data = req.body;
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data sent by payment gateway'
      });
    }

    const callbackEvent = req.headers['x-callback-event'] as string;
    if (callbackEvent !== 'payment_status') {
      return res.status(400).json({
        success: false,
        message: `Unrecognized callback event: ${callbackEvent}`
      });
    }

    const mref = data.merchant_ref;
    const tripayReference = data.reference;
    const status = (data.status || '').toUpperCase();
    const isClosedPayment = data.is_closed_payment || 0;

    // Parsing invoice data from merchant reference
    function parseMerchantRef(mref: string) {
      const parts = mref.split('/');
      const userId = parts[1];

      const items = [];
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        if (part && part.includes('-')) {
          const [code, qtyStr] = part.split('-');
          if (code && qtyStr) {
            items.push({
              code: code,
              quantity: parseInt(qtyStr)
            });
          }
        }
      }

      return { userId, items };
    }

    if (isClosedPayment === 1) {
      // Get parsed invoice data
      const { userId } = parseMerchantRef(mref);
      
      // Get Order data by merchant reference
      const db = getDatabase();
      const invoice = await db.get(
        'SELECT * FROM orders WHERE uid = ? AND merchant_ref = ? AND status = ?',
        [userId, mref, 'processing']
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: `Invoice not found or already processed: ${tripayReference}`
        });
      }

      try {
        if (status === 'PAID') {
          // Update order status to paid
          await db.run(
            'UPDATE orders SET status = ?, no_ref = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['paid', tripayReference, invoice.id]
          );

          // Update user quota - add the quantity purchased
          await db.run(
            'UPDATE users SET quota = quota + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [invoice.quantity, userId]
          );

          logger.info(`Payment completed for user ${userId}, added ${invoice.quantity} quota`);
          
        } else if (status === 'EXPIRED') {
          await db.run(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['expired', invoice.id]
          );
          
        } else if (status === 'FAILED') {
          await db.run(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['failed', invoice.id]
          );
          
        } else {
          return res.status(400).json({
            success: false,
            message: 'Unrecognized payment status'
          });
        }

        return res.json({ success: true });
        
      } catch (error: any) {
        logger.error('Error processing payment callback:', error);
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Payment not closed'
    });
    
  } catch (error: any) {
    logger.error('Failed to process payment callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process callback',
      error: error.message
    });
  }
});

export { router as paymentRoutes };