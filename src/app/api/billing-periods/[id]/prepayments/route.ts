import { prisma } from "@/lib/prisma";
import { apiHandler, requireAuth, jsonOk, jsonCreated } from "@/lib/api-utils";

export function GET(
  _request: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireAuth();
    const { id } = await paramsPromise;
    const prepayments = await prisma.prepayment.findMany({
      where: { billingPeriodId: id },
      include: {
        unit: true,
      },
    });

    return jsonOk(prepayments);
  });
}

export function POST(
  request: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireAuth();
    const { id } = await paramsPromise;
    const body = await request.json();
    const { unitId, monthlyAmount, reviewed } = body;

    // `reviewed` is only set when the client explicitly requests it (the
    // "Bestätigen" action). A regular save must never silently mark
    // unreviewed positions as reviewed.
    const existing = await prisma.prepayment.findUnique({
      where: {
        billingPeriodId_unitId: {
          billingPeriodId: id,
          unitId,
        },
      },
    });

    let nextReviewed: boolean;
    if (typeof reviewed === "boolean") {
      nextReviewed = reviewed;
    } else if (existing) {
      // Editing an existing position invalidates a previous confirmation.
      const valueChanged = existing.monthlyAmount !== monthlyAmount;
      nextReviewed = valueChanged ? false : existing.reviewed;
    } else {
      nextReviewed = true;
    }

    const prepayment = await prisma.prepayment.upsert({
      where: {
        billingPeriodId_unitId: {
          billingPeriodId: id,
          unitId,
        },
      },
      update: {
        monthlyAmount,
        reviewed: nextReviewed,
      },
      create: {
        billingPeriodId: id,
        unitId,
        monthlyAmount,
        reviewed: nextReviewed,
      },
    });

    return jsonCreated(prepayment);
  });
}
