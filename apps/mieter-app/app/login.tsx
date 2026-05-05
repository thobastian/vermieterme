import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { setToken, setServerUrl, getServerUrl } from "../lib/auth";
import { Logo } from "../components/logo";

export default function LoginScreen() {
  const router = useRouter();
  const [serverUrl, setServerUrlState] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"server" | "code">("server");

  // Load saved server URL on mount
  useEffect(() => {
    getServerUrl().then((url) => {
      if (url) {
        setServerUrlState(url);
        setStep("code");
      }
    });
  }, []);

  async function handleServerSubmit() {
    if (!serverUrl.trim()) {
      Alert.alert("Fehler", "Bitte geben Sie die Server-URL ein.");
      return;
    }

    let url = serverUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
      setServerUrlState(url);
    }

    try {
      setLoading(true);
      const res = await fetch(`${url}/api/health`);
      if (!res.ok) throw new Error();
      await setServerUrl(url);
      setStep("code");
    } catch {
      Alert.alert(
        "Server nicht erreichbar",
        "Bitte prüfen Sie die URL und stellen Sie sicher, dass der Server läuft."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit() {
    if (!code.trim()) {
      Alert.alert("Fehler", "Bitte geben Sie den Einladungscode ein.");
      return;
    }

    try {
      setLoading(true);
      const result = await api.login(code.trim());
      await setToken(result.token);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Anmeldung fehlgeschlagen",
        error instanceof Error ? error.message : "Bitte prüfen Sie den Code."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Logo size={72} />
          <Text style={styles.title}>VermieterMe</Text>
          <Text style={styles.subtitle}>Mieter-Portal</Text>
        </View>

        {step === "server" ? (
          <View style={styles.form}>
            <Text style={styles.label}>Server-URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrlState}
              placeholder="https://vermieterme.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleServerSubmit}
            />
            <Text style={styles.hint}>
              Die Adresse Ihres VermieterMe-Servers
            </Text>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleServerSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verbinde..." : "Weiter"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Einladungscode</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={handleCodeSubmit}
            />
            <Text style={styles.hint}>
              Den Code erhalten Sie von Ihrem Vermieter
            </Text>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCodeSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Anmelden..." : "Anmelden"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.changeServerButton}
              onPress={() => setStep("server")}
            >
              <Text style={styles.changeServerText}>Server ändern</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#b91c1c",
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 4,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3f3f46",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#18181b",
    backgroundColor: "#fafafa",
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  hint: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  changeServerButton: {
    marginTop: 16,
    alignItems: "center",
  },
  changeServerText: {
    color: "#71717a",
    fontSize: 14,
  },
});
