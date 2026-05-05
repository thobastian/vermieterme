import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decryptTOTPSecret, getTOTPQRCodeURL } from "@/lib/totp";

export async function GET(request: NextRequest) {
  try {
    const sessionData = await getServerSession();
    
    if (!sessionData?.user?.id) {
      return NextResponse.json(
        { message: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "user";

    if (type === "user") {
      const user = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: {
          email: true,
          totpSecret: true,
        },
      });

      if (!user?.totpSecret) {
        return NextResponse.json(
          { message: "TOTP nicht konfiguriert" },
          { status: 404 }
        );
      }

      try {
        const secret = decryptTOTPSecret(user.totpSecret);
        const qrCodeURL = getTOTPQRCodeURL(user.email || "", secret);

        // Return the QR code URL (client will fetch the actual image)
        return NextResponse.json({ qrCodeURL });
      } catch (error) {
        return NextResponse.json(
          { message: "Fehler beim Decodieren des Secrets" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "Nicht unterstützt für Mieter" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("2FA QR code API error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
