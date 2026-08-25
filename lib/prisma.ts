import { PrismaClient } from '../app/generated/prisma';

declare global {
    var prisma: PrismaClient | undefined;
}

const prisma =
    globalThis.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export default prisma;
