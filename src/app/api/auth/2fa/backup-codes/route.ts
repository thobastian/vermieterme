import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { generateBackupCodes } from "@/lib/totp";

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
      const user = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: {
          id: true,
          totpEnabled: true,
          backupCodes: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { message: "Benutzer nicht gefunden" },
          { status: 404 }
        );
      }

      if (!user.totpEnabled) {
        return NextResponse.json(
          { message: "2FA muss aktiviert sein, um Backup-Codes zu generieren" },
          { status: 400 }
        );
      }

      // Generate new backup codes
      const codes = generateBackupCodes(10);
      const encryptedCodes = JSON.stringify(codes);

      // Store hash of codes (in production, use proper encryption)
      // For now, we'll store the codes in JSON
      await prisma.user.update({
        where: { id: user.id },
        data: {
          backupCodes: encryptedCodes,
        },
      });

      return NextResponse.json({
        codes,
        message: "Backup-Codes generiert",
      });
    } else {
      return NextResponse.json(
        { message: "Nicht unterstützt für Mieter" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("2FA backup codes API error:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
