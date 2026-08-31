import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Bike, Bookmark, CalendarPlus, Check, ChevronDown, ChevronUp, CircleDot, Coffee, Croissant, Dumbbell, Film, Footprints, Gamepad2, Landmark, LocateFixed, Map as MapIcon, MapPin, Martini, Music2, Navigation, Palette, PartyPopper, PersonStanding, Plus, Salad, Search, ShoppingBag, Star, TreePine, Trash2, UserPlus, UserRound, UsersRound, Utensils, Waves, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image as NativeImage, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, Spot, User, Visibility } from "../data/mockData";
import { FriendsScreen } from "./FriendsScreen";
import { MapScreen } from "./MapScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SavedScreen } from "./SavedScreen";

type PlaceSearchResult = { placeId: string; name: string; address: string; latitude: number; longitude: number; rating: number };
type Plan = { id: string; scheduledAt: string; hostId: string; host: User; spot: Spot; invites: { userId: string; status: "pending" | "accepted" | "maybe" | "declined"; user: User }[] };
type FriendProfile = { user: User; locationCount: number; friendCount: number; spots: Spot[] };
type MapMode = "mine" | "friends";

const INITIAL_REGION: Region = { latitude: 51.5248, longitude: -0.0808, latitudeDelta: 0.055, longitudeDelta: 0.055 };
const CLUSTER_ENTER_DELTA = 0.12;
const CLUSTER_EXIT_DELTA = 0.085;
const cleanMapStyle = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const categoryColors: Record<Category, string> = { Coffee: "#D97706", Restaurant: "#EA580C", Pub: "#7C3AED", "Cocktail Bar": "#9333EA", Bakery: "#DB2777", Brunch: "#F97316", Padel: "#059669", Tennis: "#16A34A", Football: "#22C55E", Gym: "#2563EB", Bouldering: "#2563EB", Yoga: "#DB2777", Pilates: "#EC4899", Running: "#0EA5E9", Cycling: "#0284C7", Swimming: "#06B6D4", Golf: "#65A30D", Cinema: "#DC2626", "Live Music": "#7C3AED", Theatre: "#C026D3", Museum: "#92400E", "Art Gallery": "#E11D48", Gaming: "#4F46E5", Shopping: "#DB2777", Market: "#CA8A04", Park: "#16A34A", Walk: "#65A30D", Wellness: "#14B8A6", Other: "#64748B" };
const categories: Category[] = ["Coffee", "Restaurant", "Pub", "Cocktail Bar", "Bakery", "Brunch", "Padel", "Tennis", "Football", "Gym", "Bouldering", "Yoga", "Pilates", "Running", "Cycling", "Swimming", "Golf", "Cinema", "Live Music", "Theatre", "Museum", "Art Gallery", "Gaming", "Shopping", "Market", "Park", "Walk", "Wellness", "Other"];
const popularCategories: Category[] = ["Coffee", "Restaurant", "Padel", "Tennis", "Gym", "Bouldering", "Cocktail Bar", "Live Music"];
type MapFilter = Category;
type AppTab = "map" | "friends" | "saved" | "profile";

const categoryIcon = (category: Category, color = "white", size = 19) => {
  const props = { color, size, strokeWidth: 2.5 };
  if (category === "Coffee") return <Coffee {...props} />;
  if (["Restaurant", "Brunch"].includes(category)) return <Utensils {...props} />;
  if (["Pub", "Cocktail Bar"].includes(category)) return <Martini {...props} />;
  if (category === "Bakery") return <Croissant {...props} />;
  if (["Padel", "Tennis", "Football", "Golf"].includes(category)) return <CircleDot {...props} />;
  if (["Gym", "Bouldering"].includes(category)) return <Dumbbell {...props} />;
  if (["Yoga", "Pilates", "Wellness"].includes(category)) return <PersonStanding {...props} />;
  if (category === "Running" || category === "Walk") return <Footprints {...props} />;
  if (category === "Cycling") return <Bike {...props} />;
  if (category === "Swimming") return <Waves {...props} />;
  if (category === "Cinema") return <Film {...props} />;
  if (category === "Live Music") return <Music2 {...props} />;
  if (category === "Theatre") return <PartyPopper {...props} />;
  if (category === "Museum") return <Landmark {...props} />;
  if (category === "Art Gallery") return <Palette {...props} />;
  if (category === "Gaming") return <Gamepad2 {...props} />;
  if (category === "Shopping") return <ShoppingBag {...props} />;
  if (category === "Market") return <Salad {...props} />;
  if (category === "Park") return <TreePine {...props} />;
  return <MapPin {...props} fill={color} />;
};
const markerIcon = (spot: Spot) => categoryIcon(spot.category);

