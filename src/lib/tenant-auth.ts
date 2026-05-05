import { SignJWT, jwtVerify } from "jose";
import { headers } from "next/headers";
import { ApiError } from "./api-utils";

interface TenantTokenPayload {
  tenantId: string;
  unitId: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createTenantJwt(payload: TenantTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function requireTenantAuth(): Promise<TenantTokenPayload> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("Nicht angemeldet", 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const tenantId = payload.tenantId as string;
    const unitId = payload.unitId as string;

    if (!tenantId || !unitId) {
      throw new ApiError("Ungültiges Token", 401);
    }

    return { tenantId, unitId };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Ungültiges oder abgelaufenes Token", 401);
  }
}
