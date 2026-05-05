# 2FA Implementierung für VermieterMe

## Übersicht

Diese Implementierung fügt Zweifaktor-Authentifizierung (2FA) für Benutzer und Mieter hinzu, basierend auf Next-Auth und TOTP.

## Was wurde implementiert?

### 1. Datenbank-Schema (prisma/schema.prisma)

**Benutzer (User):**
```prisma
totpEnabled   Boolean @default(false)
totpSecret    String?
totpVerified  Boolean @default(false)
backupCodes   String?
```

**Mieter (Tenant):**
```prisma
mfaEnabled    Boolean @default(false)
mfaVerified   Boolean @default(false)
mfaSessionToken String?
```

### 2. TOTP-Utilities (src/lib/totp.ts)
- `generateTOTPSecret()` - Erzeugt zufälliges TOTP-Secret
- `generateTOTP(secret, timestamp)` - Erzeugt aktuellen 6-stelligen Code
- `verifyTOTP(secret, code, timestamp)` - Verifiziert Code
- `encryptTOTPSecret(secret)` - Verschlüsselt Secret (AES-256-GCM)
- `decryptTOTPSecret(encrypted)` - Entschlüsselt Secret
- `getTOTPQRCodeURL(email, secret, issuer)` - Erzeugt URL für QR-Code
- `generateBackupCodes(count)` - Erzeugt Backup-Codes

### 3. Authentifizierung (src/lib/auth.ts)
- Next-Auth Konfiguration mit 2FA-Unterstützung
- Credentials-Provider erweitert um `2fa-code` Feld
- Callbacks aktualisiert für Session-Management mit 2FA

### 4. API-Endpoints

**2FA Setup:**
- `POST /api/auth/2fa/setup` - Generiert TOTP-Secret für Benutzer

**2FA Aktivierung:**
- `POST /api/auth/2fa/enable` - Aktiviert 2FA mit Code-Verifizierung

**2FA Deaktivierung:**
- `POST /api/auth/2fa/disable` - Deaktiviert 2FA

**2FA Verifizierung:**
- `POST /api/auth/verify-2fa` - Verifiziert 2FA-Code beim Login

**QR-Code:**
- `GET /api/auth/qrcode` - Ruft QR-Code-URL ab

**Backup-Codes:**
- `POST /api/auth/2fa/backup-codes` - Generiert Backup-Codes

### 5. UI-Pages

**Login mit 2FA:**
- `src/app/login/2fa/page.tsx` - 2FA-Verifizierung nach Passwort-Eingabe

**Benutzer-Einstellungen:**
- `src/app/settings/security/page.tsx` - 2FA-Verwaltung mit QR-Code

**Mieter-Einstellungen:**
- `src/app/settings/page.tsx` - PIN-basierte 2FA-Verwaltung

### 6. Type-Definitionen (src/types/index.ts)

Erweitert `AppUser` Interface um:
- `totpEnabled?: boolean`
- `totpVerified?: boolean`
- `mfaEnabled?: boolean`
- `mfaVerified?: boolean`
- `requires2FA?: boolean`
- `isTenant?: boolean`

## Ablauf für Benutzer

### 2FA Aktivierung
1. Login mit E-Mail und Passwort
2. Gehe zu `/settings/security`
3. Klicke "Aktivieren"
4. QR-Code wird generiert
5. Scanne QR mit Authenticator-App (Google Authenticator, Authy, etc.)
6. Gebe 6-stelligen Code ein
7. 2FA ist nun aktiviert

### Login mit 2FA
1. Gehe zu `/login`
2. Gebe E-Mail und Passwort ein
3. Wenn 2FA aktiviert → Umleitung zu `/login/2fa`
4. Gebe 6-stelligen Code ein
5. Login erfolgreich

### 2FA Deaktivierung
1. Gehe zu `/settings/security`
2. Klicke "Deaktivieren"
3. Bestätige Aktion

## Ablauf für Mieter

