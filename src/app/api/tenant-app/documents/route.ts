import { apiHandler, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/tenant-auth";

export function GET() {
  return apiHandler(async () => {
    const { tenantId } = await requireTenantAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) {
      return jsonOk([]);
    }

    // Get documents linked to this tenant + documents from billing periods of this property
    const billingPeriods = await prisma.billingPeriod.findMany({
      where: { propertyId: tenant.unit.propertyId },
      select: { id: true },
    });

    const billingPeriodIds = billingPeriods.map((bp) => bp.id);

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { tenantId },
          { billingPeriodId: { in: billingPeriodIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk(
      documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        category: doc.category,
        billingPeriodId: doc.billingPeriodId,
        tenantId: doc.tenantId,
        createdAt: doc.createdAt,
      }))
    );
  });
}
