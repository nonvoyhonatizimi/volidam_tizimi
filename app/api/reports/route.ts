import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getCurrentShiftType, getShiftDate } from '@/lib/utils';

// GET - Get daily report for current or specified shift
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only ADMIN can view reports
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');

    let shift;
    
    if (shiftId) {
      // Get specific shift
      shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          report: true,
          doughEntries: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          sales: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          expenses: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
      });
    } else {
      // Get current shift
      const shiftType = getCurrentShiftType();
      const shiftDate = getShiftDate();

      shift = await prisma.shift.findFirst({
        where: {
          isActive: true,
          date: shiftDate,
          type: shiftType,
        },
        include: {
          report: true,
          doughEntries: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          sales: {
            include: {
              user: { select: { fullName: true } },
            },
          },
          expenses: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
      });
    }

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Calculate real-time totals
    const totalFlourUsed = shift.doughEntries.reduce((sum: number, e: { flourAmount: number }) => sum + e.flourAmount, 0);

    const qurtSales = shift.sales.filter((s: { itemType: string }) => s.itemType === 'QURT');
    const nonSales = shift.sales.filter((s: { itemType: string }) => s.itemType === 'NON');

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

    const totalSales = shift.sales.reduce((sum: number, s: { totalPrice: number }) => sum + s.totalPrice, 0);
    const totalExpenses = shift.expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    // Employee performance
    const employeePerformance = await prisma.user.findMany({
      where: {
        OR: [
          { doughEntries: { some: { shiftId: shift.id } } },
          { sales: { some: { shiftId: shift.id } } },
          { expenses: { some: { shiftId: shift.id } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        _count: {
          select: {
            doughEntries: { where: { shiftId: shift.id } },
            sales: { where: { shiftId: shift.id } },
            expenses: { where: { shiftId: shift.id } },
          },
        },
      },
    });

    return NextResponse.json({
      shift,
      report: {
        totalFlourUsed,
        totalQurtSold,
        totalNonSold: Math.round(totalNonSold),
        qurtClickTotal,
        qurtPlasticTotal,
        nonClickTotal,
        nonPlasticTotal,
        totalSales,
        totalExpenses,
        netProfit,
      },
      employeePerformance,
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
