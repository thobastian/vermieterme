"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RentChangeDialogValue {
  amount: number;
  effectiveDate: string;
  reason: string | null;
}

interface RentChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: RentChangeDialogValue) => void | Promise<void>;
  title: string;
  description?: string;
  defaultAmount: number;
  defaultEffectiveDate: string;
  defaultReason?: string;
  amountLabel?: string;
  submitLabel?: string;
}

export function RentChangeDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  defaultAmount,
  defaultEffectiveDate,
  defaultReason = "",
  amountLabel = "Neuer Betrag (EUR)",
  submitLabel = "Anpassung anlegen",
}: RentChangeDialogProps) {
  const [amount, setAmount] = useState<string>(defaultAmount.toFixed(2));
  const [effectiveDate, setEffectiveDate] = useState<string>(defaultEffectiveDate);
  const [reason, setReason] = useState<string>(defaultReason);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed inputs whenever the dialog (re)opens with fresh defaults.
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount.toFixed(2));
      setEffectiveDate(defaultEffectiveDate);
      setReason(defaultReason);
      setSubmitting(false);
    }
  }, [open, defaultAmount, defaultEffectiveDate, defaultReason]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsed,
        effectiveDate,
        reason: reason.trim() ? reason.trim() : null,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                {amountLabel}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Gültig ab
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Grund (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {submitting ? "Speichern..." : submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
