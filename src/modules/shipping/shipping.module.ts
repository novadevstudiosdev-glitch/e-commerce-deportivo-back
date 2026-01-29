import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingController } from './shipping.controller';
import { EnvioPackService } from './services/envio-pack.service';

@Module({
  imports: [ConfigModule],
  controllers: [ShippingController],
  providers: [EnvioPackService],
  exports: [EnvioPackService],
})
export class ShippingModule {}
