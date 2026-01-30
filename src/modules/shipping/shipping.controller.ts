import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { QuoteRequestDto } from './dtos/quote-request.dto';
import { QuoteOptionDto } from './dtos/quote-option.dto';
import { EnvioPackService } from './services/envio-pack.service';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly envioPackService: EnvioPackService) {}

  @Public()
  @Post('quote')
  @ApiOperation({
    summary: 'Quote EnvioPack shipping options',
    description:
      'Returns normalized EnvioPack quote options for the provided destination and package.',
  })
  @ApiOkResponse({ type: QuoteOptionDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiBadGatewayResponse({ description: 'EnvioPack upstream error' })
  @ApiServiceUnavailableResponse({ description: 'EnvioPack unavailable' })
  async quote(@Body() payload: QuoteRequestDto): Promise<QuoteOptionDto[]> {
    return this.envioPackService.quoteShipment(payload);
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Shipping health check',
    description: 'Checks EnvioPack authentication status.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        auth: { type: 'boolean' },
      },
    },
  })
  async health(): Promise<{ ok: boolean; auth: boolean }> {
    return this.envioPackService.checkHealth();
  }
}
