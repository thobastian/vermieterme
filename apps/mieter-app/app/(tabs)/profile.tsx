import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";
import { removeToken } from "../../lib/auth";
import type { TenantProfile } from "../../lib/types";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    email: "",
    bankName: "",
    iban: "",
    accountHolder: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
      setForm({
        phone: p.phone ?? "",
        email: p.email ?? "",
        bankName: p.bankName ?? "",
        iban: p.iban ?? "",
        accountHolder: p.accountHolder ?? "",
      });
    } catch {
      // handled by auth guard
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateProfile(form);
      await fetchProfile();
      setEditing(false);
      Alert.alert("Gespeichert", "Ihre Daten wurden aktualisiert.");
    } catch (error) {
      Alert.alert(
        "Fehler",
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Abmelden", "Möchten Sie sich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden",
        style: "destructive",
        onPress: async () => {
          await removeToken();
          router.replace("/login");
        },
      },
    ]);
  }

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Laden...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b91c1c" />
      }
    >
      {/* Name (read-only) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Persönliche Daten</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {profile.salutation} {profile.firstName} {profile.lastName}
          </Text>
        </View>
        {profile.firstName2 && (
          <View style={styles.row}>
            <Text style={styles.label}>Zweiter Mieter</Text>
            <Text style={styles.value}>
              {profile.salutation2} {profile.firstName2} {profile.lastName2}
            </Text>
          </View>
        )}
      </View>

      {/* Contact Info */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>Bearbeiten</Text>
            </TouchableOpacity>
          )}
        </View>
        <Field
          label="Telefon"
          value={form.phone}
          editing={editing}
          onChange={(v) => setForm({ ...form, phone: v })}
          keyboardType="phone-pad"
        />
        <Field
          label="E-Mail"
          value={form.email}
          editing={editing}
          onChange={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address"
        />
      </View>

      {/* Bank Info */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bankverbindung</Text>
        </View>
        <Field
          label="Kontoinhaber"
          value={form.accountHolder}
          editing={editing}
          onChange={(v) => setForm({ ...form, accountHolder: v })}
        />
        <Field
          label="IBAN"
          value={form.iban}
          editing={editing}
          onChange={(v) => setForm({ ...form, iban: v })}
          autoCapitalize="characters"
        />
        <Field
          label="Bank"
          value={form.bankName}
          editing={editing}
          onChange={(v) => setForm({ ...form, bankName: v })}
        />
      </View>

      {/* Actions */}
      {editing && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Speichern..." : "Speichern"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setEditing(false);
              setForm({
                phone: profile.phone ?? "",
                email: profile.email ?? "",
                bankName: profile.bankName ?? "",
                iban: profile.iban ?? "",
                accountHolder: profile.accountHolder ?? "",
              });
            }}
          >
            <Text style={styles.cancelButtonText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "characters";
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
        />
      ) : (
        <Text style={styles.value}>{value || "—"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f5",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f5",
  },
  loadingText: {
    color: "#71717a",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b91c1c",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  editButton: {
    fontSize: 14,
    color: "#b91c1c",
    fontWeight: "500",
    marginBottom: 16,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#a1a1aa",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#18181b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#18181b",
    backgroundColor: "#fafafa",
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  cancelButtonText: {
    color: "#71717a",
    fontSize: 16,
  },
  logoutButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff",
  },
  logoutText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "500",
  },
});
