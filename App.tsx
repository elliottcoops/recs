import "react-native-gesture-handler";
import "./global.css";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { User } from "./src/data/mockData";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ThemeProvider } from "./src/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export default function App() {
  const [session, setSession] = useState<{ token: string; user: User } | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync("spotcheck-session").then(async (saved) => {
      if (!saved || !API_BASE_URL) return;
      const candidate = JSON.parse(saved) as { token: string; user: User };
      const response = await fetch(`${API_BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${candidate.token}` } });
      if (response.ok) setSession({ token: candidate.token, user: await response.json() }); else await SecureStore.deleteItemAsync("spotcheck-session");
    }).catch(() => undefined).finally(() => setIsRestoring(false));
  }, []);
  const signIn = async (nextSession: { token: string; user: User }) => { await SecureStore.setItemAsync("spotcheck-session", JSON.stringify(nextSession)); setSession(nextSession); };
  const signOut = async () => { await SecureStore.deleteItemAsync("spotcheck-session"); setSession(null); };
  const updateSessionUser = async (user: User) => {
    if (!session) return;
    const nextSession = { ...session, user };
    await SecureStore.setItemAsync("spotcheck-session", JSON.stringify(nextSession));
    setSession(nextSession);
  };
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider initialMetrics={initialWindowMetrics}><ThemeProvider><StatusBar style="dark" />{isRestoring ? <View className="flex-1 bg-teal-700" /> : session ? <HomeScreen session={session} onSignOut={signOut} onSessionUserUpdated={updateSessionUser} /> : <AuthScreen onAuthenticated={signIn} />}</ThemeProvider></SafeAreaProvider></GestureHandlerRootView>;
}
