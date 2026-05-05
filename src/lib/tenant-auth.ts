import { SignJWT, jwtVerify } from "jose";
import { headers } from "next/next";
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

    // TODO: Verify tenant MFA status if enabled
    // This would require checking the tenant's mfaVerified status
    // and potentially requiring a fresh MFA verification

    return { tenantId, unitId };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Ungültiges oder abgelaufenes Token", 401);
  }
}

// Verify tenant 2FA PIN
export async function verifyTenant2FA(tenantId: string, pin: string): Promise<boolean> {
  try {
    // TODO: Implement actual 2FA verification with encrypted PIN
    // For now, this is a placeholder
    // In production, you would verify against an encrypted PIN stored in the database
    return pin === "123456"; // Replace with actual verification
  } catch (error) {
    return false;
  }
}
