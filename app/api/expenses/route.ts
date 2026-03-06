import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getCurrentShiftType, getShiftDate } from '@/lib/utils';

// GET - Get expenses for current shift
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only DOKONCHI and ADMIN can view expenses
    if (payload.role !== 'DOKONCHI' && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shiftType = getCurrentShiftType();
    const shiftDate = getShiftDate();

    // Get or create current shift
    let shift = await prisma.shift.findFirst({
      where: {
        isActive: true,
        date: shiftDate,
        type: shiftType,
      },
    });

    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          type: shiftType,
          date: shiftDate,
          isActive: true,
        },
      });
    }

    const expenses = await prisma.expense.findMany({
      where: { shiftId: shift.id },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
    
    // Group by type
    const generalExpenses = expenses.filter((e: { type: string }) => e.type === 'GENERAL');
    const incomingGoodsExpenses = expenses.filter((e: { type: string }) => e.type === 'INCOMING_GOODS');
    
    const totalGeneral = generalExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
    const totalIncomingGoods = incomingGoodsExpenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

    return NextResponse.json({
      expenses,
      totals: {
        totalExpenses,
        totalGeneral,
        totalIncomingGoods,
      },
      shift,
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only DOKONCHI can create expenses
    if (payload.role !== 'DOKONCHI') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, amount, description } = body;

    if (!type || !amount || amount <= 0 || !description) {
      return NextResponse.json(
        { error: 'All fields are required and must be valid' },
        { status: 400 }
      );
    }

    if (!['GENERAL', 'INCOMING_GOODS'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid expense type' },
        { status: 400 }
      );
    }

    const shiftType = getCurrentShiftType();
    const shiftDate = getShiftDate();

    // Get or create current shift
    let shift = await prisma.shift.findFirst({
      where: {
        isActive: true,
        date: shiftDate,
        type: shiftType,
      },
    });

    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          type: shiftType,
          date: shiftDate,
          isActive: true,
        },
      });
    }

    const expense = await prisma.expense.create({
      data: {
        type,
        amount: parseFloat(amount.toString()),
        description,
        userId: payload.userId,
        shiftId: shift.id,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
