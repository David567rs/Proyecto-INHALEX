import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDraftDto } from './dto/create-order-draft.dto';
import { PreviewOrderDraftDto } from './dto/preview-order-draft.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('draft/preview')
  previewDraft(@Body() previewOrderDraftDto: PreviewOrderDraftDto) {
    return this.ordersService.previewDraft(previewOrderDraftDto);
  }

  @Post('draft')
  createDraft(
    @Body() createOrderDraftDto: CreateOrderDraftDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.createDraft(createOrderDraftDto, authorization);
  }

  @Post('confirm')
  confirmOrder(
    @Body() confirmOrderDto: ConfirmOrderDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordersService.confirmOrder(confirmOrderDto, authorization);
  }
}
