import { Session } from "next-auth";

export interface SessionWith2FA extends Session {
  user: UserWith2FA;
}

export interface UserWith2FA {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  totpEnabled?: boolean;
  totpVerified?: boolean;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  requires2FA?: boolean;
  isTenant?: boolean;
}

// Helper function to check if 2FA is required for current session
export function is2FARequired(session?: Session): boolean {
  return session?.user?.requires2FA ?? false;
}

// Helper function to check if 2FA is enabled for user
export function is2FAEnabled(session?: Session): boolean {
  return (session?.user?.totpEnabled ?? false) || (session?.user?.mfaEnabled ?? false);
}

// Helper function to check if 2FA has been verified in this session
export function is2FAVerified(session?: Session): boolean {
  return (session?.user?.totpVerified ?? false) || (session?.user?.mfaVerified ?? false);
}
