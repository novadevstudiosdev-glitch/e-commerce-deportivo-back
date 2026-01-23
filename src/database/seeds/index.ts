import { DataSource } from 'typeorm';
import { UsersSeed } from './01-users.seed';
import { CategoriesSeed } from './02-categories.seed';
import { SportsSeed } from './03-sports.seed';
import { BrandsSeed } from './04-brands.seed';
import { ProductsSeed } from './05-products.seed';

export async function runAllSeeds(dataSource: DataSource): Promise<void> {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Users (admin + customer de ejemplo)
    console.log('👤 Seeding users...');
    const usersSeed = new UsersSeed();
    await usersSeed.run(dataSource);

    // 2. Categories
    console.log('\n📁 Seeding categories...');
    const categoriesSeed = new CategoriesSeed();
    await categoriesSeed.run(dataSource);

    // 3. Sports
    console.log('\n⚽ Seeding sports...');
    const sportsSeed = new SportsSeed();
    await sportsSeed.run(dataSource);

    // 4. Brands
    console.log('\n🏷️  Seeding brands...');
    const brandsSeed = new BrandsSeed();
    await brandsSeed.run(dataSource);

    // 5. Products (250 productos)
    console.log('\n📦 Seeding products (this may take a while)...');
    const productsSeed = new ProductsSeed();
    await productsSeed.run(dataSource);

    console.log('\n\n✅ All seeds completed successfully! 🎉');
    console.log('📊 Database is ready with:');
    console.log('   - Admin user (admin@sportshop.com / Admin123!)');
    console.log('   - 4 Categories');
    console.log('   - 9 Sports');
    console.log('   - 8 Brands');
    console.log('   - 250 Products with variants and images');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

// Script para ejecutar desde CLI
if (require.main === module) {
  import('../data-source.js').then(async ({ AppDataSource }) => {
    try {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');

      await runAllSeeds(AppDataSource);

      await AppDataSource.destroy();
      console.log('\n✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    }
  });
}
