import { LockKeyhole, Mail, MapPin } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User } from "../data/mockData";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: { token: string; user: User }) => Promise<void> }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!API_BASE_URL) { setError("Set EXPO_PUBLIC_API_URL in .env, then restart Expo."); return; }
    setError(null); setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${isRegistering ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isRegistering ? { name, username, email, password } : { email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not sign in.");
      await onAuthenticated(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign in."); }
    finally { setIsSubmitting(false); }
  };

  return <SafeAreaView className="flex-1 bg-teal-700 px-6"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}><ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets><View className="flex-1 justify-center py-8"><View className="mb-10 items-center"><View className="h-16 w-16 items-center justify-center rounded-3xl border border-white/70 bg-white shadow-lg"><MapPin color="#0F766E" size={34} fill="#CCFBF1" /></View><Text className="mt-4 text-4xl font-extrabold tracking-tight text-white">SpotCheck</Text><Text className="mt-2 text-center text-base text-teal-100">Your map for places worth sharing.</Text></View>
    <View className="rounded-3xl border border-white/70 bg-white p-5 shadow-xl"><Text className="text-2xl font-extrabold tracking-tight text-slate-900">{isRegistering ? "Create your account" : "Welcome back"}</Text><Text className="mt-1 text-sm leading-5 text-slate-500">{isRegistering ? "Start your own private map." : "Sign in to see your saved places."}</Text>
      {isRegistering && <><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#94A3B8" className="mt-5 rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900" autoCapitalize="words" textAlignVertical="center" returnKeyType="next" /><TextInput value={username} onChangeText={setUsername} placeholder="Username (e.g. elliott)" placeholderTextColor="#94A3B8" className="mt-3 rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900" autoCapitalize="none" textAlignVertical="center" returnKeyType="next" /></>}
      <View className="mt-4 flex-row items-center rounded-2xl bg-slate-100 px-4"><Mail color="#64748B" size={18} /><TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#94A3B8" className="ml-2 flex-1 py-4 text-base leading-6 text-slate-900" autoCapitalize="none" keyboardType="email-address" textAlignVertical="center" returnKeyType="next" /></View>
      <View className="mt-3 flex-row items-center rounded-2xl bg-slate-100 px-4"><LockKeyhole color="#64748B" size={18} /><TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#94A3B8" className="ml-2 flex-1 py-4 text-base leading-6 text-slate-900" autoCapitalize="none" secureTextEntry textAlignVertical="center" returnKeyType="done" onSubmitEditing={submit} /></View>
      {isRegistering && <Text className="mt-2 text-xs text-slate-500">Username: 3–20 letters, numbers or underscores. Password: 8+ characters.</Text>}{error && <Text className="mt-3 text-sm text-rose-600">{error}</Text>}
      <Pressable disabled={isSubmitting} onPress={submit} className={`mt-5 items-center rounded-2xl py-4 shadow-sm ${isSubmitting ? "bg-slate-300" : "bg-teal-700"}`}>{isSubmitting ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">{isRegistering ? "Create account" : "Sign in"}</Text>}</Pressable>
      <Pressable onPress={() => { setIsRegistering((current) => !current); setError(null); }} className="mt-4 items-center"><Text className="font-bold text-teal-700">{isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}</Text></Pressable>
    </View><Text className="mt-6 text-center text-xs leading-5 text-teal-100">Google sign-in can be added later with OAuth credentials. This local version uses email and password.</Text>
  </View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
