import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("Nicht angemeldet", 401);
  }
  return session as { user: { id: string; email?: string | null } };
}

export async function require2FA() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new ApiError("Nicht angemeldet", 401);
  }

  // Check if user has 2FA enabled
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      totpEnabled: true,
    },
  });

  if (user?.totpEnabled) {
    // Verify 2FA was completed in this session
    const isVerified = session.user.totpVerified || false;
    if (!isVerified) {
      throw new ApiError("Zweifaktor-Authentifizierung erforderlich", 403);
    }
  }

  return session as { user: { id: string; email?: string | null; totpVerified?: boolean } };
}

export async function requireTenantAuth() {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new ApiError("Nicht angemeldet", 401);
  }

  // Check tenant MFA
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      mfaEnabled: true,
      mfaVerified: true,
    },
  });

  if (tenant?.mfaEnabled && !tenant.mfaVerified) {
    throw new ApiError("Zweifaktor-Authentifizierung erforderlich", 403);
  }

  return session as { user: { id: string; isTenant?: boolean; mfaVerified?: boolean } };
}

export function apiHandler(
  fn: () => Promise<NextResponse | Response>
): Promise<NextResponse | Response> {
  return fn().catch((error) => {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  });
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonCreated(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}
