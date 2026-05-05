import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { generateTOTPSecret, encryptTOTPSecret, getTOTPQRCodeURL } from "@/lib/totp";

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
    const { type } = body; // "user" or "tenant"

    if (type === "user") {
      // Generate new TOTP secret for user
      const secret = generateTOTPSecret();
      const encryptedSecret = encryptTOTPSecret(secret);
      
      // Update user with TOTP secret (not yet enabled)
      const user = await prisma.user.update({
        where: { id: sessionData.user.id },
        data: {
          totpSecret: encryptedSecret,
          totpEnabled: false,
          totpVerified: false,
        },
        select: {
          email: true,
          totpSecret: true,
        },
      });

      // Generate QR code URL
      const qrCodeURL = getTOTPQRCodeURL(user.email || "", secret);

      return NextResponse.json({
        secret,
        qrCodeURL,
        message: "TOTP secret generated",
      });
    } else if (type === "tenant") {
      // For tenants, we'll use a simpler PIN-based system
      // Generate a random 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the PIN (in production, encrypt this)
      await prisma.tenant.update({
        where: { id: sessionData.user.id },
        data: {
          mfaEnabled: false,
        },
      });

      return NextResponse.json({
        pin,
        message: "2FA PIN generated",
      });
    } else {
      return NextResponse.json(
        { message: "Unbekannter Typ" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
