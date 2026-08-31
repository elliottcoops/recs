import { CalendarDays, Check, ChevronRight, UserPlus, UsersRound, X } from "lucide-react-native";
import { useState } from "react";
import { ReactNode } from "react";
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User } from "../data/mockData";

type FriendRequest = { id: string; user: User };
type Plan = { id: string; scheduledAt: string; hostId: string; host: User; spot: { name: string } | null; invites: { userId: string; status: "pending" | "accepted" | "maybe" | "declined"; user: User }[] };
type Section = "people" | "plans" | "requests";

type Props = {
  active: boolean;
  opacity: Animated.Value;
  topInset: number;
  friends: User[];
  incomingRequests: FriendRequest[];
  plans: Plan[];
  userId: string;
  friendUsername: string;
  friendError: string | null;
  onFriendUsernameChange: (value: string) => void;
  onSendFriendRequest: () => Promise<void>;
  onAcceptFriendRequest: (id: string) => Promise<void>;
  onOpenFriend: (friend: User) => void;
  onOpenPlan: (plan: Plan) => void;
  onClose: () => void;
  children?: ReactNode;
};

const initials = (name: string) => name.trim().slice(0, 1).toUpperCase();

export function FriendsScreen({ active, opacity, topInset, friends, incomingRequests, plans, userId, friendUsername, friendError, onFriendUsernameChange, onSendFriendRequest, onAcceptFriendRequest, onOpenFriend, onOpenPlan, onClose }: Props) {
  const [section, setSection] = useState<Section>(incomingRequests.length ? "requests" : "people");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  if (!active) return null;

  const tabs: { id: Section; label: string; count?: number }[] = [
    { id: "people", label: "People", count: friends.length },
    { id: "plans", label: "Plans", count: plans.length },
    { id: "requests", label: "Requests", count: incomingRequests.length },
  ];
  const successMessage = friendError?.includes("sent") || friendError?.includes("connected");

  return <Animated.View style={[StyleSheet.absoluteFillObject, { opacity, backgroundColor: "white" }]}>
    <SafeAreaView edges={[]} style={{ paddingTop: topInset }} className="flex-1 bg-white">
      <View className="flex-1 bg-white px-5 pt-5">
        <View className="flex-row items-center justify-between">
          <View><Text className="text-2xl font-extrabold tracking-tight text-slate-900">Friends</Text><Text className="mt-1 text-sm text-slate-500">Your people, plans and invites.</Text></View>
          <Pressable accessibilityLabel="Back to map" onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><X color="#334155" size={20} /></Pressable>
        </View>
        <View className="mt-5 flex-row rounded-2xl bg-slate-100 p-1">
          {tabs.map((tab) => <Pressable key={tab.id} onPress={() => setSection(tab.id)} className={`flex-1 rounded-xl py-2.5 ${section === tab.id ? "bg-white shadow-sm" : ""}`}><Text className={`text-center text-xs font-extrabold ${section === tab.id ? "text-teal-700" : "text-slate-500"}`}>{tab.label}{tab.count ? ` (${tab.count})` : ""}</Text></Pressable>)}
        </View>
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
            {section === "people" && <>
              <Pressable onPress={() => setIsAddingFriend((current) => !current)} className="mt-5 flex-row items-center justify-between rounded-2xl bg-teal-700 px-4 py-3.5"><View className="flex-row items-center"><UserPlus color="white" size={19} /><View className="ml-3"><Text className="font-extrabold text-white">Add a friend</Text><Text className="mt-0.5 text-xs text-teal-100">Search by their Recs username</Text></View></View><ChevronRight color="white" size={19} style={{ transform: [{ rotate: isAddingFriend ? "90deg" : "0deg" }] }} /></Pressable>
              {isAddingFriend && <View className="mt-2 rounded-2xl bg-slate-100 p-3"><View className="flex-row items-center rounded-xl bg-white px-3"><UserPlus color="#64748B" size={17} /><TextInput value={friendUsername} onChangeText={onFriendUsernameChange} placeholder="Username, e.g. sarah" autoCapitalize="none" className="ml-2 flex-1 py-3 text-base leading-6 text-slate-900" textAlignVertical="center" placeholderTextColor="#94A3B8" returnKeyType="done" onSubmitEditing={() => void onSendFriendRequest()} /></View><Pressable onPress={() => void onSendFriendRequest()} className="mt-2 rounded-xl bg-slate-900 py-3"><Text className="text-center font-bold text-white">Send request</Text></Pressable></View>}
              {friendError && <Text className={`mt-3 text-sm ${successMessage ? "text-teal-700" : "text-rose-600"}`}>{friendError}</Text>}
              <View className="mb-2 mt-6 flex-row items-center justify-between"><Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Your circle</Text><Text className="text-xs font-bold text-slate-400">{friends.length} total</Text></View>
              {friends.length ? friends.map((friend) => <Pressable key={friend.id} accessibilityLabel={`Open ${friend.name}'s profile`} onPress={() => onOpenFriend(friend)} className="mb-2 flex-row items-center rounded-2xl bg-slate-100 p-3"><View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-teal-700">{friend.photoUri ? <Image source={{ uri: friend.photoUri }} style={styles.avatar} /> : <Text className="text-base font-extrabold text-white">{initials(friend.name)}</Text>}</View><View className="ml-3 flex-1"><Text className="font-bold text-slate-900">{friend.name}</Text><Text className="mt-0.5 text-sm text-slate-500">@{friend.username}</Text></View><ChevronRight color="#94A3B8" size={19} /></Pressable>) : <View className="mt-1 items-center rounded-2xl bg-slate-50 px-6 py-9"><UsersRound color="#94A3B8" size={28} /><Text className="mt-3 text-center font-bold text-slate-700">Build your circle</Text><Text className="mt-1 text-center text-sm leading-5 text-slate-500">Add someone by username to share friends-only recommendations.</Text></View>}
            </>}
            {section === "plans" && <>
              <View className="mt-5 rounded-2xl bg-teal-50 px-4 py-3"><Text className="font-bold text-teal-800">Plans are tied to a place on the map.</Text><Text className="mt-1 text-sm text-teal-700">Open a plan to see the venue, time and who is going.</Text></View>
              {plans.length ? plans.map((plan) => { const isHost = plan.hostId === userId; const myInvite = plan.invites.find((invite) => invite.userId === userId); const accepted = plan.invites.filter((invite) => invite.status === "accepted").length; return <Pressable key={plan.id} onPress={() => onOpenPlan(plan)} className="mt-3 rounded-2xl bg-slate-100 p-4"><View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text className="font-extrabold text-slate-900">{plan.spot?.name ?? "Place"}</Text><Text className="mt-1 text-sm text-slate-600">{new Date(plan.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text></View><CalendarDays color="#0F766E" size={20} /></View><View className="mt-3 flex-row items-center justify-between"><Text className="text-xs font-bold text-teal-700">{isHost ? "You are hosting" : `@${plan.host.username} invited you`}</Text><Text className="text-xs font-bold text-slate-500">{accepted} going{!isHost && myInvite ? ` · ${myInvite.status}` : ""}</Text></View></Pressable>; }) : <View className="mt-5 items-center rounded-2xl bg-slate-50 px-6 py-10"><CalendarDays color="#94A3B8" size={30} /><Text className="mt-3 font-bold text-slate-700">No upcoming plans</Text><Text className="mt-1 text-center text-sm leading-5 text-slate-500">Open a recommendation on the map when you want to invite friends.</Text></View>}
            </>}
            {section === "requests" && <>
              <View className="mt-5 flex-row items-center justify-between"><Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Waiting for you</Text><Text className="text-xs font-bold text-slate-400">{incomingRequests.length} pending</Text></View>
              {incomingRequests.length ? incomingRequests.map((request) => <View key={request.id} className="mt-3 flex-row items-center rounded-2xl bg-slate-100 p-3"><View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-teal-700">{request.user.photoUri ? <Image source={{ uri: request.user.photoUri }} style={styles.avatar} /> : <Text className="text-base font-extrabold text-white">{initials(request.user.name)}</Text>}</View><View className="ml-3 flex-1"><Text className="font-bold text-slate-900">{request.user.name}</Text><Text className="mt-0.5 text-sm text-slate-500">@{request.user.username}</Text></View><Pressable onPress={() => void onAcceptFriendRequest(request.id)} className="flex-row items-center rounded-xl bg-teal-700 px-3 py-2.5"><Check color="white" size={16} /><Text className="ml-1 font-bold text-white">Accept</Text></Pressable></View>) : <View className="mt-5 items-center rounded-2xl bg-slate-50 px-6 py-10"><Check color="#94A3B8" size={30} /><Text className="mt-3 font-bold text-slate-700">All caught up</Text><Text className="mt-1 text-center text-sm text-slate-500">New friend requests will appear here.</Text></View>}
            </>}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  </Animated.View>;
}

const styles = StyleSheet.create({ keyboardAvoider: { flex: 1 }, content: { paddingBottom: 116 }, avatar: { width: "100%", height: "100%" } });
