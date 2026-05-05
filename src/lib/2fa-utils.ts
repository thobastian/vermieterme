import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decryptTOTPSecret } from "@/lib/totp";
import { auth } from "@/lib/auth";

export async function isUser2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return !!user?.totpEnabled;
}

export async function isTenantMFAEnabled(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mfaEnabled: true },
  });
  return !!tenant?.mfaEnabled;
}

export async function verifyUser2FA(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  });

  if (!user?.totpEnabled || !user.totpSecret) {
    return false;
  }

  try {
    const secret = decryptTOTPSecret(user.totpSecret);
    const now = Date.now();
    // Check current and previous time window (60 seconds total)
    return (
      verifyCodeAtTime(secret, code, now) ||
      verifyCodeAtTime(secret, code, now - 30000) ||
      verifyCodeAtTime(secret, code, now + 30000)
    );
  } catch {
    return false;
  }
}

export async function verifyTenant2FA(tenantId: string, code: string): Promise<boolean> {
  // For now, use simple PIN verification
  // In production, this should check against encrypted PIN
  return code.length === 6 && /^\d+$/.test(code);
}

function verifyCodeAtTime(secret: string, code: string, timestamp: number): boolean {
  const time = Math.floor(timestamp / 30000);
  const key = Buffer.from(secret, 'base32');
  
  // Create HMAC-SHA1
  const hmac = require('crypto').createHmac('sha1', key);
  hmac.update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'));
  const digest = hmac.digest();
  
  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const codeValue = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;
  
  const codeNumber = parseInt(code, 10);
  return codeValue === codeNumber;
}

export async function requireUser2FAVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      totpEnabled: true,
      totpVerified: true,
    },
  });

  if (user?.totpEnabled && !user.totpVerified) {
    throw new Error("2FA verification required");
  }

  // Update verification timestamp
  await prisma.user.update({
    where: { id: userId },
    data: { totpVerified: true },
  });
}

export async function requireTenant2FAVerification(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      mfaEnabled: true,
      mfaVerified: true,
    },
  });

  if (tenant?.mfaEnabled && !tenant.mfaVerified) {
    throw new Error("2FA verification required");
  }
}
