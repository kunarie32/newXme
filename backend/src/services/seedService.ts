import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

export async function seedProducts() {
  try {
    const db = getDatabase();
    
    // Check if product with id=1 already exists
    const existingProduct = await db.get('SELECT * FROM products WHERE id = 1');
    
    if (!existingProduct) {
      // Create the default quota install product
      await db.run(`
        INSERT INTO products (id, name, description, price, image_url)
        VALUES (1, ?, ?, ?, ?)
      `, [
        'Quota Install',
        'Quota Install for Windows Installation service - allows one Windows installation per quota',
        5000.00,
        'https://localhost/quota-install.jpg'
      ]);
      
      logger.info('Default product seeded successfully');
    } else {
      logger.info('Default product already exists');
    }
  } catch (error) {
    logger.error('Error seeding products:', error);
    throw error;
  }
}