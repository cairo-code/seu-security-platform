import { prisma } from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$transaction' | '$on' | '$use' | '$extends'
>;

export class InsufficientPointsError extends Error {
  statusCode: number;

  constructor(message: string = 'Insufficient points') {
    super(message);
    this.name = 'InsufficientPointsError';
    this.statusCode = 400;
  }
}

export async function awardPoints(
  userId: string,
  amount: number,
  tx: PrismaTransactionClient
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: amount,
      },
    },
  });
}

export async function deductPoints(
  userId: string,
  amount: number,
  tx: PrismaTransactionClient
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.points < amount) {
    throw new InsufficientPointsError('Not enough points');
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      points: {
        decrement: amount,
      },
    },
  });
}