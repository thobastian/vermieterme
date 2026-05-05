# 2FA Database Migration

## Changes

### User Model
- Added `totpEnabled` (Boolean) - Whether 2FA is enabled for the user
- Added `totpSecret` (String?) - Encrypted TOTP secret
- Added `totpVerified` (Boolean) - Whether 2FA has been verified in current session
- Added `backupCodes` (String?) - JSON array of backup codes

### Tenant Model
- Added `mfaEnabled` (Boolean) - Whether MFA is enabled for the tenant
- Added `mfaVerified` (Boolean) - Whether MFA has been verified
- Added `mfaSessionToken` (String?) - Session token for MFA verification

## Migration Steps

1. Add the new columns to the database
2. Run `npx prisma generate` and `npx prisma migrate dev`
3. For existing users, 2FA will be disabled by default
4. Users can enable 2FA through the Settings > Security page

## Security Considerations

- TOTP secrets are encrypted using AES-256-GCM
- Backup codes are stored as JSON array (consider hashing for production)
- 2FA verification happens per session
