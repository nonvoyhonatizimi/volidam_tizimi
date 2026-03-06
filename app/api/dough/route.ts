import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { getCurrentShiftType, getShiftDate } from '@/lib/utils';

// GET - Get dough entries for current shift
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only HAMIRCHI and ADMIN can view dough entries
    if (payload.role !== 'HAMIRCHI' && payload.role !== 'ADMIN') {
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

    const entries = await prisma.doughEntry.findMany({
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
    const totalFlourUsed = entries.reduce((sum: number, e: { flourAmount: number }) => sum + e.flourAmount, 0);
    
    // Group by bread type
    const byBreadType = entries.reduce((acc: Record<string, number>, e: { breadType: string; flourAmount: number }) => {
      acc[e.breadType] = (acc[e.breadType] || 0) + e.flourAmount;
      return acc;
    }, {});

    // Group by hamirchi
    const byHamirchi = entries.reduce((acc: Record<string, number>, e: { user: { fullName: string }; flourAmount: number }) => {
      acc[e.user.fullName] = (acc[e.user.fullName] || 0) + e.flourAmount;
      return acc;
    }, {});

    return NextResponse.json({
      entries,
      totals: {
        totalFlourUsed,
        byBreadType,
        byHamirchi,
      },
      shift,
    });
  } catch (error) {
    console.error('Get dough entries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new dough entry
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    
    // Only HAMIRCHI can create dough entries
    if (payload.role !== 'HAMIRCHI') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { breadType, flourAmount } = body;

    if (!breadType || !flourAmount || flourAmount <= 0) {
      return NextResponse.json(
        { error: 'Bread type and valid flour amount are required' },
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

    const entry = await prisma.doughEntry.create({
      data: {
        breadType,
        flourAmount: parseFloat(flourAmount.toString()),
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
      entry,
    });
  } catch (error) {
    console.error('Create dough entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
