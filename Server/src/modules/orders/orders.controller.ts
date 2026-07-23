import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDraftDto } from './dto/create-order-draft.dto';
import { PreviewOrderDraftDto } from './dto/preview-order-draft.dto';
import { ReportOrderReceiptDto } from './dto/report-order-receipt.dto';
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
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.confirmOrder(
      confirmOrderDto,
      authorization,
      idempotencyKey,
    );
  }

  @Get('me/receipt-confirmations')
  @UseGuards(JwtAuthGuard)
  listReceiptConfirmations(@Req() request: AuthenticatedRequest) {
    return this.ordersService.listReceiptConfirmationOrders(request.user);
  }

  @Patch(':id/receipt/confirm')
  @UseGuards(JwtAuthGuard)
  confirmReceipt(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.confirmCustomerReceipt(id, request.user);
  }

  @Patch(':id/receipt/report')
  @UseGuards(JwtAuthGuard)
  reportReceiptIssue(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() reportOrderReceiptDto: ReportOrderReceiptDto,
  ) {
    return this.ordersService.reportCustomerReceiptIssue(
      id,
      request.user,
      reportOrderReceiptDto,
    );
  }
}
