import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const SERVER_URL_KEY = "server_url";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

export async function setServerUrl(url: string): Promise<void> {
  // Normalize: remove trailing slash
  const normalized = url.replace(/\/+$/, "");
  await AsyncStorage.setItem(SERVER_URL_KEY, normalized);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  const url = await getServerUrl();
  return !!token && !!url;
}
