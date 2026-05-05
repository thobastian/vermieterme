# 2FA Migration

## SQL Commands to Add 2FA Columns

### For User Table
```sql
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "backupCodes" TEXT;
```

### For Tenant Table
```sql
ALTER TABLE "Tenant" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "mfaSessionToken" TEXT;
```

## Prisma Migration
Run these commands:
```bash
npx prisma generate
npx prisma migrate dev --name add_2fa_support
```

## Environment Variables

Add to your `.env.local`:
```
TOTP_SECRET_KEY=your-32-byte-secret-key-here
```

## Testing the Implementation

1. Start the development server:
```bash
npm run dev
```

2. Create a test user with 2FA enabled:
   - Log in as admin
   - Go to Settings > Security
   - Enable 2FA
   - Scan QR code with authenticator app
   - Verify with 6-digit code

3. Test login flow with 2FA:
   - Log out
   - Log in with credentials
   - Should be redirected to /login/2fa
   - Enter 6-digit code from authenticator
   - Should be redirected to dashboard
