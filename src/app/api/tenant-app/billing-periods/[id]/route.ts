import { apiHandler, ApiError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { requireTenantAuth } from "@/lib/tenant-auth";
import { calculateBillingTotals, calculateMEAAmount } from "@/lib/billing";
import { NextRequest } from "next/server";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { tenantId, unitId } = await requireTenantAuth();
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: { include: { property: true } } },
    });

    if (!tenant) {
      throw new ApiError("Mieter nicht gefunden", 404);
    }

    const bp = await prisma.billingPeriod.findUnique({
      where: { id },
      include: {
        property: true,
        costs: { include: { costCategory: true } },
        prepayments: { where: { unitId } },
        documents: true,
      },
    });

    if (!bp || bp.propertyId !== tenant.unit.propertyId) {
      throw new ApiError("Abrechnungszeitraum nicht gefunden", 404);
    }

    const unit = tenant.unit;
    const property = unit.property;

    const visibleCosts = bp.costs.filter((cost) => cost.enabled !== false);

    const costs = visibleCosts.map((cost) => {
      // Per-period override takes precedence over the category default.
      const distributionKey =
        cost.distributionKeyOverride ?? cost.costCategory.distributionKey;
      let unitAmount = cost.unitAmount;
      if (unitAmount == null && distributionKey.toLowerCase() === "mea") {
        unitAmount = calculateMEAAmount(cost.totalAmount, unit.shares, property.totalShares);
      }

      return {
        id: cost.id,
        category: cost.costCategory.name,
        distributionKey,
        totalAmount: cost.totalAmount,
        unitAmount: unitAmount ?? 0,
      };
    });

    const totals = calculateBillingTotals(
      visibleCosts,
      bp.prepayments,
      bp.startDate.toISOString(),
      bp.endDate.toISOString()
    );

    const documents = bp.documents.map((doc) => ({
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      category: doc.category,
      createdAt: doc.createdAt,
    }));

    return jsonOk({
      id: bp.id,
      startDate: bp.startDate,
      endDate: bp.endDate,
      billingDate: bp.billingDate,
      sentDate: bp.sentDate,
      paidDate: bp.paidDate,
      property: {
        street: bp.property.street,
        zip: bp.property.zip,
        city: bp.property.city,
      },
      costs,
      prepayments: bp.prepayments.map((p) => ({
        id: p.id,
        monthlyAmount: p.monthlyAmount,
      })),
      totals: {
        totalCosts: totals.totalCosts,
        totalUnitCosts: totals.totalUnitCosts,
        totalPrepayment: totals.totalPrepayment,
        difference: totals.difference,
      },
      documents,
    });
  });
}
