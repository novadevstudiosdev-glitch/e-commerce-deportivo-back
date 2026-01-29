import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '../shipping.types';

export class QuoteOptionDto {
  @ApiProperty({ example: 'OCA' })
  provider: string;

  @ApiProperty({ example: 'Estandar' })
  serviceName: string;

  @ApiProperty({ enum: [DeliveryType.HOME, DeliveryType.PICKUP] })
  deliveryType: DeliveryType.HOME | DeliveryType.PICKUP;

  @ApiProperty({ example: 2499.5 })
  price: number;

  @ApiProperty({ example: 'ARS' })
  currency: 'ARS';

  @ApiProperty({ example: '6 dias habiles' })
  etaText: string;

  @ApiPropertyOptional({ example: 6 })
  etaDays?: number;

  @ApiPropertyOptional({ example: '2026-01-30' })
  estimatedDate?: string;

  @ApiPropertyOptional({
    description: 'Raw EnvioPack response item when SHIPPING_DEBUG=true',
  })
  raw?: unknown;
}
