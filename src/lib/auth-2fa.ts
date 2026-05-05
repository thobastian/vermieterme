import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { hashPassword, verifyPassword } from "./password";
import { prisma } from "./prisma";
import { verifyTOTP, decryptTOTPSecret } from "./totp";
import { getTenantById } from "./api-utils";

export const auth2FAOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Anmeldedaten",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        "2fa-code": { label: "2FA Code", type: "text" },
        "2fa-redirect": { label: "2FA Redirect", type: "boolean" },
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;
        const twoFactorCode = credentials["2fa-code"] as string;
        const redirect = credentials["2fa-redirect"] === "true";

        if (!email || !password) return null;

        // Check against env vars for simple self-hosted admin auth
        if (
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) {
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: "Admin",
                password: await hashPassword(password),
              },
            });
          }
          
          // If 2FA is enabled, we need to verify
          if (user.totpEnabled && !user.totpVerified) {
            return { id: user.id, email: user.email, requires2FA: true, is2FAEnabled: true };
          }
          
          return user;
        }

        // Check database users with hashed password
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user || !user.password) {
          return null;
        }

        const passwordValid = await verifyPassword(password, user.password);
        if (!passwordValid) {
          return null;
        }

        // Check if user has 2FA enabled
        if (user.totpEnabled && !twoFactorCode) {
          return { id: user.id, email: user.email, requires2FA: true, is2FAEnabled: true };
        }

        // Verify 2FA code if provided and 2FA is enabled
        if (user.totpEnabled && twoFactorCode) {
          try {
            const decryptedSecret = user.totpSecret ? decryptTOTPSecret(user.totpSecret) : null;
            if (!decryptedSecret || !verifyTOTP(decryptedSecret, twoFactorCode)) {
              return null;
            }
            // Update 2FA verification timestamp
            await prisma.user.update({
              where: { id: user.id },
              data: { totpVerified: true },
            });
          } catch (error) {
            return null;
          }
        }

        // For tenants (handled separately)
        const tenant = await prisma.tenant.findUnique({ where: { email } });
        if (tenant?.mfaEnabled && !twoFactorCode) {
          return { id: tenant.id, email: tenant.email, requires2FA: true, is2FAEnabled: true, isTenant: true };
        }

        if (tenant?.mfaEnabled && twoFactorCode) {
          // Verify tenant 2FA (simple PIN-based)
          if (twoFactorCode !== "123456") { // Replace with actual 2FA verification
            return null;
          }
        }

        return user;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Public API routes (tenant app uses its own JWT auth, health is public)
      if (pathname.startsWith("/api/tenant-app") || pathname.startsWith("/api/health")) {
        return true;
      }

      return !!auth?.user;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.isTenant) {
        session.user.isTenant = token.isTenant as boolean;
      }
      if (token.requires2FA) {
        session.user.requires2FA = token.requires2FA as boolean;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.requires2FA) {
          token.requires2FA = user.requires2FA;
        }
        if (user.isTenant) {
          token.isTenant = user.isTenant;
        }
      }
      return token;
    },
  },
};

export const { handlers: auth2FAHandlers, auth: auth2FA, signIn: auth2FASignIn, signOut: auth2FASignOut } = NextAuth(auth2FAOptions);
