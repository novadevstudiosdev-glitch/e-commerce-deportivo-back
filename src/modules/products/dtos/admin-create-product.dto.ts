import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsBoolean()
  is_main?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort_order?: number;
}

export class CreateProductVariantDto {
  @IsOptional()
  @IsUUID()
  size_id?: string | null;

  @IsOptional()
  @IsUUID()
  color_id?: string | null;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  base_price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discount_percentage?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  low_stock_threshold?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateAdminProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsUUID()
  brand_id?: string | null;

  @IsOptional()
  @IsUUID()
  sport_id?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}
