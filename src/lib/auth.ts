import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Apple from "next-auth/providers/apple";
import { hashPassword, verifyPassword } from "./password";
import { prisma } from "./prisma";
import { verifyTOTP, decryptTOTPSecret } from "./totp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.AUTH_APPLE_ID
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "Anmeldedaten",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        "2fa-code": { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;
        const twoFactorCode = credentials["2fa-code"] as string;

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

          // Check if 2FA is enabled
          if (user.totpEnabled && !twoFactorCode) {
            // Need 2FA but not provided yet
            return { 
              id: user.id, 
              email: user.email,
              totpEnabled: user.totpEnabled,
              requires2FA: true 
            };
          }

          if (user.totpEnabled && twoFactorCode) {
            // Verify 2FA
            try {
              const decryptedSecret = user.totpSecret 
                ? decryptTOTPSecret(user.totpSecret) 
                : null;
              
              if (!decryptedSecret || !verifyTOTP(decryptedSecret, twoFactorCode)) {
                return null;
              }

              await prisma.user.update({
                where: { id: user.id },
                data: { totpVerified: true },
              });

              return { 
                id: user.id, 
                email: user.email,
                totpEnabled: user.totpEnabled,
                totpVerified: true
              };
            } catch (error) {
              return null;
            }
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
          // Require 2FA but code not provided
          return { 
            id: user.id, 
            email: user.email,
            totpEnabled: user.totpEnabled,
            requires2FA: true 
          };
        }

        // Verify 2FA code if provided and 2FA is enabled
        if (user.totpEnabled && twoFactorCode) {
          try {
            const decryptedSecret = user.totpSecret 
              ? decryptTOTPSecret(user.totpSecret) 
              : null;
            
            if (!decryptedSecret || !verifyTOTP(decryptedSecret, twoFactorCode)) {
              return null;
            }

            await prisma.user.update({
              where: { id: user.id },
              data: { totpVerified: true },
            });

            return { 
              id: user.id, 
              email: user.email,
              totpEnabled: user.totpEnabled,
              totpVerified: true
            };
          } catch (error) {
            return null;
          }
        }

        // For tenants (handled separately via tenant JWT)
        const tenant = await prisma.tenant.findUnique({ where: { email } });
        if (tenant?.mfaEnabled && !twoFactorCode) {
          return { 
            id: tenant.id, 
            email: tenant.email,
            mfaEnabled: tenant.mfaEnabled,
            requires2FA: true,
            isTenant: true 
          };
        }

        if (tenant?.mfaEnabled && twoFactorCode) {
          // Simple PIN verification (in production use encrypted PIN)
          if (twoFactorCode !== "123456") {
            return null;
          }

          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { mfaVerified: true },
          });

          return { 
            id: tenant.id, 
            email: tenant.email,
            mfaEnabled: tenant.mfaEnabled,
            mfaVerified: true,
            isTenant: true 
          };
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

      // Check if 2FA is required but not verified
      if (auth?.user?.requires2FA && !auth.user.totpVerified && !auth.user.mfaVerified) {
        // Redirect to 2FA verification
        const url = request.nextUrl.clone();
        url.pathname = "/login/2fa";
        return Response.redirect(url);
      }

      return !!auth?.user;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.totpEnabled) {
        session.user.totpEnabled = token.totpEnabled as boolean;
      }
      if (token.totpVerified) {
        session.user.totpVerified = token.totpVerified as boolean;
      }
      if (token.mfaEnabled) {
        session.user.mfaEnabled = token.mfaEnabled as boolean;
      }
      if (token.mfaVerified) {
        session.user.mfaVerified = token.mfaVerified as boolean;
      }
      if (token.requires2FA) {
        session.user.requires2FA = token.requires2FA as boolean;
      }
      if (token.isTenant) {
        session.user.isTenant = token.isTenant as boolean;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.totpEnabled) {
          token.totpEnabled = user.totpEnabled;
        }
        if (user.totpVerified) {
          token.totpVerified = user.totpVerified;
        }
        if (user.mfaEnabled) {
          token.mfaEnabled = user.mfaEnabled;
        }
        if (user.mfaVerified) {
          token.mfaVerified = user.mfaVerified;
        }
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
});
