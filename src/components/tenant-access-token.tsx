"use client";

import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TenantAccessTokenProps {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}

export function TenantAccessToken({ tenantId, tenantName, onClose }: TenantAccessTokenProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchToken();
  }, [tenantId]);

  async function fetchToken() {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/access-token`);
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateToken() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/access-token`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revokeToken() {
    await fetch(`/api/tenants/${tenantId}/access-token`, {
      method: "DELETE",
    });
    setToken(null);
    setRevokeTarget(false);
  }

  async function copyCode() {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700">
          App-Zugang für {tenantName}
        </p>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Schließen
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Laden...</p>
      ) : token ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <code className="rounded-lg bg-white px-4 py-2 text-lg font-mono font-bold tracking-[0.3em] text-zinc-800 border border-zinc-200">
              {token}
            </code>
            <button
              onClick={copyCode}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Der Mieter gibt diesen Code in der VermieterMe-App ein, um Zugang zu seinen Daten zu erhalten.
          </p>
          <button
            onClick={() => setRevokeTarget(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Zugang widerrufen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Noch kein App-Zugang erstellt. Generieren Sie einen Einladungscode, damit der Mieter die App nutzen kann.
          </p>
          <button
            onClick={generateToken}
            disabled={generating}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {generating ? "Wird generiert..." : "Einladungscode generieren"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget}
        onOpenChange={setRevokeTarget}
        title="Zugang widerrufen"
        description={`Möchten Sie den App-Zugang für ${tenantName} wirklich widerrufen? Der Mieter kann sich danach nicht mehr in der App anmelden.`}
        confirmLabel="Widerrufen"
        onConfirm={revokeToken}
      />
    </div>
  );
}
