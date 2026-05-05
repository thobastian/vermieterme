import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

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
    const { type } = body;

    if (type === "user") {
      // Disable TOTP for user
      await prisma.user.update({
        where: { id: sessionData.user.id },
        data: {
          totpEnabled: false,
          totpSecret: null,
          totpVerified: false,
        },
      });

      return NextResponse.json({
        message: "2FA deaktiviert",
        enabled: false,
      });
    } else if (type === "tenant") {
      // Disable MFA for tenant
      await prisma.tenant.update({
        where: { id: sessionData.user.id },
        data: {
          mfaEnabled: false,
          mfaVerified: false,
        },
      });

      return NextResponse.json({
        message: "2FA für Mieter deaktiviert",
        enabled: false,
      });
    } else {
      return NextResponse.json(
        { message: "Unbekannter Typ" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("2FA disable API error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
