import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyTOTP, decryptTOTPSecret } from "@/lib/totp";

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getServerSession();
    
    if (!sessionData?.user?.id) {
      return NextResponse.json(
        { message: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, type } = body;

    if (!code) {
      return NextResponse.json(
        { message: "Code ist erforderlich" },
        { status: 400 }
      );
    }

    if (type === "user") {
      const user = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: {
          id: true,
          totpSecret: true,
          totpEnabled: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { message: "Benutzer nicht gefunden" },
          { status: 404 }
        );
      }

      // Verify TOTP code
      try {
        const decryptedSecret = user.totpSecret 
          ? decryptTOTPSecret(user.totpSecret) 
          : null;

        if (!decryptedSecret) {
          return NextResponse.json(
            { message: "TOTP nicht konfiguriert" },
            { status: 400 }
          );
        }

        if (!verifyTOTP(decryptedSecret, code)) {
          return NextResponse.json(
            { message: "Ungültiger Code" },
            { status: 401 }
          );
        }

        // Enable TOTP
        await prisma.user.update({
          where: { id: user.id },
          data: {
            totpEnabled: true,
            totpVerified: true,
          },
        });

        return NextResponse.json({
          message: "2FA aktiviert",
          enabled: true,
        });
      } catch (error) {
        console.error("2FA enable error:", error);
        return NextResponse.json(
          { message: "Verifizierung fehlgeschlagen" },
          { status: 500 }
        );
      }
    } else if (type === "tenant") {
      // Enable MFA for tenant
      await prisma.tenant.update({
        where: { id: sessionData.user.id },
        data: {
          mfaEnabled: true,
          mfaVerified: true,
        },
      });

      return NextResponse.json({
        message: "2FA für Mieter aktiviert",
        enabled: true,
      });
    } else {
      return NextResponse.json(
        { message: "Unbekannter Typ" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("2FA enable API error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
