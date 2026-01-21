import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { UserProfile } from '../../modules/users/entities/user-profile.entity';

export class UsersSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const profileRepo = dataSource.getRepository(UserProfile);

    // Limpiar
    await profileRepo.delete({});
    await userRepo.delete({});

    // Admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const admin = await userRepo.save({
      email: 'admin@sportshop.com',
      password: adminPassword,
      role: 'admin',
      is_active: true,
      email_verified: true,
    });

    await profileRepo.save({
      user_id: admin.id,
      first_name: 'Admin',
      last_name: 'SportShop',
      dni: '12345678A',
      phone: '+34612345678',
    });

    // Customer de ejemplo
    const customerPassword = await bcrypt.hash('Customer123!', 10);
    const customer = await userRepo.save({
      email: 'cliente@example.com',
      password: customerPassword,
      role: 'customer',
      is_active: true,
      email_verified: true,
    });

    await profileRepo.save({
      user_id: customer.id,
      first_name: 'Carlos',
      last_name: 'Martínez',
      dni: '87654321B',
      phone: '+34698765432',
    });

    console.log('✅ Users seeded');
  }
}
