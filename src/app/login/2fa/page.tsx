"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const isTenant = searchParams.get("isTenant") === "true";

  useEffect(() => {
    if (status === "authenticated" && !session?.user?.requires2FA) {
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);
    setError("");

    // Focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const newCode = [...code];
    
    pastedData.split("").forEach((char, index) => {
      if (index < 6) {
        newCode[index] = char;
      }
    });
    
    setCode(newCode);
    inputRefs.current[pastedData.length] ?.focus();
  };

  const verify2FA = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Bitte geben Sie einen 6-stelligen Code ein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: fullCode,
          callbackUrl,
          isTenant,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.redirect) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          // Reload session
          window.location.reload();
        }
      } else {
        setError(data.message || "Ungültiger Code");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  };

  const useBackupCode = () => {
    setMethod("backup");
    setError("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-t-4 border-t-red-700" />
        <div className="p-8">
          <div className="mb-8 flex flex-col items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="h-12 w-12"
            >
              <rect width="32" height="32" rx="6" fill="#b91c1c" />
              <path d="M6 14h20v4H6z" fill="white" opacity={0.95} />
              <rect x="10" y="18" width="12" height="10" fill="white" rx="1" />
            </svg>
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-800">
                {isTenant ? "Mieter Zugang" : "Zweifaktor-Authentifizierung"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {isTenant 
                  ? "Geben Sie den Code aus Ihrer Authentifizierungs-App ein"
                  : "Geben Sie den Code aus Ihrer Authentifizierungs-App ein"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                {method === "totp" ? "6-stelliger Code" : "Backup-Code"}
              </label>
              <div className="flex gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-12 w-8 rounded-lg border border-zinc-300 text-center text-xl font-bold focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}

            <button
              onClick={verify2FA}
              disabled={loading}
              className="w-full rounded-lg bg-red-700 py-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {loading ? "Verifiziere..." : "Verifizieren"}
            </button>

            <div className="flex justify-center gap-4 text-sm">
              <button
                onClick={useBackupCode}
                className="text-red-700 hover:underline"
              >
                {method === "totp" ? "Backup-Code verwenden" : "Code-App verwenden"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
