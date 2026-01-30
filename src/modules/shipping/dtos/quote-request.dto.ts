import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryType } from '../shipping.types';

export class DimensionsDto {
  @ApiProperty({ example: 30, description: 'Length in centimeters' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  length: number;

  @ApiProperty({ example: 20, description: 'Width in centimeters' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  width: number;

  @ApiProperty({ example: 10, description: 'Height in centimeters' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  height: number;
}

export class QuoteRequestDto {
  @ApiProperty({
    example: '1888',
    description: 'Destination postal code (Argentina)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/)
  destinationPostalCode: string;

  @ApiProperty({ example: 1.5, description: 'Weight in kilograms' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  weightKg: number;

  @ApiProperty({ type: DimensionsDto })
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensionsCm: DimensionsDto;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Declared value for insurance (optional)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  declaredValue?: number;

  @ApiPropertyOptional({
    enum: DeliveryType,
    default: DeliveryType.ANY,
    description: 'Delivery type filter',
  })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;
}
