import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SalesService } from '../modules/sales/sales.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const salesService = app.get(SalesService);
    const result =
      await salesService.rebuildSalesAggregatesFromCompletedOrders();

    console.log(
      `Ventas agregadas reconstruidas. pedidos=${result.processedOrders} documentos=${result.aggregates} anteriores_eliminados=${result.deleted}`,
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('No se pudieron reconstruir las ventas agregadas.', error);
  process.exit(1);
});
