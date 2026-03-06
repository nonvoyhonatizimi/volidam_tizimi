import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getCurrentShiftType, getShiftDate } from '@/lib/utils';

// GET - Get sales for current shift
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only SOTUVCHI and ADMIN can view sales
    if (payload.role !== 'SOTUVCHI' && payload.role !== 'ADMIN') {
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

    const sales = await prisma.sale.findMany({
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

    return NextResponse.json({
      sales,
      totals: {
        totalQurtSold,
        totalNonSold,
        qurtClickTotal,
        qurtPlasticTotal,
        nonClickTotal,
        nonPlasticTotal,
        totalSales,
      },
      shift,
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new sale
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only SOTUVCHI can create sales
    if (payload.role !== 'SOTUVCHI') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemType, productType, quantity, totalPrice, paymentType } = body;

    if (!itemType || !productType || !quantity || quantity <= 0 || !totalPrice || totalPrice <= 0 || !paymentType) {
      return NextResponse.json(
        { error: 'All fields are required and must be valid' },
        { status: 400 }
      );
    }

    if (!['QURT', 'NON'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid item type' },
        { status: 400 }
      );
    }

    if (!['CLICK', 'PLASTIC'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Invalid payment type' },
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

    const sale = await prisma.sale.create({
      data: {
        itemType,
        productType,
        quantity: parseFloat(quantity.toString()),
        totalPrice: parseFloat(totalPrice.toString()),
        paymentType,
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
      sale,
    });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
