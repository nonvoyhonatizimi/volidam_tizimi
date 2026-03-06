import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getCurrentShiftType, getShiftDate } from '@/lib/utils';

// GET - Get current active shift or create new one
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    verifyToken(token);

    const shiftType = getCurrentShiftType();
    const shiftDate = getShiftDate();

    // Find active shift for today
    let shift = await prisma.shift.findFirst({
      where: {
        isActive: true,
        date: shiftDate,
        type: shiftType,
      },
      include: {
        _count: {
          select: {
            doughEntries: true,
            sales: true,
            expenses: true,
          },
        },
      },
    });

    // If no active shift, create one
    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          type: shiftType,
          date: shiftDate,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              doughEntries: true,
              sales: true,
              expenses: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Get shift error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Close current shift and create new one
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const body = await request.json();
    const { action } = body;

    if (action === 'close') {
      // Get current active shift
      const currentShift = await prisma.shift.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!currentShift) {
        return NextResponse.json(
          { error: 'No active shift found' },
          { status: 404 }
        );
      }

      // Close the shift
      await prisma.shift.update({
        where: { id: currentShift.id },
        data: {
          isActive: false,
          closedAt: new Date(),
          closedBy: payload.userId,
        },
      });

      // Generate report for the closed shift
      const doughEntries = await prisma.doughEntry.findMany({
        where: { shiftId: currentShift.id },
      });

      const sales = await prisma.sale.findMany({
        where: { shiftId: currentShift.id },
      });

      const expenses = await prisma.expense.findMany({
        where: { shiftId: currentShift.id },
      });

      // Calculate totals
      const totalFlourUsed = doughEntries.reduce((sum: number, e: { flourAmount: number }) => sum + e.flourAmount, 0);

      const qurtSales = sales.filter((s: { itemType: string }) => s.itemType === 'QURT');
      const nonSales = sales.filter((s: { itemType: string }) => s.itemType === 'NON');

      const totalQurtSold = qurtSales.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0);
      const totalNonSold = nonSales.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0);

      const qurtClickTotal = qurtSales
        .filter((s: { paymentType: string }) => s.paymentType === 'CLICK')
        .reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);
      const qurtPlasticTotal = qurtSales
        .filter((s: { paymentType: string }) => s.paymentType === 'PLASTIC')
        .reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);

      const nonClickTotal = nonSales
        .filter((s: { paymentType: string }) => s.paymentType === 'CLICK')
        .reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);
      const nonPlasticTotal = nonSales
        .filter((s: { paymentType: string }) => s.paymentType === 'PLASTIC')
        .reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);

      const totalSales = sales.reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);
      const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
      const netProfit = totalSales - totalExpenses;

      // Create daily report
      await prisma.dailyReport.create({
        data: {
          shiftId: currentShift.id,
          totalFlourUsed,
          totalQurtSold,
          totalNonSold: Math.round(totalNonSold),
          qurtClickTotal,
          qurtPlasticTotal,
          nonClickTotal,
          nonPlasticTotal,
          totalExpenses,
          netProfit,
        },
      });

      // Create new shift
      const newShiftType = getCurrentShiftType();
      const newShiftDate = getShiftDate();

      const newShift = await prisma.shift.create({
        data: {
          type: newShiftType,
          date: newShiftDate,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        closedShift: currentShift,
        newShift,
        report: {
          totalFlourUsed,
          totalQurtSold,
          totalNonSold: Math.round(totalNonSold),
          qurtClickTotal,
          qurtPlasticTotal,
          nonClickTotal,
          nonPlasticTotal,
          totalExpenses,
          netProfit,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Close shift error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
