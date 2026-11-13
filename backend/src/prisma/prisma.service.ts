import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error('Thiếu biến môi trường bắt buộc: DATABASE_URL.');
    }
    super({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }

  onModuleDestroy(): Promise<void> {
    return this.$disconnect();
  }
}