### 2FA Aktivierung
1. Login mit Zugangsdaten
2. Gehe zu `/settings`
3. Klicke "PIN generieren"
4. Klicke "2FA aktivieren"
5. Gebe PIN ein
6. 2FA ist nun aktiviert

### Login mit 2FA
1. Login mit Zugangsdaten
2. Wenn 2FA aktiviert → PIN-Verifizierung nötig
3. Gebe 6-stelligen PIN ein
4. Login erfolgreich

## Konfiguration

### Umgebungsvariablen

Füge zu `.env.local` hinzu:
```env
TOTP_SECRET_KEY=dein-32-byte-geheimschlüssel-hier
```

Ohne diesen Schlüssel wird ein Standardwert verwendet (NICHT für Produktion!).

### Datenbank-Migration
```bash
npx prisma generate
npx prisma migrate dev --name add_2fa_support
```

## Sicherheit

### Verschlüsselung
- TOTP-Secrets werden mit AES-256-GCM verschlüsselt
- Schlüssel aus `TOTP_SECRET_KEY` Umgebungsvariable
- Backup-Codes als JSON gespeichert (in Produktion: Hashing!)

### Zeitfenster
- TOTP nutzt 30-Sekunden Zeitfenster
- Verifiziert aktuelles + vorheriges Fenster (60 Sekunden gesamt)

### Session-Management
- `totpVerified` Flag wird in Session gespeichert
- Gilt für aktuelle Session
- Neue Verifizierung nach Session-Ende nötig

## Fehlersuche

### TOTP Code ist ungültig
- Stelle sicher, dass die Geräteuhr korrekt eingestellt ist
- Der Code ist nur 30 Sekunden lang gültig
- Der Code wird nur 30 Sekunden lang angezeigt

### QR Code funktioniert nicht
- Prüfe URL-Encoding
- Base32-Encoding korrekt
- Secret enthält keine Sonderzeichen

### Session wird nicht aktualisiert
- Prüfe NextAuth session callbacks
- JWT token wird bei Bedarf aktualisiert
- Session strategy (JWT vs Database) korrekt

## Hinweise

1. **2FA für mieter ist PIN-basiert** - Für Produktion sollte ein echtes TOTP-System verwendet werden
2. **Backup-Codes speichern** - In Papierform an einem sicheren Ort aufbewahren
3. **Migrationsstrategie** - Bestehende Benutzer haben 2FA standardmäßig deaktiviert
4. **Test before production** - Alle Features gründlich testen

## Nächste Schritte

- [ ] Unit-Tests für TOTP-Funktionen
- [ ] Integration tests für 2FA flow
- [ ] UI for backup code management
- [ ] Migration script for existing users
- [ ] Benutzer-Dokumentation (FAQ)

## Dateien

Hauptdateien:
- `src/lib/totp.ts` - TOTP-Logik
- `src/lib/auth.ts` - Next-Auth Konfiguration
- `src/lib/auth-2fa-context.ts` - Auth-Kontext
- `src/lib/2fa-utils.ts` - 2FA-Hilfsfunktionen
- `prisma/schema.prisma` - Datenbank-Schema

API-Endpoints:
- `src/app/api/auth/2fa/setup/route.ts`
- `src/app/api/auth/2fa/enable/route.ts`
- `src/app/api/auth/2fa/disable/route.ts`
- `src/app/api/auth/verify-2fa/route.ts`
- `src/app/api/auth/qrcode/route.ts`
- `src/app/api/auth/2fa/backup-codes/route.ts`

UI:
- `src/app/login/page.tsx` - Login (mit 2FA-Umleitungen)
- `src/app/login/2fa/page.tsx` - 2FA Verifizierung
- `src/app/settings/security/page.tsx` - Benutzer-Einstellungen
- `src/app/settings/page.tsx` - Mieter-Einstellungen

## Support

Bei Fragenoder Problemen:
1. Prüfen Sie die Fehlermeldungen im Browser
2. Prüfen Sie die Server-Logs für tiefere Einblicke
3. Stellen Sie sicher, dass alle Umgebungsvariablen korrekt gesetzt sind
4. Führen Sie die Datenbankmigration aus
