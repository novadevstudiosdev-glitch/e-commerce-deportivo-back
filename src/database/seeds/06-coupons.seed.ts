import { DataSource } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

export class CouponsSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const couponRepo = dataSource.getRepository(Coupon);
    await couponRepo.clear();

    console.log('Seeding coupons...');

    const coupons = [
      couponRepo.create({
        code: 'WELCOME10',
        type: 'percent',
        value: '10.00',
        active: true,
        startsAt: null,
        endsAt: null,
        minOrderTotal: '0',
      }),
      couponRepo.create({
        code: 'SAVE500',
        type: 'fixed',
        value: '500.00',
        active: true,
        startsAt: null,
        endsAt: null,
        minOrderTotal: '2000.00',
      }),
    ];

    await couponRepo.save(coupons);
    console.log('Coupons seeded');
  }
}
