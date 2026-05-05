import { apiHandler, ApiError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createTenantJwt } from "@/lib/tenant-auth";
import { NextRequest } from "next/server";

export function POST(req: NextRequest) {
  return apiHandler(async () => {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      throw new ApiError("Einladungscode fehlt", 400);
    }

    const accessToken = await prisma.tenantAccessToken.findUnique({
      where: { token: code.toUpperCase().trim() },
      include: {
        tenant: {
          include: {
            unit: {
              include: { property: true },
            },
          },
        },
      },
    });

    if (!accessToken) {
      throw new ApiError("Ungültiger Einladungscode", 401);
    }

    const jwt = await createTenantJwt({
      tenantId: accessToken.tenantId,
      unitId: accessToken.tenant.unitId,
    });

    return jsonOk({
      token: jwt,
      tenant: {
        id: accessToken.tenant.id,
        firstName: accessToken.tenant.firstName,
        lastName: accessToken.tenant.lastName,
      },
      unit: {
        id: accessToken.tenant.unit.id,
        name: accessToken.tenant.unit.name,
      },
      property: {
        street: accessToken.tenant.unit.property.street,
        zip: accessToken.tenant.unit.property.zip,
        city: accessToken.tenant.unit.property.city,
      },
    });
  });
}
