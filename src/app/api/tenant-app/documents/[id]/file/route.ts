import path from "path";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { apiHandler, ApiError } from "@/lib/api-utils";
import { requireTenantAuth } from "@/lib/tenant-auth";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { tenantId } = await requireTenantAuth();
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) {
      throw new ApiError("Mieter nicht gefunden", 404);
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new ApiError("Dokument nicht gefunden", 404);
    }

    // Verify document belongs to this tenant or their property's billing periods
    if (document.tenantId && document.tenantId !== tenantId) {
      throw new ApiError("Zugriff verweigert", 403);
    }

    if (document.billingPeriodId) {
      const bp = await prisma.billingPeriod.findUnique({
        where: { id: document.billingPeriodId },
      });
      if (!bp || bp.propertyId !== tenant.unit.propertyId) {
        throw new ApiError("Zugriff verweigert", 403);
      }
    }

    const filePath = path.join(UPLOAD_DIR, document.fileName);
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  });
}
