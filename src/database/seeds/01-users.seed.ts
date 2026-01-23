import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';

export class UsersSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const profileRepo = dataSource.getRepository(UserProfile);

    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const customerPassword = await bcrypt.hash('Customer123!', 10);

    const seeds = [
      {
        email: 'admin@sportshop.com',
        password: adminPassword,
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'SportShop',
          dni: '12345678A',
          phone: '+34612345678',
        },
      },
      {
        email: 'cliente@example.com',
        password: customerPassword,
        role: 'customer',
        profile: {
          firstName: 'Carlos',
          lastName: 'Martinez',
          dni: '87654321B',
          phone: '+34698765432',
        },
      },
    ];

    for (const seed of seeds) {
      await userRepo.upsert(
        {
          email: seed.email,
          password: seed.password,
          role: seed.role,
          isActive: true,
          emailVerified: true,
        },
        ['email'],
      );

      const user = await userRepo.findOne({ where: { email: seed.email } });
      if (!user) {
        throw new Error(`Failed to upsert user ${seed.email}`);
      }

      await profileRepo.upsert(
        {
          userId: user.id,
          firstName: seed.profile.firstName,
          lastName: seed.profile.lastName,
          dni: seed.profile.dni,
          phone: seed.profile.phone,
        },
        ['userId'],
      );
    }

    console.log('Users seeded');
  }
}
