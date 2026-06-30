import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { AddressesService } from './addresses.service';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.addressesService.list(request.user.sub);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateShippingAddressDto,
  ) {
    return this.addressesService.create(request.user.sub, payload);
  }

  @Patch(':addressId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() payload: UpdateShippingAddressDto,
  ) {
    return this.addressesService.update(request.user.sub, addressId, payload);
  }

  @Delete(':addressId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ) {
    return this.addressesService.remove(request.user.sub, addressId);
  }
}
