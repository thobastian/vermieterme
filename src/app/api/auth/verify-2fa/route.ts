import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTP, decryptTOTPSecret } from "@/lib/totp";
import { createTenantJwt } from "@/lib/tenant-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, callbackUrl, isTenant } = body;

    if (!code) {
      return NextResponse.json(
        { message: "Code ist erforderlich" },
        { status: 400 }
      );
    }

    // Check if user already has 2FA session
    const sessionData = await getServerSession();
    const user = await prisma.user.findUnique({
      where: { id: sessionData?.user?.id },
      select: {
        id: true,
        email: true,
        totpEnabled: true,
        totpSecret: true,
        totpVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Benutzer nicht gefunden" },
        { status: 404 }
      );
    }

    // For tenants
    if (isTenant) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: sessionData?.user?.id },
        select: {
          id: true,
          email: true,
          mfaEnabled: true,
        },
      });

      if (!tenant?.mfaEnabled) {
        // MFA not enabled for this tenant, allow access
        const payload = {
          tenantId: tenant.id,
          unitId: sessionData?.token?.unitId,
        };
        const token = await createTenantJwt(payload);
        return NextResponse.json({
          message: "Success",
          token,
          redirect: true,
        });
      }

      // Verify tenant 2FA (simple PIN-based for now)
      if (code !== "123456") { // Replace with actual 2FA verification
        return NextResponse.json(
          { message: "Ungültiger Code" },
          { status: 401 }
        );
      }

      // Update MFA verification
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { mfaVerified: true },
      });

      return NextResponse.json({
        message: "2FA successfully verified",
        redirect: true,
      });
    }

    // For users
    if (!user.totpEnabled) {
      // 2FA not enabled, just create session
      return NextResponse.json({
        message: "Success",
        redirect: true,
      });
    }

    // Verify TOTP code
    try {
      const decryptedSecret = user.totpSecret 
        ? decryptTOTPSecret(user.totpSecret) 
        : null;

      if (!decryptedSecret || !verifyTOTP(decryptedSecret, code)) {
        return NextResponse.json(
          { message: "Ungültiger 2FA Code" },
          { status: 401 }
        );
      }

      // Update 2FA verification timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { totpVerified: true },
      });

      return NextResponse.json({
        message: "2FA successfully verified",
        redirect: true,
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return NextResponse.json(
        { message: "Verifizierung fehlgeschlagen" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("2FA verify API error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
