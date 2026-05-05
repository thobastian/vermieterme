import { getToken, getServerUrl, removeToken } from "./auth";
import type {
  AuthResponse,
  TenantProfile,
  BillingPeriodSummary,
  BillingPeriodDetail,
  DocumentItem,
} from "./types";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const [serverUrl, token] = await Promise.all([getServerUrl(), getToken()]);

  if (!serverUrl) {
    throw new ApiError(0, "Server-URL nicht konfiguriert");
  }

  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    await removeToken();
    throw new ApiError(401, "Sitzung abgelaufen");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new ApiError(res.status, body.error || `Fehler ${res.status}`);
  }

  return res.json();
}

export const api = {
  login(code: string): Promise<AuthResponse> {
    return apiFetch("/api/tenant-app/auth", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  getProfile(): Promise<TenantProfile> {
    return apiFetch("/api/tenant-app/profile");
  },

  updateProfile(data: {
    phone?: string;
    email?: string;
    bankName?: string;
    iban?: string;
    accountHolder?: string;
  }): Promise<Partial<TenantProfile>> {
    return apiFetch("/api/tenant-app/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  getBillingPeriods(): Promise<BillingPeriodSummary[]> {
    return apiFetch("/api/tenant-app/billing-periods");
  },

  getBillingPeriod(id: string): Promise<BillingPeriodDetail> {
    return apiFetch(`/api/tenant-app/billing-periods/${id}`);
  },

  getDocuments(): Promise<DocumentItem[]> {
    return apiFetch("/api/tenant-app/documents");
  },

  async getPdfUrl(billingPeriodId: string): Promise<string> {
    const serverUrl = await getServerUrl();
    const token = await getToken();
    return `${serverUrl}/api/tenant-app/billing-periods/${billingPeriodId}/pdf?token=${token}`;
  },

  async getDocumentUrl(documentId: string): Promise<string> {
    const serverUrl = await getServerUrl();
    const token = await getToken();
    return `${serverUrl}/api/tenant-app/documents/${documentId}/file?token=${token}`;
  },
};

export { ApiError };
