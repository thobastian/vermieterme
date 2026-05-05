"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Image from "next/image";

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"view" | "setup" | "verify">("view");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setTotpEnabled(session.user.totpEnabled || false);
    }
  }, [session]);

  const handleGenerateSecret = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user" }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("setup");
        setShowSecret(true);
      } else {
        toast.error(data.message || "Fehler beim Generieren des Secrets");
      }
    } catch (error) {
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type: "user",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTotpEnabled(true);
        setStep("view");
        setCode("");
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

  const handleDisable2FA = async () => {
    if (!window.confirm("Möchten Sie 2FA wirklich deaktivieren? Dies reduziert die Sicherheit Ihres Kontos.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user" }),
      });

      const data = await response.json();

      if (response.ok) {
        setTotpEnabled(false);
        setStep("view");
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

  const handleGenerateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user" }),
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.codes);
        toast.success("Backup-Codes generiert");
      } else {
        toast.error(data.message || "Fehler bei der Generierung");
      }
    } catch (error) {
      toast.error("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Sicherheitseinstellungen</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Zweifaktor-Authentifizierung</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Schützen Sie Ihr Konto mit einer zusätzlichen Sicherheitsebene. 
            Bei Aktivierung müssen Sie bei der Anmeldung einen Code aus Ihrer Authentifizierungs-App eingeben.
          </p>
        </div>

        <div className="p-6">
          {totpEnabled ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-900">2FA ist aktiviert</p>
                  <p className="text-sm text-zinc-500">Ihr Konto ist durch einen zusätzlichen Code geschützt</p>
                </div>
              </div>
              <button
                onClick={handleDisable2FA}
                disabled={loading}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
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
              <button
                onClick={handleGenerateSecret}
                disabled={loading}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                Aktivieren
              </button>
            </div>
          )}

          {showSecret && step === "setup" && (
            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-4 text-sm text-zinc-700">
                Scannen Sie diesen QR Code mit Ihrer Authentifizierungs-App (Google Authenticator, Authy, etc.):
              </p>
              
              <div className="flex items-center gap-4">
                <div className="rounded border border-zinc-300 p-2">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`otpauth://totp/VermieterMe:${session?.user?.email}?secret=${showSecret ? (session?.user?.totpSecret ? (session.user.totpSecret as string) : '') : ''}&issuer=VermieterMe`)}&size=150x150`} 
                    alt="QR Code" 
                    className="h-32 w-32"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm text-zinc-700">Oder fügen Sie diesen manuell hinzu:</p>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-zinc-200 px-2 py-1 text-sm font-mono text-zinc-800">
                      {session?.user?.totpSecret as string}
                    </code>
                    <button
                      onClick={() => copyToClipboard(session?.user?.totpSecret as string)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Kopieren
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Geben Sie einen Code aus der App ein, um zu verifizieren:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 w-32 rounded-lg border border-zinc-300 text-center text-xl font-bold focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleVerifyCode}
                    disabled={loading}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    Verifizieren
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900">Backup-Codes</h3>
          <p className="mt-1 text-sm text-zinc-500">
                Backup-Codes können verwendet werden, wenn Sie Ihren 2FA-Generator nicht verfügbar haben.
                Speichern Sie diese an einem sicheren Ort.
          </p>

          {backupCodes.length > 0 ? (
            <div className="mt-4 space-y-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between rounded border border-zinc-200 p-3">
                  <code className="font-mono text-zinc-800">{code}</code>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Kopieren
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={handleGenerateBackupCodes}
              disabled={loading || !totpEnabled}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Backup-Codes generieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
