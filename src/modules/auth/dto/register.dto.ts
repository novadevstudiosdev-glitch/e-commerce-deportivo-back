import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'password123' })
  password: string;

  @ApiProperty({ example: 'Juan' })
  firstName: string;

  @ApiProperty({ example: 'Perez' })
  lastName: string;

  @ApiPropertyOptional({ example: '+5491112345678', nullable: true })
  phone?: string;
}

export class RegisterProfileResponseDto {
  @ApiProperty({ example: 'Juan' })
  first_name: string;

  @ApiProperty({ example: 'Perez' })
  last_name: string;

  @ApiPropertyOptional({ example: '+5491112345678', nullable: true })
  phone?: string | null;
}

export class RegisterResponseDto {
  @ApiProperty({ example: '3d2b0f3c-3b4a-4a40-8c66-2f8b7b4e6e75' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'customer' })
  role: string;

  @ApiProperty({ type: RegisterProfileResponseDto })
  profile: RegisterProfileResponseDto;
}
