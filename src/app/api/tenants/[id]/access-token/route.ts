import { apiHandler, requireAuth, ApiError, jsonOk, jsonCreated } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { generateAccessCode } from "@/lib/token";
import { NextRequest } from "next/server";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const token = await prisma.tenantAccessToken.findFirst({
      where: { tenantId: id },
    });

    return jsonOk({ hasToken: !!token, token: token?.token ?? null });
  });
}

export function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireAuth();
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new ApiError("Mieter nicht gefunden", 404);
    }

    const code = generateAccessCode();

    const token = await prisma.tenantAccessToken.upsert({
      where: { tenantId: id },
      update: { token: code },
      create: { tenantId: id, token: code },
    });

    return jsonCreated({ token: token.token });
  });
}

export function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireAuth();
    const { id } = await params;

    await prisma.tenantAccessToken.deleteMany({
      where: { tenantId: id },
    });

    return jsonOk({ success: true });
  });
}