export function HomeScreen({ session, onSignOut }: { session: { token: string; user: User }; onSignOut: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const tabTopInset = Math.max(insets.top, 44);
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const hasCenteredOnInitialLocation = useRef(false);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [mapMode, setMapMode] = useState<MapMode>("mine");
  const [mapFilters, setMapFilters] = useState<MapFilter[]>([]);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [mapCategorySearch, setMapCategorySearch] = useState("");
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [locationResults, setLocationResults] = useState<PlaceSearchResult[]>([]);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState(false);
  const headerTouchStartY = useRef<number | null>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [isClusterMode, setIsClusterMode] = useState(false);
  const spotRequestRef = useRef<AbortController | null>(null);
  const spotRequestVersion = useRef(0);
  const lastSettledRegion = useRef<Region>(INITIAL_REGION);
  const movingRegion = useRef<Region>(INITIAL_REGION);
  const movementRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const tabFade = useRef(new Animated.Value(1)).current;
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(session.user.photoUri ?? null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Coffee");
  const [isAddCategoryPickerOpen, setIsAddCategoryPickerOpen] = useState(false);
  const [addCategorySearch, setAddCategorySearch] = useState("");
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [feedbackPhotoUri, setFeedbackPhotoUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<{ id: string; user: User }[]>([]);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendProfile | null>(null);
  const [isFriendProfileLoading, setIsFriendProfileLoading] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [savedSpots, setSavedSpots] = useState<Spot[]>([]);
  const [savedSort, setSavedSort] = useState<"nearest" | "recent">("nearest");
  const [savedCategory, setSavedCategory] = useState<Category | "All">("All");
  const [plans, setPlans] = useState<Plan[]>([]);
  const upcomingPlans = plans.filter((plan) => new Date(plan.scheduledAt).getTime() > Date.now());
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const visibleMapCategories = categories.filter((item) => item.toLowerCase().includes(mapCategorySearch.trim().toLowerCase()));
  const addCategoryMatches = categories.filter((item) => item.toLowerCase().includes(addCategorySearch.trim().toLowerCase()));
  const canShowMapPins = true;
  const visibleRecommendationCount = spots.reduce((total, spot) => total + (spot.clusterCount ?? 1), 0);
  const filteredSavedSpots = savedSpots.filter((spot) => savedCategory === "All" || spot.category === savedCategory).sort((first, second) => {
    if (savedSort === "recent" || !userLocation) return 0;
    const firstDistance = (first.latitude - userLocation.latitude) ** 2 + (first.longitude - userLocation.longitude) ** 2;
    const secondDistance = (second.latitude - userLocation.latitude) ** 2 + (second.longitude - userLocation.longitude) ** 2;
    return firstDistance - secondDistance;
  });

  const loadSpots = useCallback(async (nextRegion: Region, mode: MapMode) => {
    if (!API_BASE_URL) return;
    spotRequestRef.current?.abort();
    const controller = new AbortController();
    spotRequestRef.current = controller;
    const requestVersion = ++spotRequestVersion.current;
    const query = new URLSearchParams({ mode, latitude: String(nextRegion.latitude), longitude: String(nextRegion.longitude), latitudeDelta: String(nextRegion.latitudeDelta), longitudeDelta: String(nextRegion.longitudeDelta), cluster: isClusterMode ? "1" : "0", filters: mapFilters.join(",") });
    try {
      const response = await fetch(`${API_BASE_URL}/api/spots?${query}`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal });
      if (!response.ok || requestVersion !== spotRequestVersion.current) return;
      const saved: Spot[] = await response.json();
      const nextSpots = saved.map((spot) => ({ ...spot, category: categoryColors[spot.category as Category] ? spot.category as Category : "Other", personalRating: Math.min(5, spot.personalRating ?? 4), description: spot.description ?? spot.note ?? "", photoUri: spot.photoUri ?? null, communityRating: spot.communityRating ?? null, communityRatingCount: spot.communityRatingCount ?? 0, comments: spot.comments ?? [] }));
      setSpots((current) => current.length === nextSpots.length && current.every((spot, index) => spot.id === nextSpots[index]?.id && spot.clusterCount === nextSpots[index]?.clusterCount && spot.latitude === nextSpots[index]?.latitude && spot.longitude === nextSpots[index]?.longitude) ? current : nextSpots);
    } catch (reason) { if ((reason as Error).name !== "AbortError") { /* Keep the last responsive marker set while the request retries. */ } }
  }, [isClusterMode, mapFilters, session.token]);

  useEffect(() => {
    if (!canShowMapPins) return;
    const timeout = setTimeout(() => void loadSpots(region, mapMode), 260);
    return () => clearTimeout(timeout);
  }, [canShowMapPins, loadSpots, mapMode, mapFilters, region]);

  const loadFriends = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/friends`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (response.ok) { const data = await response.json(); setFriends(data.friends); setIncomingRequests(data.incoming); }
  };

  useEffect(() => { void loadFriends(); }, [session.token]);

  const loadSaved = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/saved`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (response.ok) setSavedSpots(await response.json());
  };

  useEffect(() => { void loadSaved(); }, [session.token]);

  const loadPlans = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/plans`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (response.ok) setPlans(await response.json());
  };

  useEffect(() => { void loadPlans(); }, [session.token]);

  useEffect(() => () => {
    spotRequestRef.current?.abort();
    if (movementRefreshTimer.current) clearTimeout(movementRefreshTimer.current);
  }, []);

  const navigateToTab = (nextTab: AppTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    if (nextTab !== "map") setSelectedSpot(null);
    if (nextTab === "friends") { void loadFriends(); void loadPlans(); }
    if (nextTab === "saved") void loadSaved();
    tabFade.stopAnimation();
    tabFade.setValue(1);
  };

  const openSpot = useCallback((spot: Spot) => {
    setSelectedSpot(spot);
    setIsTopBarCollapsed(true);
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackPhotoUri(null);
    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
    mapRef.current?.animateToRegion({ latitude: spot.latitude - 0.0038, longitude: spot.longitude, latitudeDelta: 0.014, longitudeDelta: 0.014 }, 280);
 }, []);

  const submitSpotFeedback = async () => {
    if (!API_BASE_URL || !selectedSpot || feedbackRating === null) return;
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/spots/${encodeURIComponent(selectedSpot.id)}/reviews`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment, photoUri: feedbackPhotoUri }) });
      const body = await response.json() as Spot & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save your feedback.");
      setSelectedSpot(body); setSpots((current) => current.map((spot) => spot.id === body.id ? body : spot)); setSavedSpots((current) => current.map((spot) => spot.id === body.id ? body : spot));
      setFeedbackRating(null); setFeedbackComment(""); setFeedbackPhotoUri(null);
    } catch (reason) { Alert.alert("Could not save feedback", reason instanceof Error ? reason.message : "Please try again."); }
    finally { setIsSubmittingFeedback(false); }
  };

  const zoomIntoCluster = useCallback((cluster: Spot) => {
    const currentRegion = lastSettledRegion.current;
    mapRef.current?.animateToRegion({ latitude: cluster.latitude, longitude: cluster.longitude, latitudeDelta: Math.max(currentRegion.latitudeDelta * 0.55, 0.014), longitudeDelta: Math.max(currentRegion.longitudeDelta * 0.55, 0.014) }, 280);
  }, []);

  const handleMapMovement = useCallback((nextRegion: Region) => {
    movingRegion.current = nextRegion;
    if (movementRefreshTimer.current) return;
    movementRefreshTimer.current = setTimeout(() => {
      movementRefreshTimer.current = null;
      setRegion(movingRegion.current);
    }, 320);
  }, []);

  const handleMapRegionChange = useCallback((nextRegion: Region) => {
    const previous = lastSettledRegion.current;
    const centreMoved = Math.abs(nextRegion.latitude - previous.latitude) > Math.max(nextRegion.latitudeDelta * 0.12, 0.0015) || Math.abs(nextRegion.longitude - previous.longitude) > Math.max(nextRegion.longitudeDelta * 0.12, 0.0015);
    const zoomChanged = Math.abs(nextRegion.latitudeDelta - previous.latitudeDelta) / previous.latitudeDelta > 0.12;
    if (centreMoved || zoomChanged) {
      lastSettledRegion.current = nextRegion;
      setRegion(nextRegion);
    }
    const mapSpan = Math.max(nextRegion.latitudeDelta, nextRegion.longitudeDelta);
    setIsClusterMode((current) => current ? mapSpan > CLUSTER_EXIT_DELTA : mapSpan > CLUSTER_ENTER_DELTA);
  }, []);

  const searchPlaces = async () => {
    if (!API_BASE_URL) { setError("Set EXPO_PUBLIC_API_URL in .env and restart Expo."); return; }
    if (query.trim().length < 3) { setError("Enter at least three characters."); return; }
    Keyboard.dismiss(); setIsSearching(true); setError(null); setResults([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/places/search`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ query }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Venue search failed.");
      setResults(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Venue search failed."); }
    finally { setIsSearching(false); }
  };

  const searchMapLocation = async () => {
    if (!API_BASE_URL || discoveryQuery.trim().length < 3) return;
    Keyboard.dismiss();
    setIsLocationSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/places/search`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ query: discoveryQuery.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Location search failed.");
      const matches = body as PlaceSearchResult[];
      setLocationResults(matches);
      if (matches[0]) selectMapLocation(matches[0]);
    } catch (reason) { Alert.alert("Could not find that location", reason instanceof Error ? reason.message : "Try another location."); }
    finally { setIsLocationSearching(false); }
  };

  const selectMapLocation = (place: PlaceSearchResult) => {
    const nextRegion = { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.028, longitudeDelta: 0.028 };
    lastSettledRegion.current = nextRegion;
    setRegion(nextRegion);
    setDiscoveryQuery(place.name);
    setLocationResults([]);
    mapRef.current?.animateToRegion(nextRegion, 360);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photo permission needed", "Allow access to choose a venue photo."); return; }
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
    if (!selection.canceled) setPhotoUris((current) => [...current, ...selection.assets.map((asset) => asset.uri)].slice(0, 5));
  };

  const pickFeedbackPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photo permission needed", "Allow access to choose a photo."); return; }
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
    if (!selection.canceled) setFeedbackPhotoUri(selection.assets[0].uri);
  };

  const savePlace = async (place: PlaceSearchResult) => {
    if (!API_BASE_URL) return;
    const trimmedDescription = description.trim();
    if (personalRating === null) { setError("Choose your rating out of 5."); return; }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/spots`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ place, category, personalRating, description: trimmedDescription, photoUris, visibility }) });
      const saved = await response.json() as Spot & { error?: string };
      if (!response.ok) throw new Error(saved.error ?? "Could not save the pin.");
      setSpots((current) => [saved, ...current.filter((spot) => spot.id !== saved.id)]);
      setIsAddOpen(false); setQuery(""); setResults([]); setSelectedPlace(null); setDescription(""); setPhotoUris([]); setPersonalRating(null); setVisibility("private");
      setTimeout(() => openSpot(saved), 50);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the pin."); }
  };

  const sendFriendRequest = async () => {
    if (!API_BASE_URL || !friendUsername.trim()) return;
    setFriendError(null);
    const response = await fetch(`${API_BASE_URL}/api/friends/requests`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ username: friendUsername }) });
    const body = await response.json();
    if (!response.ok) { setFriendError(body.error ?? "Could not send request."); return; }
    setFriendUsername(""); setFriendError("Friend request sent."); await loadFriends();
  };

  const acceptFriendRequest = async (id: string) => {
    if (!API_BASE_URL) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/requests/${id}/accept`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not accept friend request.");
      const accepted = incomingRequests.find((request) => request.id === id);
      setIncomingRequests((current) => current.filter((request) => request.id !== id));
      if (accepted) setFriends((current) => current.some((friend) => friend.id === accepted.user.id) ? current : [...current, accepted.user]);
      setFriendError(`You and @${accepted?.user.username ?? "your friend"} are now connected.`);
      await loadFriends();
    } catch (reason) { Alert.alert("Could not accept request", reason instanceof Error ? reason.message : "Please try again."); }
  };

  const openFriendProfile = async (friend: User) => {
    if (!API_BASE_URL) return;
    setIsFriendProfileLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/${encodeURIComponent(friend.id)}/profile`, { headers: { Authorization: `Bearer ${session.token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not open this profile.");
      setSelectedFriendProfile(body);
    } catch (reason) { Alert.alert("Friend profile", reason instanceof Error ? reason.message : "Could not open this profile."); }
    finally { setIsFriendProfileLoading(false); }
  };

  const toggleSaved = async (spot: Spot) => {
    if (!API_BASE_URL) return;
    const isSaved = savedSpots.some((saved) => saved.id === spot.id);
    const response = await fetch(`${API_BASE_URL}/api/saved/${encodeURIComponent(spot.id)}`, { method: isSaved ? "DELETE" : "POST", headers: { Authorization: `Bearer ${session.token}` } });
    if (response.ok) await loadSaved();
  };

  const deleteSpot = (spot: Spot) => Alert.alert("Delete pin?", `Remove ${spot.name} and any plans linked to it?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { if (!API_BASE_URL) return; const response = await fetch(`${API_BASE_URL}/api/spots/${encodeURIComponent(spot.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } }); if (response.ok) { sheetRef.current?.close(); setSpots((current) => current.filter((item) => item.id !== spot.id)); setSavedSpots((current) => current.filter((item) => item.id !== spot.id)); await loadPlans(); } } }]);
  const deleteProfile = () => Alert.alert("Delete profile permanently?", "This removes your account, pins, saved places, friendships and plans. This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete profile", style: "destructive", onPress: async () => { if (!API_BASE_URL) return; const response = await fetch(`${API_BASE_URL}/api/me`, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } }); if (response.ok) { await onSignOut(); } else Alert.alert("Could not delete profile", "Please try again."); } }]);
  const updateProfilePhoto = async (photoUri: string | null) => { if (!API_BASE_URL) return; const response = await fetch(`${API_BASE_URL}/api/me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ photoUri }) }); const body = await response.json(); if (!response.ok) { Alert.alert("Could not update photo", body.error ?? "Please try again."); return; } setProfilePhotoUri(body.photoUri ?? null); };
  const pickProfilePhoto = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert("Photo permission needed", "Allow access to choose a profile photo."); return; } const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 }); if (!selection.canceled) await updateProfilePhoto(selection.assets[0].uri); };
  const changePassword = async () => { if (!API_BASE_URL) return; setProfileError(null); const response = await fetch(`${API_BASE_URL}/api/me/password`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ currentPassword, newPassword }) }); if (!response.ok) { const body = await response.json().catch(() => ({})); setProfileError(body.error ?? "Could not update password."); return; } setCurrentPassword(""); setNewPassword(""); setIsPasswordOpen(false); Alert.alert("Password updated", "Your new password is now active."); };

  const openSchedule = () => { setInviteeIds([]); setPlanError(null); setScheduledAt(new Date(Date.now() + 60 * 60 * 1000)); setIsScheduleOpen(true); };
  const createPlan = async () => {
    if (!API_BASE_URL || !selectedSpot) return;
    setPlanError(null);
    const response = await fetch(`${API_BASE_URL}/api/plans`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ spotId: selectedSpot.id, scheduledAt: scheduledAt.toISOString(), inviteeIds }) });
    const body = await response.json();
    if (!response.ok) { setPlanError(body.error ?? "Could not create plan."); return; }
    setIsScheduleOpen(false); await loadPlans();
  };
  const respondToPlan = async (id: string, status: "accepted" | "maybe" | "declined") => { if (!API_BASE_URL) return; const response = await fetch(`${API_BASE_URL}/api/plans/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ status }) }); if (!response.ok) { const body = await response.json().catch(() => ({})); Alert.alert("Could not update RSVP", body.error ?? "Please restart the local server and try again."); return; } setSelectedPlan((current) => current?.id === id ? { ...current, invites: current.invites.map((invite) => invite.userId === session.user.id ? { ...invite, status } : invite) } : current); await loadPlans(); };
  const deletePlan = (plan: Plan) => Alert.alert("Delete plan?", "Everyone invited will lose this plan.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { if (!API_BASE_URL) return; const response = await fetch(`${API_BASE_URL}/api/plans/${plan.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } }); if (response.ok) { setSelectedPlan(null); await loadPlans(); } } }]);
  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => { if (!date) { setPickerMode(null); return; } const next = new Date(scheduledAt); next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); if (pickerMode === "date") { setScheduledAt(next); setPickerMode("time"); } else { next.setHours(date.getHours(), date.getMinutes()); setScheduledAt(next); setPickerMode(null); } };

  const centerOnUser = () => userLocation ? mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.014, longitudeDelta: 0.014 }, 350) : Alert.alert("Finding your location", "Allow location access, then tap again.");
  const handleUserLocationChange = (event: { nativeEvent: { coordinate?: { latitude: number; longitude: number } } }) => {
    const coordinate = event.nativeEvent.coordinate;
    if (!coordinate) return;
    setUserLocation(coordinate);
    if (hasCenteredOnInitialLocation.current) return;
    hasCenteredOnInitialLocation.current = true;
    const nextRegion = { ...coordinate, latitudeDelta: 0.014, longitudeDelta: 0.014 };
    lastSettledRegion.current = nextRegion;
    setRegion(nextRegion);
    requestAnimationFrame(() => mapRef.current?.animateToRegion(nextRegion, 420));
  };
  const getDirections = async (spot: Spot) => {
    const destination = `${spot.latitude},${spot.longitude}`;
    const url = Platform.OS === "ios" ? `http://maps.apple.com/?daddr=${destination}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    try { await Linking.openURL(url); } catch { Alert.alert("Could not open maps", "Install or enable a maps app and try again."); }
  };

  return <View className="flex-1 bg-white">
    <MapScreen active={activeTab === "map"} opacity={tabFade}>
    <MapView ref={mapRef} initialRegion={region} style={StyleSheet.absoluteFillObject} showsUserLocation showsMyLocationButton={false} showsPointsOfInterest={false} customMapStyle={cleanMapStyle} moveOnMarkerPress={false} toolbarEnabled={false} onRegionChange={handleMapMovement} onRegionChangeComplete={handleMapRegionChange} onUserLocationChange={handleUserLocationChange}>
      {spots.map((spot) => spot.isCluster ? <Marker key={spot.id} coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} tracksViewChanges={false} onPress={() => zoomIntoCluster(spot)}><View style={clusterMarkerStyle}><Text className="text-xs font-extrabold text-white">{spot.clusterCount && spot.clusterCount > 99 ? "99+" : spot.clusterCount}</Text></View></Marker> : <Marker key={spot.id} coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} tracksViewChanges={false} onPress={() => openSpot(spot)}><View style={[styles.marker, { backgroundColor: categoryColors[spot.category] }]}>{markerIcon(spot)}</View></Marker>)}
    </MapView>

    <SafeAreaView edges={["top"]} className="items-center pt-2"><View onTouchStart={(event) => { headerTouchStartY.current = event.nativeEvent.pageY; }} onTouchEnd={(event) => { const startY = headerTouchStartY.current; if (startY === null) return; const distance = event.nativeEvent.pageY - startY; if (distance < -24) setIsTopBarCollapsed(true); if (distance > 24) setIsTopBarCollapsed(false); headerTouchStartY.current = null; }} className="w-[80%] rounded-3xl border border-white/80 bg-white/95 px-3 py-2.5 shadow-lg"><View className="flex-row items-center justify-between"><View className="mr-2 flex-1"><Text className="text-xl font-extrabold text-slate-900">Recs</Text>{!isTopBarCollapsed && <Text numberOfLines={1} className="text-xs text-slate-500">Explore nearby places.</Text>}</View><View className="flex-row flex-shrink-0 items-center"><View className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1.5"><Text className="text-xs font-bold text-emerald-700">{visibleRecommendationCount} Recs nearby</Text></View><Pressable onPress={() => setIsTopBarCollapsed((current) => !current)} className="ml-1 rounded-full bg-slate-100 p-1.5">{isTopBarCollapsed ? <ChevronDown color="#475569" size={17} /> : <ChevronUp color="#475569" size={17} />}</Pressable></View></View>{!isTopBarCollapsed && <View><View className="mt-3 flex-row rounded-2xl bg-slate-100 p-1">{(["mine", "friends"] as MapMode[]).map((mode) => <Pressable key={mode} onPress={() => setMapMode(mode)} className={`flex-1 rounded-xl py-2.5 ${mapMode === mode ? "bg-white" : ""}`}><Text className={`text-center text-xs font-extrabold ${mapMode === mode ? "text-teal-700" : "text-slate-500"}`}>{mode === "mine" ? "Mine" : "Friends"}</Text></Pressable>)}</View><View className="mt-3 flex-row items-center rounded-2xl border border-slate-100 bg-slate-50 px-3"><Search color="#64748B" size={18} /><TextInput value={discoveryQuery} onChangeText={(value) => { setDiscoveryQuery(value); setLocationResults([]); }} onSubmitEditing={searchMapLocation} placeholder="Search a location" placeholderTextColor="#94A3B8" returnKeyType="search" className="ml-2 flex-1 py-3 text-sm text-slate-900" />{discoveryQuery.length > 0 && <Pressable onPress={() => { setDiscoveryQuery(""); setLocationResults([]); }}><X color="#64748B" size={18} /></Pressable>}</View><Pressable onPress={() => setIsCategoryPickerOpen((current) => !current)} className="mt-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5"><View className="flex-row items-center"><CircleDot color="#0F766E" size={17} /><Text className="ml-2 text-sm font-extrabold text-slate-700">Categories</Text></View><View className="flex-row items-center"><Text className="mr-1 text-xs font-bold text-teal-700">{mapFilters.length ? `${mapFilters.length} selected` : "All"}</Text><ChevronDown color="#0F766E" size={17} /></View></Pressable>{isCategoryPickerOpen && <View className="mt-2 max-h-72 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-lg"><TextInput value={mapCategorySearch} onChangeText={setMapCategorySearch} placeholder="Search any category" placeholderTextColor="#94A3B8" className="rounded-2xl bg-slate-100 px-4 py-3 text-base text-slate-900" /><Pressable onPress={() => setMapFilters([])} className="mt-2 rounded-xl bg-slate-50 px-3 py-2"><Text className="text-sm font-bold text-slate-700">All categories</Text></Pressable><ScrollView className="mt-1" keyboardShouldPersistTaps="handled">{visibleMapCategories.map((category) => <Pressable key={category} onPress={() => setMapFilters((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])} className={`mt-1 flex-row items-center rounded-xl px-3 py-2.5 ${mapFilters.includes(category) ? "bg-teal-50" : "bg-slate-50"}`}><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: categoryColors[category] }}>{categoryIcon(category, "white", 14)}</View><Text className="ml-2 text-sm font-bold text-slate-700">{category}</Text></Pressable>)}</ScrollView></View>}</View>}</View></SafeAreaView>
    {!selectedSpot && <Pressable accessibilityLabel="Center map on my location" onPress={centerOnUser} style={styles.locationButton} className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg"><LocateFixed color="#0F766E" size={22} /></Pressable>}

    <BottomSheet ref={sheetRef} index={-1} snapPoints={selectedSpot?.photos?.length || selectedSpot?.photoUri ? ["82%", "90%"] : ["60%", "85%"]} enablePanDownToClose keyboardBehavior="interactive" bottomInset={72} containerStyle={styles.spotSheetContainer} style={styles.spotSheetCard} backgroundStyle={styles.sheet} handleIndicatorStyle={styles.handle} onClose={() => setSelectedSpot(null)}>
      {selectedSpot && <BottomSheetScrollView contentContainerStyle={styles.spotSheetContent}><View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text className="text-2xl font-extrabold text-slate-900">{selectedSpot.name}</Text><Text className="mt-1 text-sm text-slate-500">{selectedSpot.address}</Text></View><View className="rounded-full bg-slate-900 px-3 py-2"><Text className="text-sm font-bold text-white">{selectedSpot.personalRating}/5</Text></View></View>
{selectedSpot.photos?.length ? <View className="mt-3"><Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Photos</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{selectedSpot.photos.map((photo) => <View key={photo.id} className="mr-3 h-32 w-44 overflow-hidden rounded-2xl"><NativeImage source={{ uri: photo.uri }} style={styles.cardPhoto} /><View className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1"><Text className="text-xs font-bold text-white">@{photo.user.username}</Text></View></View>)}</ScrollView></View> : selectedSpot.photoUri ? <NativeImage source={{ uri: selectedSpot.photoUri }} style={styles.detailPhoto} /> : null}
        <View className="mt-3 self-start rounded-full px-3 py-1" style={{ backgroundColor: `${categoryColors[selectedSpot.category]}20` }}><Text style={{ color: categoryColors[selectedSpot.category] }} className="text-xs font-extrabold">{selectedSpot.category}</Text></View>
        <Text className="mt-3 text-sm font-bold text-teal-700">Pinned by {selectedSpot.pinnedBy}</Text>
        <View className="mt-2 flex-row items-center"><Star color="#F59E0B" size={18} fill="#F59E0B" /><Text className="ml-1 font-bold text-slate-700">{selectedSpot.pinnedBy}'s rating: {selectedSpot.personalRating}/5</Text></View>
        <View className="mt-3 rounded-2xl bg-slate-100 p-4"><Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Note from {selectedSpot.pinnedBy}</Text><Text className="mt-1 text-base leading-6 text-slate-700">{selectedSpot.description || "No note added yet."}</Text></View>
        <View className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4"><View className="flex-row items-center justify-between"><Text className="text-xs font-extrabold uppercase tracking-wide text-amber-800">Friends' rating</Text><View className="flex-row items-center"><Star color="#F59E0B" size={17} fill="#F59E0B" /><Text className="ml-1 font-extrabold text-amber-900">{selectedSpot.communityRating ?? "—"}/5</Text></View></View><Text className="mt-1 text-sm text-amber-800">{selectedSpot.communityRatingCount ? `From ${selectedSpot.communityRatingCount} friend${selectedSpot.communityRatingCount === 1 ? "" : "s"}` : "No friend ratings yet"}</Text></View>
        <View className="mt-4 flex-row gap-3"><Pressable onPress={() => getDirections(selectedSpot)} className="flex-1 flex-row items-center justify-center rounded-2xl bg-slate-900 py-4"><Navigation color="white" size={18} /><Text className="ml-2 font-bold text-white">Get Directions</Text></Pressable><Pressable onPress={() => toggleSaved(selectedSpot)} className={`items-center justify-center rounded-2xl px-4 ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "bg-amber-400" : "bg-slate-100"}`}><Bookmark color={savedSpots.some((spot) => spot.id === selectedSpot.id) ? "white" : "#0F766E"} size={21} fill={savedSpots.some((spot) => spot.id === selectedSpot.id) ? "white" : "transparent"} /><Text className={`mt-1 text-xs font-extrabold ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "text-white" : "text-teal-700"}`}>{savedSpots.some((spot) => spot.id === selectedSpot.id) ? "Saved" : "Save"}</Text></Pressable></View>
        <Pressable onPress={openSchedule} className="mt-3 flex-row items-center justify-center rounded-2xl bg-teal-700 py-3"><CalendarPlus color="white" size={18} /><Text className="ml-2 font-bold text-white">Schedule with friends</Text></Pressable>
        {selectedSpot.userId === session.user.id && <Pressable onPress={() => deleteSpot(selectedSpot)} className="mt-3 flex-row items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-3"><Trash2 color="#E11D48" size={17} /><Text className="ml-2 font-bold text-rose-600">Delete pin</Text></Pressable>}
        {selectedSpot.userId !== session.user.id && selectedSpot.visibility === "friends" && <View className="mt-4 rounded-2xl bg-teal-50 p-4"><Text className="font-extrabold text-teal-900">What do you think?</Text><Text className="mt-1 text-sm text-teal-700">Rate this recommendation and leave a note for friends.</Text><View className="mt-3 flex-row gap-2">{[1, 2, 3, 4, 5].map((score) => <Pressable key={score} onPress={() => setFeedbackRating(score)} className={`h-9 w-9 items-center justify-center rounded-full ${feedbackRating === score ? "bg-amber-400" : "bg-white"}`}><Star color={feedbackRating === score ? "white" : "#F59E0B"} size={17} fill={feedbackRating === score ? "white" : "transparent"} /></Pressable>)}</View><TextInput value={feedbackComment} onChangeText={setFeedbackComment} placeholder="e.g. Yes, this is amazing." placeholderTextColor="#94A3B8" maxLength={280} multiline onFocus={() => sheetRef.current?.snapToIndex(1)} textAlignVertical="top" className="mt-3 min-h-20 rounded-xl bg-white px-3 py-3 text-base leading-6 text-slate-900" />{feedbackPhotoUri ? <View className="mt-3 h-24 overflow-hidden rounded-xl"><NativeImage source={{ uri: feedbackPhotoUri }} style={styles.cardPhoto} /><Pressable onPress={() => setFeedbackPhotoUri(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1"><X color="white" size={15} /></Pressable></View> : <Pressable onPress={pickFeedbackPhoto} className="mt-3 rounded-xl border border-dashed border-teal-600 bg-white py-2.5"><Text className="text-center text-sm font-bold text-teal-700">Add a photo</Text></Pressable>}<Pressable disabled={feedbackRating === null || isSubmittingFeedback} onPress={() => void submitSpotFeedback()} className={`mt-3 rounded-xl py-3 ${feedbackRating === null || isSubmittingFeedback ? "bg-slate-300" : "bg-teal-700"}`}><Text className="text-center font-extrabold text-white">{isSubmittingFeedback ? "Saving…" : "Post rating & comment"}</Text></Pressable></View>}
        {selectedSpot.comments?.length ? <View className="mt-4"><Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Friend comments</Text>{selectedSpot.comments.map((comment) => <View key={comment.id} className="mb-2 rounded-2xl bg-slate-100 p-3"><View className="flex-row items-center justify-between"><Text className="font-extrabold text-slate-900">@{comment.user.username}</Text><View className="flex-row items-center"><Star color="#F59E0B" size={14} fill="#F59E0B" /><Text className="ml-1 text-xs font-extrabold text-slate-700">{comment.rating}/5</Text></View></View><Text className="mt-1 text-sm leading-5 text-slate-600">{comment.comment}</Text></View>)}</View> : null}
      </BottomSheetScrollView>}
    </BottomSheet>

    </MapScreen>
    <SafeAreaView edges={["bottom"]} style={styles.bottomNav} className="border-t border-slate-100 bg-white px-4 pt-2"><View className="flex-row items-end justify-between"><Pressable onPress={() => navigateToTab("map")} className="items-center pb-1"><MapIcon color={activeTab === "map" ? "#0F766E" : "#64748B"} size={21} fill={activeTab === "map" ? "#CCFBF1" : "none"} /><Text className={`mt-1 text-[10px] font-extrabold ${activeTab === "map" ? "text-teal-700" : "text-slate-500"}`}>MAP</Text></Pressable><Pressable onPress={() => navigateToTab("friends")} className="items-center pb-1"><View><UsersRound color={activeTab === "friends" ? "#0F766E" : "#64748B"} size={21} />{incomingRequests.length > 0 && <View className="absolute -right-2 -top-2 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500"><Text className="text-[9px] font-bold text-white">{incomingRequests.length}</Text></View>}</View><Text className="mt-1 text-[10px] font-bold text-slate-500">FRIENDS</Text></Pressable><Pressable accessibilityLabel="Add a new place" onPress={() => { navigateToTab("map"); setIsTopBarCollapsed(true); setIsAddOpen(true); }} style={styles.navAdd} className="h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-teal-700 shadow-lg"><Plus color="white" size={27} strokeWidth={3} /><Text style={styles.addLabel}>ADD</Text></Pressable><Pressable onPress={() => navigateToTab("saved")} className="items-center pb-1"><Bookmark color={activeTab === "saved" ? "#0F766E" : "#64748B"} size={21} /><Text className="mt-1 text-[10px] font-bold text-slate-500">SAVED</Text></Pressable><Pressable onPress={() => navigateToTab("profile")} className="items-center pb-1"><UserRound color={activeTab === "profile" ? "#0F766E" : "#64748B"} size={21} /><Text className="mt-1 text-[10px] font-bold text-slate-500">PROFILE</Text></Pressable></View></SafeAreaView>

    <Modal visible={isAddOpen} animationType="fade" transparent onRequestClose={() => setIsAddOpen(false)}><KeyboardAvoidingView style={styles.keyboardAvoider} behavior="height" keyboardVerticalOffset={0}><View style={styles.addModalBackdrop}><View style={selectedPlace ? styles.addModalCardExpanded : styles.addModalCardCompact}><ScrollView contentContainerStyle={styles.addModalContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets><View className="px-6 pb-10 pt-5"><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-extrabold text-slate-900">Add a place</Text><Text className="mt-1 text-sm text-slate-500">Search, rate and share your view.</Text></View><Pressable onPress={() => setIsAddOpen(false)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View>
      <Text className="mb-2 mt-6 text-sm font-extrabold text-slate-700">Find the venue</Text><View className="flex-row items-center rounded-2xl bg-slate-100 px-4"><Search color="#64748B" size={19} /><TextInput value={query} onChangeText={(value) => { setQuery(value); setSelectedPlace(null); setResults([]); setError(null); }} onSubmitEditing={searchPlaces} placeholder="e.g. Bethwall Climbing Centre" className="ml-2 flex-1 py-4 text-base leading-6 text-slate-900" textAlignVertical="center" placeholderTextColor="#94A3B8" returnKeyType="search" /></View><Pressable disabled={isSearching} onPress={searchPlaces} className={`mt-3 flex-row items-center justify-center rounded-xl py-3 ${isSearching ? "bg-slate-300" : "bg-teal-700"}`}>{isSearching ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">Search Google Places</Text>}</Pressable>{results.length > 0 && !selectedPlace && <View className="mt-3 rounded-2xl border border-slate-200 bg-white"><Text className="px-4 pt-4 text-sm font-extrabold text-slate-800">Choose the correct location</Text>{results.map((place) => <Pressable key={place.placeId} onPress={() => { setSelectedPlace(place); setResults([]); setQuery(place.name); setError(null); Keyboard.dismiss(); }} className="border-b border-slate-100 px-4 py-4"><Text className="font-bold text-slate-900">{place.name}</Text><Text className="mt-1 text-sm text-slate-500">{place.address}</Text><Text className="mt-1 text-xs font-bold text-teal-700">Select venue</Text></Pressable>)}</View>}
      {!selectedPlace ? <View className="mt-5 rounded-2xl bg-slate-100 p-4"><Text className="font-extrabold text-slate-800">Select a venue to continue</Text><Text className="mt-1 text-sm leading-5 text-slate-500">Search for the place, then choose the correct result. Nothing will be added until you tap Add place.</Text></View> : <>
      <View className="mt-5 rounded-2xl bg-teal-50 p-4"><Text className="text-xs font-extrabold uppercase tracking-wide text-teal-700">Selected venue</Text><Text className="mt-1 font-extrabold text-slate-900">{selectedPlace.name}</Text><Text className="mt-1 text-sm text-slate-600">{selectedPlace.address}</Text><Pressable onPress={() => { setSelectedPlace(null); setQuery(""); }}><Text className="mt-3 text-sm font-bold text-teal-700">Change venue</Text></Pressable></View>
      <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Category *</Text><Pressable onPress={() => setIsAddCategoryPickerOpen((current) => !current)} className="flex-row items-center justify-between rounded-2xl bg-slate-100 px-4 py-3"><View className="flex-row items-center"><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: categoryColors[category] }}>{categoryIcon(category, "white", 15)}</View><Text className="ml-3 text-base font-extrabold text-slate-800">{category}</Text></View><ChevronDown color="#0F766E" size={18} style={{ transform: [{ rotate: isAddCategoryPickerOpen ? "180deg" : "0deg" }] }} /></Pressable>{isAddCategoryPickerOpen && <View className="mt-2 max-h-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2"><View className="flex-row items-center rounded-xl bg-slate-100 px-3"><Search color="#64748B" size={17} /><TextInput value={addCategorySearch} onChangeText={setAddCategorySearch} placeholder="Search categories" placeholderTextColor="#94A3B8" className="ml-2 flex-1 py-2.5 text-base text-slate-900" /></View><ScrollView className="mt-2" keyboardShouldPersistTaps="handled">{addCategoryMatches.map((item) => <Pressable key={item} onPress={() => { setCategory(item); setAddCategorySearch(""); setIsAddCategoryPickerOpen(false); }} className={`mt-1 flex-row items-center rounded-xl px-3 py-2.5 ${item === category ? "bg-teal-50" : "bg-slate-50"}`}><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: categoryColors[item] }}>{categoryIcon(item, "white", 14)}</View><Text className="ml-2 flex-1 text-sm font-bold text-slate-700">{item}</Text>{item === category && <Check color="#0F766E" size={17} />}</Pressable>)}</ScrollView></View>}
      <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Your rating *</Text><View className="flex-row flex-wrap gap-2">{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <Pressable key={value} onPress={() => setPersonalRating(value)} className={`h-10 w-10 items-center justify-center rounded-full ${value === personalRating ? "bg-amber-400" : "bg-slate-100"}`}><Text className={`font-extrabold ${value === personalRating ? "text-white" : "text-slate-600"}`}>{value}</Text></Pressable>)}</View>
      <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Who can see this pin?</Text><View className="flex-row gap-2">{(["private", "friends"] as Visibility[]).map((option) => <Pressable key={option} onPress={() => setVisibility(option)} className={`flex-1 rounded-xl px-2 py-3 ${visibility === option ? "bg-teal-700" : "bg-slate-100"}`}><Text className={`text-center text-xs font-extrabold ${visibility === option ? "text-white" : "text-slate-600"}`}>{option === "private" ? "Just me" : "Friends"}</Text></Pressable>)}</View>
      <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Your description <Text className="normal-case text-slate-400">(optional)</Text></Text><TextInput value={description} onChangeText={setDescription} placeholder="What makes this place worth visiting?" multiline maxLength={280} textAlignVertical="top" className="min-h-20 rounded-2xl bg-slate-100 px-4 py-3 text-base leading-6 text-slate-900" />
<Pressable onPress={pickPhoto} className="mt-4 rounded-xl border border-dashed border-teal-600 bg-teal-50 py-3"><Text className="text-center font-bold text-teal-700">{photoUris.length ? `Add more photos (${photoUris.length}/5)` : "Add photos"}</Text></Pressable>{photoUris.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">{photoUris.map((uri, index) => <View key={uri} className="mr-3 h-24 w-24 overflow-hidden rounded-2xl"><NativeImage source={{ uri }} style={styles.cardPhoto} /><Pressable onPress={() => setPhotoUris((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1"><X color="white" size={15} /></Pressable></View>)}</ScrollView> : null}
      {error && <Text className="mt-3 text-sm text-rose-600">{error}</Text>}<Pressable disabled={personalRating === null} onPress={() => { if (selectedPlace) void savePlace(selectedPlace); }} className={`mt-5 rounded-2xl py-4 ${personalRating !== null ? "bg-teal-700" : "bg-slate-300"}`}><Text className="text-center font-extrabold text-white">Add place</Text></Pressable></>}</View></ScrollView></View></View></KeyboardAvoidingView></Modal>

    <SavedScreen active={activeTab === "saved"} opacity={tabFade}><SafeAreaView edges={[]} style={{ paddingTop: tabTopInset }} className="flex-1 bg-white"><View className="flex-1 bg-white px-5 pb-10 pt-5"><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-extrabold text-slate-900">Saved for later</Text><Text className="mt-1 text-sm text-slate-500">Your personal shortlist.</Text></View><Pressable onPress={() => navigateToTab("map")} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View><View className="mt-5"><View className="flex-row gap-2"><Pressable onPress={() => setSavedSort("nearest")} className={`flex-1 rounded-xl py-3 ${savedSort === "nearest" ? "bg-teal-700" : "bg-slate-100"}`}><Text className={`text-center text-xs font-extrabold ${savedSort === "nearest" ? "text-white" : "text-slate-600"}`}>Nearest to me</Text></Pressable><Pressable onPress={() => setSavedSort("recent")} className={`flex-1 rounded-xl py-3 ${savedSort === "recent" ? "bg-teal-700" : "bg-slate-100"}`}><Text className={`text-center text-xs font-extrabold ${savedSort === "recent" ? "text-white" : "text-slate-600"}`}>Recently added</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">{(["All", ...categories] as (Category | "All")[]).map((item) => <Pressable key={item} onPress={() => setSavedCategory(item)} className={`mr-2 rounded-full px-3 py-2 ${savedCategory === item ? "bg-amber-400" : "bg-slate-100"}`}><Text className={`text-xs font-extrabold ${savedCategory === item ? "text-white" : "text-slate-600"}`}>{item}</Text></Pressable>)}</ScrollView></View><ScrollView className="mt-5" showsVerticalScrollIndicator={false}>{filteredSavedSpots.length ? filteredSavedSpots.map((spot) => <Pressable key={spot.id} onPress={() => { navigateToTab("map"); requestAnimationFrame(() => openSpot(spot)); }} className="mb-3 flex-row overflow-hidden rounded-2xl bg-slate-100"><View className="h-24 w-24 items-center justify-center" style={{ backgroundColor: `${categoryColors[spot.category]}25` }}>{spot.photoUri ? <NativeImage source={{ uri: spot.photoUri }} style={styles.cardPhoto} /> : <MapPin color={categoryColors[spot.category]} size={28} fill={categoryColors[spot.category]} />}</View><View className="flex-1 justify-center px-4"><Text className="font-extrabold text-slate-900">{spot.name}</Text><Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>{spot.address}</Text><Text className="mt-1 text-xs font-bold text-teal-700">{spot.personalRating}/5 · {spot.category}</Text></View></Pressable>) : <View className="items-center rounded-2xl bg-slate-100 py-10"><Bookmark color="#94A3B8" size={30} /><Text className="mt-3 font-bold text-slate-700">Nothing saved yet</Text><Text className="mt-1 text-center text-sm text-slate-500">Open a pin and tap Save to keep it for later.</Text></View>}</ScrollView></View></SafeAreaView></SavedScreen>

    <Modal visible={isScheduleOpen} animationType="slide" transparent onRequestClose={() => setIsScheduleOpen(false)}><View className="flex-1 justify-end bg-black/40"><View className="rounded-t-3xl bg-white px-6 pb-10 pt-5"><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-extrabold text-slate-900">Schedule with friends</Text><Text className="mt-1 text-sm text-slate-500">{selectedSpot?.name}</Text></View><Pressable onPress={() => setIsScheduleOpen(false)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View><Pressable onPress={() => setPickerMode("date")} className="mt-5 rounded-2xl bg-slate-100 p-4"><Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Date & time</Text><Text className="mt-1 text-lg font-bold text-slate-900">{scheduledAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text></Pressable>{pickerMode && <DateTimePicker value={scheduledAt} mode={pickerMode} minimumDate={new Date()} onChange={onDateChange} />}
      <Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Invite friends</Text>{friends.length ? friends.map((friend) => <Pressable key={friend.id} onPress={() => setInviteeIds((current) => current.includes(friend.id) ? current.filter((id) => id !== friend.id) : [...current, friend.id])} className={`mb-2 flex-row items-center justify-between rounded-2xl p-3 ${inviteeIds.includes(friend.id) ? "bg-teal-100" : "bg-slate-100"}`}><View><Text className="font-bold text-slate-900">{friend.name}</Text><Text className="text-sm text-slate-500">@{friend.username}</Text></View>{inviteeIds.includes(friend.id) && <Check color="#0F766E" size={20} />}</Pressable>) : <Text className="text-sm text-slate-500">Add and accept friends before scheduling a plan.</Text>}{planError && <Text className="mt-3 text-sm text-rose-600">{planError}</Text>}<Pressable disabled={!friends.length} onPress={createPlan} className={`mt-5 rounded-2xl py-4 ${friends.length ? "bg-teal-700" : "bg-slate-300"}`}><Text className="text-center font-extrabold text-white">Send invitations</Text></Pressable></View></View></Modal>

    <FriendsScreen active={activeTab === "friends"} opacity={tabFade}><SafeAreaView edges={[]} style={{ paddingTop: tabTopInset }} className="flex-1 bg-white"><View className="flex-1 bg-white px-5 pb-10 pt-5"><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-extrabold text-slate-900">Friends</Text><Text className="mt-1 text-sm text-slate-500">Connect and make plans together.</Text></View><Pressable onPress={() => navigateToTab("map")} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View><KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 112 }}><View className="mt-5 flex-row items-center rounded-2xl bg-slate-100 px-4"><UserPlus color="#64748B" size={18} /><TextInput value={friendUsername} onChangeText={setFriendUsername} placeholder="Username, e.g. sarah" autoCapitalize="none" className="ml-2 flex-1 py-4 text-base leading-6 text-slate-900" textAlignVertical="center" placeholderTextColor="#94A3B8" returnKeyType="done" onSubmitEditing={sendFriendRequest} /></View><Pressable onPress={sendFriendRequest} className="mt-3 rounded-xl bg-teal-700 py-3"><Text className="text-center font-bold text-white">Send friend request</Text></Pressable>{friendError && <Text className={`mt-3 text-sm ${friendError === "Friend request sent." ? "text-teal-700" : "text-rose-600"}`}>{friendError}</Text>}<Text className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-wide text-slate-500">Plans</Text>{upcomingPlans.length ? upcomingPlans.map((plan) => { const mine = plan.hostId === session.user.id; const invite = plan.invites.find((item) => item.userId === session.user.id); return <Pressable key={plan.id} onPress={() => setSelectedPlan(plan)} className="mb-2 rounded-2xl bg-slate-100 p-3"><Text className="font-bold text-slate-900">{plan.spot?.name ?? "Place"}</Text><Text className="mt-1 text-sm text-slate-600">{new Date(plan.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text><Text className="mt-1 text-xs font-bold text-teal-700">{mine ? "You invited friends" : `Invited by @${plan.host?.username ?? "friend"}`}</Text>{!mine && invite?.status === "pending" && <View className="mt-3 flex-row gap-2"><Pressable onPress={() => respondToPlan(plan.id, "accepted")} className="flex-1 rounded-xl bg-teal-700 py-2"><Text className="text-center font-bold text-white">Accept</Text></Pressable><Pressable onPress={() => respondToPlan(plan.id, "declined")} className="flex-1 rounded-xl border border-slate-300 py-2"><Text className="text-center font-bold text-slate-600">Decline</Text></Pressable></View>}{!mine && invite?.status !== "pending" && <View className="mt-2 flex-row items-center justify-between"><Text className="text-sm text-slate-500">You are {invite?.status}.</Text><Pressable onPress={() => setSelectedPlan(plan)} className="rounded-full bg-white px-3 py-1.5"><Text className="text-xs font-extrabold text-teal-700">Change RSVP</Text></Pressable></View>}</Pressable>; }) : <Text className="text-sm text-slate-500">No plans yet. Open a pin to schedule one.</Text>}<Text className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-wide text-slate-500">Requests</Text>{incomingRequests.length ? incomingRequests.map((request) => <View key={request.id} className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-100 p-3"><View><Text className="font-bold text-slate-900">{request.user.name}</Text><Text className="text-sm text-slate-500">@{request.user.username}</Text></View><Pressable onPress={() => acceptFriendRequest(request.id)} className="flex-row items-center rounded-xl bg-teal-700 px-3 py-2"><Check color="white" size={16} /><Text className="ml-1 font-bold text-white">Accept</Text></Pressable></View>) : <Text className="text-sm text-slate-500">No incoming requests.</Text>}<Text className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-wide text-slate-500">Your friends</Text>{friends.length ? friends.map((friend) => <Pressable key={friend.id} accessibilityLabel={`Open ${friend.name}'s profile`} onPress={() => void openFriendProfile(friend)} className="mb-2 flex-row items-center rounded-2xl bg-slate-100 p-3"><View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-teal-700">{friend.photoUri ? <NativeImage source={{ uri: friend.photoUri }} style={styles.friendAvatar} /> : <Text className="text-lg font-extrabold text-white">{friend.name.trim().slice(0, 1).toUpperCase()}</Text>}</View><View className="ml-3 flex-1"><Text className="font-bold text-slate-900">{friend.name}</Text><Text className="mt-0.5 text-sm text-slate-500">@{friend.username}</Text><Text className="mt-1 text-xs font-bold text-teal-700">View profile</Text></View><ChevronDown color="#94A3B8" size={18} style={{ transform: [{ rotate: "-90deg" }] }} /></Pressable>) : <Text className="text-sm text-slate-500">Add a friend to share Friends-only pins.</Text>}</ScrollView></KeyboardAvoidingView>{selectedPlan && <View style={StyleSheet.absoluteFillObject} className="justify-center bg-black/40 px-5"><View className="max-h-[88%] rounded-3xl bg-white p-5"><View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text className="text-2xl font-extrabold text-slate-900">{selectedPlan.spot?.name ?? "Place"}</Text><Text className="mt-2 text-sm font-bold text-teal-700">{new Date(selectedPlan.scheduledAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</Text><Text className="mt-1 text-sm text-slate-500">Hosted by @{selectedPlan.host?.username}</Text></View><Pressable onPress={() => setSelectedPlan(null)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View>{selectedPlan.spot && <><Text className="mt-2 text-sm text-slate-600">{selectedPlan.spot.address}</Text><View className="mt-4 overflow-hidden rounded-2xl" style={styles.planMap}><MapView initialRegion={{ latitude: selectedPlan.spot.latitude, longitude: selectedPlan.spot.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }} style={StyleSheet.absoluteFillObject} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={{ latitude: selectedPlan.spot.latitude, longitude: selectedPlan.spot.longitude }}><View style={[styles.marker, { backgroundColor: categoryColors[selectedPlan.spot.category] }]}><MapPin color="white" size={18} fill="white" /></View></Marker></MapView></View></>}<Text className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Who's going</Text><ScrollView showsVerticalScrollIndicator={false}>{selectedPlan.invites.map((invite) => <View key={invite.userId} className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-100 p-3"><Text className="font-bold text-slate-900">@{invite.user.username}</Text><Text className={`rounded-full px-3 py-1 text-xs font-extrabold ${invite.status === "accepted" ? "bg-emerald-100 text-emerald-700" : invite.status === "declined" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{invite.status}</Text></View>)}</ScrollView>{selectedPlan.hostId !== session.user.id && <View className="mt-3"><Text className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Your response</Text><View className="flex-row gap-2">{([["accepted", "Going"], ["maybe", "Maybe"], ["declined", "Not available"]] as const).map(([status, label]) => <Pressable key={status} onPress={() => void respondToPlan(selectedPlan.id, status)} className={`flex-1 rounded-xl py-3 ${selectedPlan.invites.find((invite) => invite.userId === session.user.id)?.status === status ? "bg-teal-700" : "bg-slate-100"}`}><Text className={`text-center text-xs font-extrabold ${selectedPlan.invites.find((invite) => invite.userId === session.user.id)?.status === status ? "text-white" : "text-slate-600"}`}>{label}</Text></Pressable>)}</View></View>}<Pressable onPress={() => selectedPlan.spot && getDirections(selectedPlan.spot)} className="mt-3 rounded-xl bg-slate-900 py-3"><Text className="text-center font-bold text-white">Directions</Text></Pressable>{selectedPlan.hostId === session.user.id && <Pressable onPress={() => deletePlan(selectedPlan)} className="mt-3 flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3"><Trash2 color="#E11D48" size={17} /><Text className="ml-2 font-bold text-rose-600">Delete plan</Text></Pressable>}</View></View>}</View></SafeAreaView></FriendsScreen>
    <Modal visible={isFriendProfileLoading || Boolean(selectedFriendProfile)} animationType="fade" transparent onRequestClose={() => { if (!isFriendProfileLoading) setSelectedFriendProfile(null); }}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[86%] rounded-t-[32px] bg-white px-5 pb-10 pt-4">
          {isFriendProfileLoading ? <View className="items-center py-12"><ActivityIndicator color="#0F766E" size="large" /><Text className="mt-4 text-sm font-bold text-slate-500">Opening profile…</Text></View> : selectedFriendProfile && <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-5 h-1.5 w-11 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center">
                <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-teal-100 bg-teal-700">{selectedFriendProfile.user.photoUri ? <NativeImage source={{ uri: selectedFriendProfile.user.photoUri }} style={styles.friendProfileAvatar} /> : <Text className="text-3xl font-extrabold text-white">{selectedFriendProfile.user.name.trim().slice(0, 1).toUpperCase()}</Text>}</View>
                <View className="ml-4"><Text className="text-2xl font-extrabold text-slate-900">{selectedFriendProfile.user.name}</Text><Text className="mt-1 text-base font-bold text-teal-700">@{selectedFriendProfile.user.username}</Text><Text className="mt-1 text-sm text-slate-500">Friend on Recs</Text></View>
              </View>
              <Pressable accessibilityLabel="Close friend profile" onPress={() => setSelectedFriendProfile(null)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable>
            </View>
            <View className="mt-6 flex-row rounded-2xl bg-slate-100 px-4 py-4">
              <View className="flex-1 items-center border-r border-slate-200"><Text className="text-xl font-extrabold text-slate-900">{selectedFriendProfile.locationCount}</Text><Text className="mt-1 text-xs font-bold text-slate-500">PINS</Text></View>
              <View className="flex-1 items-center"><Text className="text-xl font-extrabold text-slate-900">{selectedFriendProfile.friendCount}</Text><Text className="mt-1 text-xs font-bold text-slate-500">FRIENDS</Text></View>
            </View>
            <View className="mt-6 flex-row items-center justify-between"><Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Shared places</Text><Text className="text-xs font-bold text-teal-700">{selectedFriendProfile.locationCount} pinned</Text></View>
            {selectedFriendProfile.spots.length ? selectedFriendProfile.spots.map((spot) => <Pressable key={spot.id} onPress={() => { setSelectedFriendProfile(null); navigateToTab("map"); openSpot(spot); }} className="mt-3 flex-row items-center rounded-2xl bg-slate-100 p-3"><View style={[styles.friendSpotIcon, { backgroundColor: categoryColors[spot.category] }]}>{markerIcon(spot)}</View><View className="ml-3 flex-1"><Text numberOfLines={1} className="font-extrabold text-slate-900">{spot.name}</Text><Text numberOfLines={1} className="mt-1 text-sm text-slate-500">{spot.address}</Text><Text className="mt-1 text-xs font-bold text-teal-700">{spot.category} · {spot.personalRating}/5</Text></View><MapPin color="#0F766E" size={19} /></Pressable>) : <View className="mt-3 rounded-2xl bg-slate-100 p-4"><Text className="font-bold text-slate-800">No shared places yet</Text><Text className="mt-1 text-sm text-slate-500">Their friends-only recommendations will appear here.</Text></View>}
          </ScrollView>}
        </View>
      </View>
    </Modal>
    <ProfileScreen active={activeTab === "profile"} opacity={tabFade}><SafeAreaView edges={[]} style={{ paddingTop: tabTopInset }} className="flex-1 bg-white"><View className="flex-1 px-5 pt-5"><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-extrabold tracking-tight text-slate-900">Profile</Text><Text className="mt-1 text-sm text-slate-500">Your Recs account</Text></View><Pressable onPress={() => navigateToTab("map")} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><X color="#334155" size={20} /></Pressable></View><ScrollView className="mt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 148 }}><View className="rounded-3xl bg-teal-700 p-5 shadow-lg"><View className="flex-row items-center"><Pressable onPress={pickProfilePhoto} className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-teal-600">{profilePhotoUri ? <NativeImage source={{ uri: profilePhotoUri }} style={styles.profileAvatar} /> : <Text className="text-2xl font-extrabold text-white">{session.user.name.trim().slice(0, 1).toUpperCase()}</Text>}</Pressable><View className="ml-4 flex-1"><Text className="text-xl font-extrabold text-white">{session.user.name}</Text><Text className="mt-1 text-sm font-bold text-teal-100">@{session.user.username}</Text></View></View><View className="mt-5 flex-row border-t border-teal-500 pt-4"><View className="flex-1"><Text className="text-xl font-extrabold text-white">{savedSpots.length}</Text><Text className="mt-1 text-xs font-bold text-teal-100">Saved</Text></View><View className="flex-1"><Text className="text-xl font-extrabold text-white">{friends.length}</Text><Text className="mt-1 text-xs font-bold text-teal-100">Friends</Text></View><View className="flex-1"><Text className="text-xl font-extrabold text-white">{plans.length}</Text><Text className="mt-1 text-xs font-bold text-teal-100">Plans</Text></View></View></View><Text className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">Account</Text><View className="overflow-hidden rounded-3xl bg-white shadow-sm"><View className="border-b border-slate-100 px-5 py-4"><Text className="text-xs font-bold uppercase tracking-wide text-slate-400">Username</Text><Text className="mt-1 text-base font-bold text-slate-900">@{session.user.username}</Text></View><View className="px-5 py-4"><Text className="text-xs font-bold uppercase tracking-wide text-slate-400">Email address</Text><Text className="mt-1 text-base font-bold text-slate-900">{session.user.email}</Text></View></View><Text className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">Security</Text><Pressable onPress={() => { setProfileError(null); setIsPasswordOpen(true); }} className="rounded-2xl bg-white px-5 py-4 shadow-sm"><Text className="font-bold text-slate-900">Change password</Text><Text className="mt-1 text-sm text-slate-500">Use your current password to set a new one.</Text></Pressable><Text className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">Account actions</Text><Pressable onPress={() => { void onSignOut(); }} className="rounded-2xl bg-white py-4 shadow-sm"><Text className="text-center font-bold text-slate-700">Sign out</Text></Pressable><Pressable onPress={deleteProfile} className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 py-4"><Text className="text-center font-bold text-rose-600">Delete profile</Text></Pressable></ScrollView></View></SafeAreaView></ProfileScreen>
    <Modal visible={Boolean(selectedPlan) && activeTab !== "friends"} animationType="fade" transparent onRequestClose={() => setSelectedPlan(null)}>{selectedPlan && <View className="flex-1 justify-center bg-black/40 px-6"><View className="rounded-3xl bg-white p-5"><View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text className="text-2xl font-extrabold text-slate-900">Plan details</Text><Text className="mt-2 text-lg font-bold text-teal-700">{selectedPlan.spot?.name ?? "Place"}</Text><Text className="mt-1 text-sm text-slate-600">{new Date(selectedPlan.scheduledAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</Text><Text className="mt-1 text-sm text-slate-500">Hosted by @{selectedPlan.host?.username}</Text>{selectedPlan.spot && <><Text className="mt-2 text-sm text-slate-600">{selectedPlan.spot.address}</Text><View className="mt-4 overflow-hidden rounded-2xl" style={styles.planMap}><MapView initialRegion={{ latitude: selectedPlan.spot.latitude, longitude: selectedPlan.spot.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }} style={StyleSheet.absoluteFillObject} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false}><Marker coordinate={{ latitude: selectedPlan.spot.latitude, longitude: selectedPlan.spot.longitude }}><View style={[styles.marker, { backgroundColor: categoryColors[selectedPlan.spot.category] }]}><MapPin color="white" size={18} fill="white" /></View></Marker></MapView></View><Text className="mt-3 text-sm font-bold text-teal-700">{selectedPlan.invites.filter((invite) => invite.status === "accepted").length} accepted · {selectedPlan.invites.filter((invite) => invite.status === "pending").length} awaiting reply</Text></>}</View><Pressable onPress={() => setSelectedPlan(null)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View><Text className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Who is coming</Text>{selectedPlan.invites.map((invite) => <View key={invite.userId} className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-100 p-3"><View><Text className="font-bold text-slate-900">{invite.user.name}</Text><Text className="text-sm text-slate-500">@{invite.user.username}</Text></View><Text className={`rounded-full px-3 py-1 text-xs font-extrabold ${invite.status === "accepted" ? "bg-emerald-100 text-emerald-700" : invite.status === "declined" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{invite.status}</Text></View>)}{selectedPlan.hostId !== session.user.id && selectedPlan.invites.find((invite) => invite.userId === session.user.id)?.status === "pending" && <View className="mt-3 flex-row gap-2"><Pressable onPress={() => { void respondToPlan(selectedPlan.id, "accepted"); setSelectedPlan(null); }} className="flex-1 rounded-xl bg-teal-700 py-3"><Text className="text-center font-bold text-white">Accept</Text></Pressable><Pressable onPress={() => { void respondToPlan(selectedPlan.id, "declined"); setSelectedPlan(null); }} className="flex-1 rounded-xl border border-slate-300 py-3"><Text className="text-center font-bold text-slate-600">Decline</Text></Pressable></View>}{selectedPlan.hostId === session.user.id && <Pressable onPress={() => deletePlan(selectedPlan)} className="mt-3 flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3"><Trash2 color="#E11D48" size={17} /><Text className="ml-2 font-bold text-rose-600">Delete plan</Text></Pressable>}<View className="mt-3 flex-row gap-2"><Pressable onPress={() => selectedPlan.spot && getDirections(selectedPlan.spot)} className="flex-1 rounded-xl bg-slate-900 py-3"><Text className="text-center font-bold text-white">Directions</Text></Pressable><Pressable onPress={() => { if (selectedPlan.spot) { setSelectedPlan(null); navigateToTab("map"); openSpot(selectedPlan.spot); } }} className="flex-1 rounded-xl bg-slate-100 py-3"><Text className="text-center font-bold text-teal-700">View on map</Text></Pressable></View></View></View>}</Modal>
    <Modal visible={isPasswordOpen} animationType="fade" transparent onRequestClose={() => setIsPasswordOpen(false)}>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}>
        <ScrollView contentContainerStyle={styles.passwordModalContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="rounded-3xl bg-white p-5 shadow-xl">
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-slate-900">Change password</Text>
                <Text className="mt-1 text-sm text-slate-500">Use at least 8 characters.</Text>
              </View>
              <Pressable onPress={() => setIsPasswordOpen(false)} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><X size={20} color="#334155" /></Pressable>
            </View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current password</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" className="mb-4 rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900" textAlignVertical="center" returnKeyType="next" placeholder="Your current password" placeholderTextColor="#94a3b8" />
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">New password</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" className="rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900" textAlignVertical="center" returnKeyType="done" placeholder="Your new password" placeholderTextColor="#94a3b8" />
            {profileError ? <Text className="mt-3 text-sm font-semibold text-red-600">{profileError}</Text> : null}
            <Pressable onPress={changePassword} disabled={!currentPassword || newPassword.length < 8} className={`mt-5 items-center rounded-2xl py-4 ${currentPassword && newPassword.length >= 8 ? "bg-teal-700" : "bg-slate-300"}`}><Text className="text-base font-bold text-white">Update password</Text></Pressable>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const clusterMarkerStyle = { width: 48, height: 48, borderRadius: 24, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 4, borderColor: "white", backgroundColor: "#0F766E", elevation: 8, shadowColor: "#0F172A", shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } };
const styles = StyleSheet.create({ marker: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white", elevation: 7, shadowColor: "#0F172A", shadowOpacity: 0.24, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } }, tabPage: { ...StyleSheet.absoluteFillObject, zIndex: 4, paddingBottom: 74, backgroundColor: "white" }, keyboardAvoider: { flex: 1 }, spotSheetContent: { paddingHorizontal: 24, paddingBottom: 28 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }, addModalBackdrop: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 16, paddingTop: 92, paddingBottom: 94 }, addModalCardCompact: { maxHeight: "100%", overflow: "hidden", borderRadius: 24, backgroundColor: "white", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10 }, addModalCardExpanded: { flex: 1, overflow: "hidden", borderRadius: 24, backgroundColor: "white", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10 }, addModalContent: { paddingBottom: 28 }, passwordModalContent: { flexGrow: 1 }, profileAvatar: { width: "100%", height: "100%" }, friendAvatar: { width: "100%", height: "100%" }, friendProfileAvatar: { width: "100%", height: "100%" }, friendSpotIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, planMap: { height: 145, width: "100%" }, photoPreview: { width: "100%", height: 180 }, detailPhoto: { width: "100%", height: 110, marginTop: 10, borderWidth: 0, borderRadius: 16 }, cardPhoto: { width: "100%", height: "100%" }, searchAreaContainer: { position: "absolute", top: 278, left: 0, right: 0, zIndex: 4, alignItems: "center" }, locationButton: { position: "absolute", right: 18, bottom: 108, zIndex: 4, shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 }, bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, shadowColor: "#0F172A", shadowOpacity: 0.13, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 }, navAdd: { marginTop: -31 }, addLabel: { position: "absolute", bottom: -17, color: "#0F766E", fontSize: 10, fontWeight: "800" }, spotSheetContainer: { left: 12, right: 12 }, spotSheetCard: { borderRadius: 30, overflow: "hidden" }, sheet: { backgroundColor: "white", borderRadius: 30, shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -4 } }, handle: { backgroundColor: "#CBD5E1", width: 46, height: 5 } });
