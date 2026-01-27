import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { UsersSeed } from './01-users.seed';
import { ProductsSeed } from './05-products.seed';
import { CouponsSeed } from './06-coupons.seed';

export async function runAllSeeds(dataSource: DataSource): Promise<void> {
  console.log('Starting database seeding...\n');

  try {
    console.log('Seeding users...');
    const usersSeed = new UsersSeed();
    await usersSeed.run(dataSource);

    console.log('\nSeeding products (this may take a while)...');
    const productsSeed = new ProductsSeed();
    await productsSeed.run(dataSource);

    console.log('\nSeeding coupons...');
    const couponsSeed = new CouponsSeed();
    await couponsSeed.run(dataSource);

    console.log('\n\nAll seeds completed successfully!');
    console.log('Database is ready with:');
    console.log('  - Admin user (admin@sportshop.com / Admin123!)');
    console.log('  - Vendedor user (vendedor@example.com / Vendedor123!)');
    console.log('  - 250 Products');
    console.log('  - 2 Coupons (WELCOME10, SAVE500)');
  } catch (error) {
    console.error('\nError during seeding:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await AppDataSource.initialize();
      console.log('Database connection established');

      await runAllSeeds(AppDataSource);

      await AppDataSource.destroy();
      console.log('\nDatabase connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
