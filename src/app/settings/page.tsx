"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function TenantSecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setMfaEnabled(session.user.mfaEnabled || false);
    }
  }, [session]);

  const handleGeneratePin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tenant" }),
      });

      const data = await response.json();

      if (response.ok) {
        setPin(data.pin || "123456");
        toast.success("PIN generiert");
      } else {
        toast.error(data.message || "Fehler beim Generieren");
      }
    } catch (error) {
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    if (pinInput.length !== 6 && pinInput.length !== 4) {
      toast.error("Bitte geben Sie einen gültigen Code ein");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pinInput,
          type: "tenant",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMfaEnabled(true);
        setPinInput("");
        toast.success("2FA erfolgreich aktiviert");
      } else {
        toast.error(data.message || "Ungültiger Code");
      }
    } catch (error) {
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm("Möchten Sie 2FA wirklich deaktivieren?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "tenant" }),
      });

      const data = await response.json();

      if (response.ok) {
        setMfaEnabled(false);
        setPin("");
        toast.success("2FA deaktiviert");
      } else {
        toast.error(data.message || "Fehler beim Deaktivieren");
      }
    } catch (error) {
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Sicherheitseinstellungen</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Mieter-Zugangsschutz</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Schützen Sie Ihren Mieter-Zugang mit einer zusätzlichen Sicherheitsebene.
            Bei Aktivierung müssen Sie bei der Anmeldung einen 4- oder 6-stelligen Code eingeben.
          </p>
        </div>

        <div className="p-6">
          {mfaEnabled ? (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-900">2FA ist aktiviert</p>
                  <p className="text-sm text-zinc-500">Ihr Zugang ist durch einen zusätzlichen Code geschützt</p>
                </div>
              </div>
              
              <button
                onClick={handleDisableMFA}
                disabled={loading}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-900">2FA ist deaktiviert</p>
                  <p className="text-sm text-zinc-500">Fügen Sie eine zusätzliche Sicherheitsebene hinzu</p>
                </div>
              </div>
              
              {pin ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="mb-2 text-sm text-zinc-700">Ihr aktueller PIN-Code:</p>
                  <code className="text-2xl font-mono text-zinc-900">{pin}</code>
                </div>
              ) : (
                <button
                  onClick={handleGeneratePin}
                  disabled={loading}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  PIN-Code generieren
                </button>
              )}
              
              <button
                onClick={handleEnableMFA}
                disabled={loading}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                2FA aktivieren
              </button>
            </div>
          )}

          {mfaEnabled && (
            <div className="mt-6">
              <h3 className="font-medium text-zinc-900 mb-2">PIN-Code ändern</h3>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Neuer PIN-Code"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
