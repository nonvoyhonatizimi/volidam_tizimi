import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { generateToken } from '@/lib/jwt';

// Auto-create admin if no users exist
async function ensureAdminExists() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const adminPassword = await hashPassword('admin123');
      await prisma.user.create({
        data: {
          username: 'admin',
          password: adminPassword,
          fullName: 'Administrator',
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log('Default admin user created: admin / admin123');
    }
  } catch (e) {
    console.error('Failed to create admin:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdminExists();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
