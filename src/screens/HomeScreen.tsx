import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import {
  Bike,
  Bookmark,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Coffee,
  Compass,
  Croissant,
  Dumbbell,
  Film,
  Footprints,
  Gamepad2,
  Landmark,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Martini,
  Music2,
  Navigation,
  Palette,
  PartyPopper,
  PersonStanding,
  Plus,
  Salad,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Star,
  TreePine,
  Trash2,
  UserRound,
  UsersRound,
  Utensils,
  Waves,
  X,
} from "lucide-react-native";
import { ComponentProps, ElementType, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image as NativeImage,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  useWindowDimensions,
  View as RNView,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Category, Spot, User, Visibility } from "../data/mockData";
import { FriendsScreen } from "./FriendsScreen";
import { MapScreen } from "./MapScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SavedScreen } from "./SavedScreen";
import { useTheme } from "../theme";

type ThemedProps<T extends ElementType> = ComponentProps<T> & { className?: string };
const themedSurfaceColor = (className: string | undefined, colors: { surface: string; surfaceMuted: string }, isDark: boolean) => {
  const tokens = className?.split(/\s+/) ?? [];
  if (tokens.includes("bg-white")) return colors.surface;
  if (tokens.includes("bg-emerald-50") || tokens.includes("bg-teal-50")) return isDark ? "#153E3C" : "#DFF1EE";
  if (tokens.includes("bg-amber-50")) return isDark ? "#493616" : "#FFF1DC";
  if (tokens.includes("bg-rose-50")) return isDark ? "#4A2731" : "#FCE9ED";
  if (tokens.includes("bg-slate-50") || tokens.includes("bg-slate-100")) return colors.surfaceMuted;
  return undefined;
};
function View({ className, style, ...props }: ThemedProps<typeof RNView>) { const { isDark, colors } = useTheme(); const backgroundColor = themedSurfaceColor(className, colors, isDark); return <RNView {...props} className={className} style={[style, backgroundColor ? { backgroundColor } : undefined]} />; }
function Pressable({ className, style, ...props }: ThemedProps<typeof RNPressable>) { const { isDark, colors } = useTheme(); const backgroundColor = themedSurfaceColor(className, colors, isDark); return <RNPressable {...props} className={className} style={[style as never, backgroundColor ? { backgroundColor } : undefined]} />; }
function Text({ className, style, ...props }: ThemedProps<typeof RNText>) { const { colors } = useTheme(); const muted = className?.includes("text-slate-400") || className?.includes("text-slate-500") || className?.includes("text-slate-600"); return <RNText {...props} className={className} style={[style, className?.includes("text-slate") ? { color: muted ? colors.muted : colors.text } : undefined]} />; }
function TextInput({ className, style, ...props }: ThemedProps<typeof RNTextInput>) { const { colors } = useTheme(); return <RNTextInput {...props} className={className} style={[style, { color: colors.text, backgroundColor: colors.surfaceMuted }]} />; }

type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
};
type Plan = {
  id: string;
  scheduledAt: string;
  hostId: string;
  host: User;
  spot: Spot;
  invites: {
    userId: string;
    status: "pending" | "accepted" | "maybe" | "declined";
    user: User;
  }[];
};
type FriendProfile = {
  user: User;
  locationCount: number;
  friendCount: number;
  spots: Spot[];
};
type MapMode = "mine" | "friends";

const INITIAL_REGION: Region = {
  latitude: 51.5248,
  longitude: -0.0808,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};
const cleanMapStyle = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const categoryColors: Record<Category, string> = {
  Coffee: "#D97706",
  Restaurant: "#EA580C",
  Pub: "#7C3AED",
  "Cocktail Bar": "#9333EA",
  Bakery: "#DB2777",
  Brunch: "#F97316",
  Padel: "#059669",
  Tennis: "#16A34A",
  Football: "#22C55E",
  Gym: "#2563EB",
  Bouldering: "#2563EB",
  Yoga: "#DB2777",
  Pilates: "#EC4899",
  Running: "#0EA5E9",
  Cycling: "#0284C7",
  Swimming: "#06B6D4",
  Golf: "#65A30D",
  Cinema: "#DC2626",
  "Live Music": "#7C3AED",
  Theatre: "#C026D3",
  Museum: "#92400E",
  "Art Gallery": "#E11D48",
  Gaming: "#4F46E5",
  Shopping: "#DB2777",
  Market: "#CA8A04",
  Park: "#16A34A",
  Walk: "#65A30D",
  Wellness: "#14B8A6",
  Other: "#64748B",
};
const categories: Category[] = [
  "Coffee",
  "Restaurant",
  "Pub",
  "Cocktail Bar",
  "Bakery",
  "Brunch",
  "Padel",
  "Tennis",
  "Football",
  "Gym",
  "Bouldering",
  "Yoga",
  "Pilates",
  "Running",
  "Cycling",
  "Swimming",
  "Golf",
  "Cinema",
  "Live Music",
  "Theatre",
  "Museum",
  "Art Gallery",
  "Gaming",
  "Shopping",
  "Market",
  "Park",
  "Walk",
  "Wellness",
  "Other",
];
const popularCategories: Category[] = [
  "Coffee",
  "Restaurant",
  "Padel",
  "Tennis",
  "Gym",
  "Bouldering",
  "Cocktail Bar",
  "Live Music",
];
type MapFilter = Category;
type AppTab = "map" | "friends" | "saved" | "profile";
const calendarKey = (date: Date | string) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
type LocalPreferences = {
  defaultMapMode: MapMode;
  defaultVisibility: Visibility;
  directionsApp: "apple" | "google" | "ask";
  distanceUnit: "miles" | "kilometres";
  savedSort: "nearest" | "recent";
  mapStartup: "location" | "last";
  reminderHours: 0 | 1 | 24;
  timeFormat: "system" | "12h" | "24h";
  dateRegion: "system" | "uk" | "us";
};
const DEFAULT_PREFERENCES: LocalPreferences = { defaultMapMode: "mine", defaultVisibility: "private", directionsApp: "ask", distanceUnit: "miles", savedSort: "nearest", mapStartup: "location", reminderHours: 0, timeFormat: "system", dateRegion: "system" };

const categoryIcon = (category: Category, color = "white", size = 19) => {
  const props = { color, size, strokeWidth: 2.5 };
  if (category === "Coffee") return <Coffee {...props} />;
  if (["Restaurant", "Brunch"].includes(category))
    return <Utensils {...props} />;
  if (["Pub", "Cocktail Bar"].includes(category)) return <Martini {...props} />;
  if (category === "Bakery") return <Croissant {...props} />;
  if (["Padel", "Tennis", "Football", "Golf"].includes(category))
    return <CircleDot {...props} />;
  if (["Gym", "Bouldering"].includes(category)) return <Dumbbell {...props} />;
  if (["Yoga", "Pilates", "Wellness"].includes(category))
    return <PersonStanding {...props} />;
  if (category === "Running" || category === "Walk")
    return <Footprints {...props} />;
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

export function HomeScreen({
  session,
  onSignOut,
  onSessionUserUpdated,
}: {
  session: { token: string; user: User };
  onSignOut: () => Promise<void>;
  onSessionUserUpdated: (user: User) => Promise<void>;
}) {
  const { mode: themeMode, isDark, colors, setMode: setThemeMode } = useTheme();
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
  const [locationResults, setLocationResults] = useState<PlaceSearchResult[]>(
    [],
  );
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState(false);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const spotRequestRef = useRef<AbortController | null>(null);
  const spotRequestVersion = useRef(0);
  const lastSettledRegion = useRef<Region>(INITIAL_REGION);
  const movingRegion = useRef<Region>(INITIAL_REGION);
  const movementRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isFriendFeedbackOpen, setIsFriendFeedbackOpen] = useState(false);
  const [isUpdatingSharing, setIsUpdatingSharing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [discoverSpots, setDiscoverSpots] = useState<Spot[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const tabFade = useRef(new Animated.Value(1)).current;
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(
    session.user.photoUri ?? null,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAccountEditorOpen, setIsAccountEditorOpen] = useState(false);
  const [accountName, setAccountName] = useState(session.user.name);
  const [accountUsername, setAccountUsername] = useState(session.user.username);
  const [accountEmail, setAccountEmail] = useState(session.user.email);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"profile" | "preferences" | "privacy" | "security">("profile");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [preferences, setPreferences] = useState<LocalPreferences>(DEFAULT_PREFERENCES);
  const [friendRequestPolicy, setFriendRequestPolicy] = useState<"everyone" | "mutuals" | "nobody">("everyone");
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [blockUsername, setBlockUsername] = useState("");
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  );
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
  const [incomingRequests, setIncomingRequests] = useState<
    { id: string; user: User }[]
  >([]);
  const [selectedFriendProfile, setSelectedFriendProfile] =
    useState<FriendProfile | null>(null);
  const [isFriendProfileLoading, setIsFriendProfileLoading] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [savedSpots, setSavedSpots] = useState<Spot[]>([]);
  const [savedSort, setSavedSort] = useState<"nearest" | "recent">("nearest");
  const [savedCategory, setSavedCategory] = useState<Category | "All">("All");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlannerDate, setSelectedPlannerDate] = useState<string | null>(null);
  const [friendsView, setFriendsView] = useState<"plans" | "circle" | "requests">("plans");
  const upcomingPlans = plans.filter(
    (plan) => new Date(plan.scheduledAt).getTime() > Date.now(),
  );
  const plannerDays = Array.from({ length: 21 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
  const activePlannerDate = selectedPlannerDate ?? (upcomingPlans[0] ? calendarKey(upcomingPlans[0].scheduledAt) : calendarKey(new Date()));
  const selectedDayPlans = upcomingPlans.filter((plan) => calendarKey(plan.scheduledAt) === activePlannerDate);
  const activePlannerLabel = activePlannerDate === calendarKey(new Date()) ? "Today" : new Date(`${activePlannerDate}T12:00:00`).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
  const [scheduledAt, setScheduledAt] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000),
  );
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const { height: viewportHeight } = useWindowDimensions();
  const discoverPagerRef = useRef<ScrollView>(null);
  const visibleMapCategories = categories.filter((item) =>
    item.toLowerCase().includes(mapCategorySearch.trim().toLowerCase()),
  );
  const addCategoryMatches = categories.filter((item) =>
    item.toLowerCase().includes(addCategorySearch.trim().toLowerCase()),
  );
  const canShowMapPins = true;
  const visibleRecommendationCount = spots.reduce(
    (total, spot) => total + (spot.clusterCount ?? 1),
    0,
  );
  const discoverableSpots = discoverSpots.length ? discoverSpots : spots.filter((spot) => !spot.isCluster);
  const discoverPageHeight = viewportHeight - 112;
  const filteredSavedSpots = savedSpots
    .filter(
      (spot) => savedCategory === "All" || spot.category === savedCategory,
    )
    .sort((first, second) => {
      if (savedSort === "recent" || !userLocation) return 0;
      const firstDistance =
        (first.latitude - userLocation.latitude) ** 2 +
        (first.longitude - userLocation.longitude) ** 2;
      const secondDistance =
        (second.latitude - userLocation.latitude) ** 2 +
        (second.longitude - userLocation.longitude) ** 2;
      return firstDistance - secondDistance;
    });
  const distanceLabel = (spot: Spot) => {
    if (!userLocation) return null;
    const latitudeRadians = (userLocation.latitude * Math.PI) / 180;
    const spotLatitudeRadians = (spot.latitude * Math.PI) / 180;
    const deltaLatitude = ((spot.latitude - userLocation.latitude) * Math.PI) / 180;
    const deltaLongitude = ((spot.longitude - userLocation.longitude) * Math.PI) / 180;
    const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitudeRadians) * Math.cos(spotLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;
    const kilometres = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const value = preferences.distanceUnit === "miles" ? kilometres * 0.621371 : kilometres;
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${preferences.distanceUnit === "miles" ? "mi" : "km"}`;
  };
  const formatPlanDate = (value: Date | string, dateStyle: "medium" | "full" = "medium") =>
    new Date(value).toLocaleString(preferences.dateRegion === "uk" ? "en-GB" : preferences.dateRegion === "us" ? "en-US" : undefined, {
      dateStyle,
      timeStyle: "short",
      ...(preferences.timeFormat === "system" ? {} : { hour12: preferences.timeFormat === "12h" }),
    });

  const loadSpots = useCallback(
    async (nextRegion: Region, mode: MapMode) => {
      if (!API_BASE_URL) return;
      spotRequestRef.current?.abort();
      const controller = new AbortController();
      spotRequestRef.current = controller;
      const requestVersion = ++spotRequestVersion.current;
      const query = new URLSearchParams({
        mode,
        latitude: String(nextRegion.latitude),
        longitude: String(nextRegion.longitude),
        latitudeDelta: String(nextRegion.latitudeDelta),
        longitudeDelta: String(nextRegion.longitudeDelta),
        cluster: "1",
        filters: mapFilters.join(","),
      });
      try {
        const response = await fetch(`${API_BASE_URL}/api/spots?${query}`, {
          headers: { Authorization: `Bearer ${session.token}` },
          signal: controller.signal,
        });
        if (!response.ok || requestVersion !== spotRequestVersion.current)
          return;
        const saved: Spot[] = await response.json();
        const nextSpots = saved.map((spot) => ({
          ...spot,
          category: categoryColors[spot.category as Category]
            ? (spot.category as Category)
            : "Other",
          personalRating: Math.min(5, spot.personalRating ?? 4),
          description: spot.description ?? spot.note ?? "",
          photoUri: spot.photoUri ?? null,
          communityRating: spot.communityRating ?? null,
          communityRatingCount: spot.communityRatingCount ?? 0,
          comments: spot.comments ?? [],
        }));
        setSpots((current) =>
          current.length === nextSpots.length &&
          current.every(
            (spot, index) =>
              spot.id === nextSpots[index]?.id &&
              spot.clusterCount === nextSpots[index]?.clusterCount &&
              spot.latitude === nextSpots[index]?.latitude &&
              spot.longitude === nextSpots[index]?.longitude,
          )
            ? current
            : nextSpots,
        );
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") {
          /* Keep the last responsive marker set while the request retries. */
        }
      }
    },
    [mapFilters, session.token],
  );

  const openDiscover = async () => {
    setDiscoverIndex(0);
    setIsDiscoverOpen(true);
    if (!API_BASE_URL) return;
    setIsDiscoverLoading(true);
    const params = new URLSearchParams({ mode: mapMode, latitude: String(region.latitude), longitude: String(region.longitude), latitudeDelta: String(region.latitudeDelta), longitudeDelta: String(region.longitudeDelta), cluster: "0", filters: mapFilters.join(",") });
    try {
      const response = await fetch(`${API_BASE_URL}/api/spots?${params}`, { headers: { Authorization: `Bearer ${session.token}` } });
      if (!response.ok) return;
      const data: Spot[] = await response.json();
      setDiscoverSpots(data.map((spot) => ({ ...spot, category: categoryColors[spot.category as Category] ? spot.category as Category : "Other", personalRating: Math.min(5, spot.personalRating ?? 4), description: spot.description ?? spot.note ?? "", photoUri: spot.photoUri ?? null, communityRating: spot.communityRating ?? null, communityRatingCount: spot.communityRatingCount ?? 0, comments: spot.comments ?? [] })));
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  useEffect(() => {
    if (!canShowMapPins) return;
    const timeout = setTimeout(() => void loadSpots(region, mapMode), 260);
    return () => clearTimeout(timeout);
  }, [canShowMapPins, loadSpots, mapMode, mapFilters, region]);

  const loadFriends = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/friends`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (response.ok) {
      const data = await response.json();
      setFriends(data.friends);
      setIncomingRequests(data.incoming);
    }
  };

  useEffect(() => {
    void loadFriends();
  }, [session.token]);

  const loadSaved = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/saved`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (response.ok) setSavedSpots(await response.json());
  };

  useEffect(() => {
    void loadSaved();
  }, [session.token]);

  const loadPlans = async () => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/plans`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (response.ok) setPlans(await response.json());
  };

  useEffect(() => {
    void loadPlans();
  }, [session.token]);

  useEffect(() => {
    SecureStore.getItemAsync(`recs-settings-${session.user.id}`)
      .then((saved) => {
        if (!saved) return;
        const settings = JSON.parse(saved) as { notifications?: boolean; haptics?: boolean };
        if (typeof settings.notifications === "boolean") setNotificationsEnabled(settings.notifications);
        if (typeof settings.haptics === "boolean") setHapticsEnabled(settings.haptics);
      })
      .catch(() => undefined);
  }, [session.user.id]);

  useEffect(() => {
    SecureStore.getItemAsync(`recs-preferences-${session.user.id}`).then((saved) => {
      const next = saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
      setPreferences(next);
      setMapMode(next.defaultMapMode);
      setVisibility(next.defaultVisibility);
    }).catch(() => undefined);
  }, [session.user.id]);

  useEffect(() => {
    if (preferences.mapStartup !== "last") return;
    SecureStore.getItemAsync(`recs-last-map-region-${session.user.id}`).then((saved) => {
      if (!saved) return;
      const next = JSON.parse(saved) as Region;
      if (![next.latitude, next.longitude, next.latitudeDelta, next.longitudeDelta].every(Number.isFinite)) return;
      lastSettledRegion.current = next;
      setRegion(next);
      requestAnimationFrame(() => mapRef.current?.animateToRegion(next, 0));
    }).catch(() => undefined);
  }, [preferences.mapStartup, session.user.id]);

  useEffect(() => {
    void SecureStore.setItemAsync(`recs-preferences-${session.user.id}`, JSON.stringify(preferences));
    setSavedSort(preferences.savedSort);
  }, [preferences, session.user.id]);

  const updatePreference = <K extends keyof LocalPreferences>(key: K, value: LocalPreferences[K]) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    void SecureStore.setItemAsync(
      `recs-settings-${session.user.id}`,
      JSON.stringify({ notifications: notificationsEnabled, haptics: hapticsEnabled }),
    );
  }, [notificationsEnabled, hapticsEnabled, session.user.id]);

  const loadPrivacy = async () => {
    if (!API_BASE_URL) return;
    const headers = { Authorization: `Bearer ${session.token}` };
    const [privacyResponse, blocksResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/me/privacy`, { headers }),
      fetch(`${API_BASE_URL}/api/me/blocks`, { headers }),
    ]);
    if (privacyResponse.ok) setFriendRequestPolicy((await privacyResponse.json()).friendRequestPolicy);
    if (blocksResponse.ok) setBlockedUsers(await blocksResponse.json());
  };
  useEffect(() => { void loadPrivacy(); }, [session.token]);

  const saveFriendRequestPolicy = async (policy: "everyone" | "mutuals" | "nobody") => {
    setFriendRequestPolicy(policy);
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/me/privacy`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ friendRequestPolicy: policy }) });
    if (!response.ok) { setPrivacyError("Could not save your privacy preference."); void loadPrivacy(); }
  };
  const blockUser = async () => {
    if (!API_BASE_URL || !blockUsername.trim()) return;
    setPrivacyError(null);
    const response = await fetch(`${API_BASE_URL}/api/me/blocks`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ username: blockUsername }) });
    const result = await response.json();
    if (!response.ok) { setPrivacyError(result.error ?? "Could not block that account."); return; }
    setBlockUsername(""); await loadPrivacy(); await loadFriends();
  };
  const unblockUser = async (userId: string) => {
    if (!API_BASE_URL) return;
    await fetch(`${API_BASE_URL}/api/me/blocks/${encodeURIComponent(userId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } });
    await loadPrivacy();
  };

  useEffect(
    () => () => {
      spotRequestRef.current?.abort();
      if (movementRefreshTimer.current)
        clearTimeout(movementRefreshTimer.current);
    },
    [],
  );

  const navigateToTab = (nextTab: AppTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    if (nextTab !== "map") setSelectedSpot(null);
    if (nextTab === "friends") {
      void loadFriends();
      void loadPlans();
    }
    if (nextTab === "saved") void loadSaved();
    tabFade.stopAnimation();
    tabFade.setValue(1);
  };
  const selectionHaptic = () => {
    if (hapticsEnabled) void Haptics.selectionAsync();
  };
  const successHaptic = () => {
    if (hapticsEnabled)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openSpot = useCallback((spot: Spot) => {
    setMapMode(spot.userId === session.user.id ? "mine" : "friends");
    setSelectedSpot(spot);
    setIsTopBarCollapsed(true);
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackPhotoUri(null);
    setIsFriendFeedbackOpen(false);
    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
    mapRef.current?.animateToRegion(
      {
        latitude: spot.latitude - 0.0038,
        longitude: spot.longitude,
        latitudeDelta: 0.014,
        longitudeDelta: 0.014,
      },
      280,
    );
  }, [session.user.id]);

  const submitSpotFeedback = async () => {
    if (!API_BASE_URL || !selectedSpot || feedbackRating === null) return;
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/spots/${encodeURIComponent(selectedSpot.id)}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            rating: feedbackRating,
            comment: feedbackComment,
            photoUri: feedbackPhotoUri,
          }),
        },
      );
      const body = (await response.json()) as Spot & { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "Could not save your feedback.");
      setSelectedSpot(body);
      setSpots((current) =>
        current.map((spot) => (spot.id === body.id ? body : spot)),
      );
      setSavedSpots((current) =>
        current.map((spot) => (spot.id === body.id ? body : spot)),
      );
      setFeedbackRating(null);
      setFeedbackComment("");
      setFeedbackPhotoUri(null);
    } catch (reason) {
      Alert.alert(
        "Could not save feedback",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const updateSpotVisibility = async (nextVisibility: Visibility) => {
    if (!API_BASE_URL || !selectedSpot || selectedSpot.visibility === nextVisibility) return;
    setIsUpdatingSharing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/spots/${encodeURIComponent(selectedSpot.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({ visibility: nextVisibility }),
        },
      );
      const body = (await response.json()) as Spot & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not update sharing.");
      setSelectedSpot(body);
      setSpots((current) => current.map((spot) => (spot.id === body.id ? body : spot)));
      setSavedSpots((current) => current.map((spot) => (spot.id === body.id ? body : spot)));
    } catch (reason) {
      Alert.alert("Could not update sharing", reason instanceof Error ? reason.message : "Please try again.");
    } finally {
      setIsUpdatingSharing(false);
    }
  };

  const zoomIntoCluster = useCallback((cluster: Spot) => {
    const currentRegion = lastSettledRegion.current;
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: Math.max(currentRegion.latitudeDelta * 0.42, 0.0015),
        longitudeDelta: Math.max(currentRegion.longitudeDelta * 0.42, 0.0015),
      },
      320,
    );
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
    const centreMoved =
      Math.abs(nextRegion.latitude - previous.latitude) >
        Math.max(nextRegion.latitudeDelta * 0.12, 0.0015) ||
      Math.abs(nextRegion.longitude - previous.longitude) >
        Math.max(nextRegion.longitudeDelta * 0.12, 0.0015);
    const zoomChanged =
      Math.abs(nextRegion.latitudeDelta - previous.latitudeDelta) /
        previous.latitudeDelta >
      0.12;
    if (centreMoved || zoomChanged) {
      lastSettledRegion.current = nextRegion;
      setRegion(nextRegion);
      void SecureStore.setItemAsync(`recs-last-map-region-${session.user.id}`, JSON.stringify(nextRegion));
    }
  }, [session.user.id]);

  const searchPlaces = async () => {
    if (!API_BASE_URL) {
      setError("Set EXPO_PUBLIC_API_URL in .env and restart Expo.");
      return;
    }
    if (query.trim().length < 3) {
      setError("Enter at least three characters.");
      return;
    }
    Keyboard.dismiss();
    setIsSearching(true);
    setError(null);
    setResults([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/places/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ query }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Venue search failed.");
      setResults(body);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Venue search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const searchMapLocation = async () => {
    if (!API_BASE_URL || discoveryQuery.trim().length < 3) return;
    Keyboard.dismiss();
    setIsLocationSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/places/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          query: discoveryQuery.trim(),
          latitude: region.latitude,
          longitude: region.longitude,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Location search failed.");
      const matches = body as PlaceSearchResult[];
      setLocationResults(matches);
    } catch (reason) {
      Alert.alert(
        "Could not find that location",
        reason instanceof Error ? reason.message : "Try another location.",
      );
    } finally {
      setIsLocationSearching(false);
    }
  };

  const selectMapLocation = (place: PlaceSearchResult) => {
    const nextRegion = {
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.028,
      longitudeDelta: 0.028,
    };
    lastSettledRegion.current = nextRegion;
    setRegion(nextRegion);
    setDiscoveryQuery(place.name);
    setLocationResults([]);
    mapRef.current?.animateToRegion(nextRegion, 360);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission needed",
        "Allow access to choose a venue photo.",
      );
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (!selection.canceled)
      setPhotoUris((current) =>
        [...current, ...selection.assets.map((asset) => asset.uri)].slice(0, 5),
      );
  };

  const pickFeedbackPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "Allow access to choose a photo.");
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!selection.canceled) setFeedbackPhotoUri(selection.assets[0].uri);
  };

  const savePlace = async (place: PlaceSearchResult) => {
    if (!API_BASE_URL) return;
    const trimmedDescription = description.trim();
    if (personalRating === null) {
      setError("Choose your rating out of 5.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/spots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          place,
          category,
          personalRating,
          description: trimmedDescription,
          photoUris,
          visibility,
        }),
      });
      const saved = (await response.json()) as Spot & { error?: string };
      if (!response.ok)
        throw new Error(saved.error ?? "Could not save the pin.");
      setSpots((current) => [
        saved,
        ...current.filter((spot) => spot.id !== saved.id),
      ]);
      setIsAddOpen(false);
      setQuery("");
      setResults([]);
      setSelectedPlace(null);
      setDescription("");
      setPhotoUris([]);
      setPersonalRating(null);
      setVisibility(preferences.defaultVisibility);
      setTimeout(() => openSpot(saved), 50);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save the pin.",
      );
    }
  };

  const sendFriendRequest = async () => {
    if (!API_BASE_URL || !friendUsername.trim()) return;
    setFriendError(null);
    const response = await fetch(`${API_BASE_URL}/api/friends/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ username: friendUsername }),
    });
    const body = await response.json();
    if (!response.ok) {
      setFriendError(body.error ?? "Could not send request.");
      return;
    }
    setFriendUsername("");
    setFriendError("Friend request sent.");
    successHaptic();
    await loadFriends();
  };

  const acceptFriendRequest = async (id: string) => {
    if (!API_BASE_URL) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/friends/requests/${id}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.error ?? "Could not accept friend request.");
      const accepted = incomingRequests.find((request) => request.id === id);
      setIncomingRequests((current) =>
        current.filter((request) => request.id !== id),
      );
      if (accepted)
        setFriends((current) =>
          current.some((friend) => friend.id === accepted.user.id)
            ? current
            : [...current, accepted.user],
        );
      setFriendError(
        `You and @${accepted?.user.username ?? "your friend"} are now connected.`,
      );
      successHaptic();
      await loadFriends();
    } catch (reason) {
      Alert.alert(
        "Could not accept request",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    }
  };

  const openFriendProfile = async (friend: User) => {
    if (!API_BASE_URL) return;
    setIsFriendProfileLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/friends/${encodeURIComponent(friend.id)}/profile`,
        { headers: { Authorization: `Bearer ${session.token}` } },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not open this profile.");
      setSelectedFriendProfile(body);
    } catch (reason) {
      Alert.alert(
        "Friend profile",
        reason instanceof Error
          ? reason.message
          : "Could not open this profile.",
      );
    } finally {
      setIsFriendProfileLoading(false);
    }
  };

  const toggleSaved = async (spot: Spot) => {
    if (!API_BASE_URL) return;
    const isSaved = savedSpots.some((saved) => saved.id === spot.id);
    const response = await fetch(
      `${API_BASE_URL}/api/saved/${encodeURIComponent(spot.id)}`,
      {
        method: isSaved ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      },
    );
    if (response.ok) {
      successHaptic();
      await loadSaved();
    }
  };

  const deleteSpot = (spot: Spot) =>
    Alert.alert(
      "Delete pin?",
      `Remove ${spot.name} and any plans linked to it?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!API_BASE_URL) return;
            const response = await fetch(
              `${API_BASE_URL}/api/spots/${encodeURIComponent(spot.id)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.token}` },
              },
            );
            if (response.ok) {
              sheetRef.current?.close();
              setSpots((current) =>
                current.filter((item) => item.id !== spot.id),
              );
              setSavedSpots((current) =>
                current.filter((item) => item.id !== spot.id),
              );
              await loadPlans();
            }
          },
        },
      ],
    );
  const deleteProfile = () =>
    Alert.alert(
      "Delete profile permanently?",
      "This removes your account, pins, saved places, friendships and plans. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete profile",
          style: "destructive",
          onPress: async () => {
            if (!API_BASE_URL) return;
            const response = await fetch(`${API_BASE_URL}/api/me`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${session.token}` },
            });
            if (response.ok) {
              await onSignOut();
            } else Alert.alert("Could not delete profile", "Please try again.");
          },
        },
      ],
    );
  const updateProfilePhoto = async (photoUri: string | null) => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ photoUri }),
    });
    const body = await response.json();
    if (!response.ok) {
      Alert.alert("Could not update photo", body.error ?? "Please try again.");
      return;
    }
    setProfilePhotoUri(body.photoUri ?? null);
  };
  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission needed",
        "Allow access to choose a profile photo.",
      );
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!selection.canceled) await updateProfilePhoto(selection.assets[0].uri);
  };
  const changePassword = async () => {
    if (!API_BASE_URL) return;
    setProfileError(null);
    const response = await fetch(`${API_BASE_URL}/api/me/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setProfileError(body.error ?? "Could not update password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setIsPasswordOpen(false);
    Alert.alert("Password updated", "Your new password is now active.");
  };
  const saveAccountDetails = async () => {
    if (!API_BASE_URL) return;
    setProfileError(null);
    setIsSavingAccount(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ name: accountName, username: accountUsername, email: accountEmail }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not update your details.");
      await onSessionUserUpdated(body);
      setIsAccountEditorOpen(false);
      Alert.alert("Account updated", "Your details have been saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not update your details.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const openSchedule = () => {
    setInviteeIds([]);
    setPlanError(null);
    setScheduledAt(new Date(Date.now() + 60 * 60 * 1000));
    setIsScheduleOpen(true);
  };
  const schedulePlanReminder = async (spotName: string, date: Date) => {
    if (!notificationsEnabled || preferences.reminderHours === 0) return;
    const triggerDate = new Date(date.getTime() - preferences.reminderHours * 60 * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) return;
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Plan reminder", body: `${spotName} is coming up soon.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  };
  const createPlan = async () => {
    if (!API_BASE_URL || !selectedSpot) return;
    setPlanError(null);
    const response = await fetch(`${API_BASE_URL}/api/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        spotId: selectedSpot.id,
        scheduledAt: scheduledAt.toISOString(),
        inviteeIds,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setPlanError(body.error ?? "Could not create plan.");
      return;
    }
    setIsScheduleOpen(false);
    await schedulePlanReminder(selectedSpot.name, scheduledAt);
    await loadPlans();
  };
  const respondToPlan = async (
    id: string,
    status: "accepted" | "maybe" | "declined",
  ) => {
    if (!API_BASE_URL) return;
    const response = await fetch(`${API_BASE_URL}/api/plans/${id}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      Alert.alert(
        "Could not update RSVP",
        body.error ?? "Please restart the local server and try again.",
      );
      return;
    }
    setSelectedPlan((current) =>
      current?.id === id
        ? {
            ...current,
            invites: current.invites.map((invite) =>
              invite.userId === session.user.id
                ? { ...invite, status }
                : invite,
            ),
          }
        : current,
    );
    successHaptic();
    await loadPlans();
  };
  const deletePlan = (plan: Plan) =>
    Alert.alert("Delete plan?", "Everyone invited will lose this plan.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!API_BASE_URL) return;
          const response = await fetch(`${API_BASE_URL}/api/plans/${plan.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (response.ok) {
            setSelectedPlan(null);
            await loadPlans();
          }
        },
      },
    ]);
  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) {
      setPickerMode(null);
      return;
    }
    const next = new Date(scheduledAt);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    if (pickerMode === "date") {
      setScheduledAt(next);
      setPickerMode("time");
    } else {
      next.setHours(date.getHours(), date.getMinutes());
      setScheduledAt(next);
      setPickerMode(null);
    }
  };

  const centerOnUser = () =>
    userLocation
      ? mapRef.current?.animateToRegion(
          { ...userLocation, latitudeDelta: 0.014, longitudeDelta: 0.014 },
          350,
        )
      : Alert.alert(
          "Finding your location",
          "Allow location access, then tap again.",
        );
  const handleUserLocationChange = (event: {
    nativeEvent: { coordinate?: { latitude: number; longitude: number } };
  }) => {
    const coordinate = event.nativeEvent.coordinate;
    if (!coordinate) return;
    setUserLocation(coordinate);
    if (hasCenteredOnInitialLocation.current || preferences.mapStartup === "last") return;
    hasCenteredOnInitialLocation.current = true;
    const nextRegion = {
      ...coordinate,
      latitudeDelta: 0.014,
      longitudeDelta: 0.014,
    };
    lastSettledRegion.current = nextRegion;
    setRegion(nextRegion);
    requestAnimationFrame(() =>
      mapRef.current?.animateToRegion(nextRegion, 420),
    );
  };
  const openDirections = async (spot: Spot, provider: "apple" | "google") => {
    const destination = `${spot.latitude},${spot.longitude}`;
    const url = provider === "google"
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
      : `http://maps.apple.com/?daddr=${destination}&dirflg=d`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Could not open maps",
        "Install or enable a maps app and try again.",
      );
    }
  };
  const getDirections = (spot: Spot) => {
    if (preferences.directionsApp === "ask") {
      Alert.alert("Open directions in", spot.name, [
        { text: "Apple Maps", onPress: () => void openDirections(spot, "apple") },
        { text: "Google Maps", onPress: () => void openDirections(spot, "google") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    void openDirections(spot, preferences.directionsApp);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MapScreen active={activeTab === "map"} opacity={tabFade}>
        <MapView
          ref={mapRef}
          initialRegion={region}
          style={StyleSheet.absoluteFillObject}
          mapType="standard"
          userInterfaceStyle={isDark ? "dark" : "light"}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          customMapStyle={cleanMapStyle}
          moveOnMarkerPress={false}
          toolbarEnabled={false}
          onRegionChange={handleMapMovement}
          onRegionChangeComplete={handleMapRegionChange}
          onUserLocationChange={handleUserLocationChange}
        >
          {spots.map((spot) =>
            spot.isCluster ? (
              <Marker
                key={spot.id}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
                tracksViewChanges={false}
                onPress={() => zoomIntoCluster(spot)}
              >
                <View style={clusterMarkerStyle}>
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-white">
                    {spot.clusterCount && spot.clusterCount > 99
                      ? "99+"
                      : spot.clusterCount}
                  </Text>
                </View>
              </Marker>
            ) : (
              <Marker
                key={spot.id}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
                tracksViewChanges={false}
                onPress={() => openSpot(spot)}
              >
                <View
                  style={[
                    styles.marker,
                    { backgroundColor: categoryColors[spot.category] },
                  ]}
                >
                  {markerIcon(spot)}
                </View>
              </Marker>
            ),
          )}
        </MapView>

        <SafeAreaView
          edges={["top"]}
          style={styles.mapHeaderSafeArea}
          className="items-center pt-2"
        >
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="w-[80%] rounded-3xl border px-3 py-2 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View className="mr-2 flex-1">
                <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-slate-900">
                  Recs
                </Text>
                {!isTopBarCollapsed && (
                  <Text style={isDark ? { color: colors.text } : undefined} numberOfLines={1} className="text-xs text-slate-500">
                    Explore nearby places.
                  </Text>
                )}
              </View>
              <View className="flex-row flex-shrink-0 items-center">
                <View className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-bold text-emerald-700">
                    {visibleRecommendationCount} Recs nearby
                  </Text>
                </View>
                <Pressable onPress={() => navigateToTab("profile")} style={{ backgroundColor: colors.surfaceMuted }} className="ml-1 h-8 w-8 items-center justify-center rounded-full">
                  <SettingsIcon color={colors.icon} size={16} />
                </Pressable>
                <Pressable
                  onPress={() => setIsTopBarCollapsed((current) => !current)}
                  className="ml-1 rounded-full bg-slate-100 p-1.5"
                >
                  {isTopBarCollapsed ? (
                    <ChevronDown color="#475569" size={17} />
                  ) : (
                    <ChevronUp color="#475569" size={17} />
                  )}
                </Pressable>
              </View>
            </View>
            {!isTopBarCollapsed && (
              <View>
                <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-3 flex-row rounded-2xl bg-slate-100 p-1">
                  {(["mine", "friends"] as MapMode[]).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setMapMode(mode)}
                      className={`flex-1 rounded-xl py-2.5 ${mapMode === mode ? "bg-white" : ""}`}
                    >
                      <Text style={isDark ? { color: colors.text } : undefined}
                        className={`text-center text-xs font-extrabold ${mapMode === mode ? "text-teal-700" : "text-slate-500"}`}
                      >
                        {mode === "mine" ? "Mine" : "Friends"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-3 flex-row items-center rounded-2xl border border-slate-100 bg-slate-50 px-3">
                  <Search color="#64748B" size={18} />
                  <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                    value={discoveryQuery}
                    onChangeText={(value) => {
                      setDiscoveryQuery(value);
                      setLocationResults([]);
                    }}
                    onSubmitEditing={searchMapLocation}
                    placeholder="Search for a place, e.g. Pizza Hut"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="search"
                    className="ml-2 flex-1 py-3 text-sm text-slate-900"
                  />
                  {discoveryQuery.length > 0 && (
                    <Pressable
                      onPress={() => {
                        setDiscoveryQuery("");
                        setLocationResults([]);
                      }}
                    >
                      <X color="#64748B" size={18} />
                    </Pressable>
                  )}
                </View>
                {locationResults.length > 0 && (
                  <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {locationResults.map((place) => (
                      <Pressable
                        key={place.placeId}
                        onPress={() => selectMapLocation(place)}
                        className="flex-row items-center border-b border-slate-100 px-3 py-3 last:border-b-0"
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                          <MapPin color="#0F766E" size={18} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text style={isDark ? { color: colors.text } : undefined} numberOfLines={1} className="text-sm font-extrabold text-slate-900">
                            {place.name}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 text-xs text-slate-500">
                            {place.address}
                          </Text>
                        </View>
                        <ChevronDown color="#64748B" size={16} style={{ transform: [{ rotate: "-90deg" }] }} />
                      </Pressable>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={() => setIsCategoryPickerOpen((current) => !current)}
                  className="mt-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <View className="flex-row items-center">
                    <CircleDot color="#0F766E" size={17} />
                    <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 text-sm font-extrabold text-slate-700">
                      Categories
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text style={isDark ? { color: colors.text } : undefined} className="mr-1 text-xs font-bold text-teal-700">
                      {mapFilters.length
                        ? `${mapFilters.length} selected`
                        : "All"}
                    </Text>
                    <ChevronDown color="#0F766E" size={17} />
                  </View>
                </Pressable>
                {isCategoryPickerOpen && (
                  <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-2 max-h-72 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-lg">
                    <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                      value={mapCategorySearch}
                      onChangeText={setMapCategorySearch}
                      placeholder="Search any category"
                      placeholderTextColor="#94A3B8"
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-base text-slate-900"
                    />
                    <Pressable
                      onPress={() => setMapFilters([])}
                      className="mt-2 rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-bold text-slate-700">
                        All categories
                      </Text>
                    </Pressable>
                    <ScrollView
                      className="mt-1"
                      style={styles.mapCategoryList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {visibleMapCategories.map((category) => (
                        <Pressable
                          key={category}
                          onPress={() =>
                            setMapFilters((current) =>
                              current.includes(category)
                                ? current.filter((item) => item !== category)
                                : [...current, category],
                            )
                          }
                          className={`mt-1 flex-row items-center rounded-xl px-3 py-2.5 ${mapFilters.includes(category) ? "bg-teal-50" : "bg-slate-50"}`}
                        >
                          <View
                            className="h-7 w-7 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: categoryColors[category],
                            }}
                          >
                            {categoryIcon(category, "white", 14)}
                          </View>
                          <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 text-sm font-bold text-slate-700">
                            {category}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
        {!selectedSpot && (
          <Pressable
            accessibilityLabel="Center map on my location"
            onPress={centerOnUser}
            style={styles.locationButton}
            className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg"
          >
            <LocateFixed color="#0F766E" size={22} />
          </Pressable>
        )}

        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={
            selectedSpot?.photos?.length || selectedSpot?.photoUri
              ? ["82%", "90%"]
              : ["60%", "85%"]
          }
          enablePanDownToClose
          keyboardBehavior="interactive"
          bottomInset={72}
          containerStyle={styles.spotSheetContainer}
          style={styles.spotSheetCard}
          backgroundStyle={[styles.sheet, { backgroundColor: colors.surface }]}
          handleIndicatorStyle={styles.handle}
          onClose={() => setSelectedSpot(null)}
        >
          {selectedSpot && (
            <BottomSheetScrollView
              contentContainerStyle={styles.spotSheetContent}
            >
              {selectedSpot.userId !== session.user.id ? (
                <>
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <View className="flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: categoryColors[selectedSpot.category] }}>{categoryIcon(selectedSpot.category, "white", 18)}</View><View className="ml-3 flex-1"><Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-slate-900">{selectedSpot.name}</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-sm text-slate-500">{selectedSpot.address}</Text></View></View>
                    </View>
                    <View className="rounded-full bg-slate-900 px-3 py-2"><Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-bold text-white">{selectedSpot.personalRating}/5</Text></View>
                  </View>
                  {(selectedSpot.photos?.[0]?.uri || selectedSpot.photoUri) && <NativeImage source={{ uri: selectedSpot.photos?.[0]?.uri ?? selectedSpot.photoUri ?? "" }} style={styles.friendDetailPhoto} />}
                  <View className="mt-4 rounded-2xl bg-teal-50 p-4"><View className="flex-row items-center justify-between"><Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-teal-700">@{selectedSpot.pinnedBy.replace(/^@/, "")} recommends</Text><Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-bold text-teal-700">{selectedSpot.category}</Text></View><Text style={isDark ? { color: colors.text } : undefined} className="mt-2 text-base leading-6 text-slate-800">{selectedSpot.description || "No note added yet."}</Text></View>
                  <View className="mt-3 flex-row gap-3"><Pressable onPress={() => getDirections(selectedSpot)} className="flex-1 flex-row items-center justify-center rounded-2xl bg-slate-900 py-3.5"><Navigation color="white" size={18} /><Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-white">Directions</Text></Pressable><Pressable onPress={() => toggleSaved(selectedSpot)} className={`flex-row items-center justify-center rounded-2xl px-4 ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "bg-amber-400" : "bg-slate-100"}`}><Bookmark color={savedSpots.some((spot) => spot.id === selectedSpot.id) ? "white" : "#0F766E"} size={20} fill={savedSpots.some((spot) => spot.id === selectedSpot.id) ? "white" : "transparent"} /><Text style={isDark ? { color: colors.text } : undefined} className={`ml-2 text-xs font-extrabold ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "text-white" : "text-teal-700"}`}>{savedSpots.some((spot) => spot.id === selectedSpot.id) ? "Saved" : "Save"}</Text></Pressable></View>
                  <Pressable onPress={openSchedule} className="mt-3 flex-row items-center justify-center rounded-2xl bg-teal-700 py-3"><CalendarPlus color="white" size={18} /><Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-white">Make a plan</Text></Pressable>
                  {(selectedSpot.communityRatingCount || selectedSpot.comments?.length) ? <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-amber-50 px-4 py-3"><View><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-amber-900">Friends' verdict</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-xs text-amber-800">{selectedSpot.communityRatingCount ?? 0} rating{selectedSpot.communityRatingCount === 1 ? "" : "s"}{selectedSpot.comments?.length ? ` · ${selectedSpot.comments.length} note${selectedSpot.comments.length === 1 ? "" : "s"}` : ""}</Text></View><View className="flex-row items-center"><Star color="#F59E0B" size={17} fill="#F59E0B" /><Text style={isDark ? { color: colors.text } : undefined} className="ml-1 font-extrabold text-amber-900">{selectedSpot.communityRating ?? "—"}/5</Text></View></View> : null}
                  <Pressable onPress={() => setIsFriendFeedbackOpen((current) => !current)} className="mt-3 flex-row items-center justify-between rounded-2xl bg-slate-100 px-4 py-3"><View><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">Add your take</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-xs text-slate-500">Rate it or leave a short note for friends.</Text></View><ChevronDown color="#0F766E" size={19} style={{ transform: [{ rotate: isFriendFeedbackOpen ? "180deg" : "0deg" }] }} /></Pressable>
                  {isFriendFeedbackOpen && <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-2 rounded-2xl bg-slate-100 p-3"><View className="flex-row gap-2">{[1, 2, 3, 4, 5].map((score) => <Pressable key={score} onPress={() => setFeedbackRating(score)} className={`h-9 w-9 items-center justify-center rounded-full ${feedbackRating === score ? "bg-amber-400" : "bg-white"}`}><Star color={feedbackRating === score ? "white" : "#F59E0B"} size={17} fill={feedbackRating === score ? "white" : "transparent"} /></Pressable>)}</View><TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined} value={feedbackComment} onChangeText={setFeedbackComment} placeholder="What did you think? (optional)" placeholderTextColor="#94A3B8" maxLength={280} multiline textAlignVertical="top" className="mt-3 min-h-20 rounded-xl bg-white px-3 py-3 text-base leading-6 text-slate-900" /><Pressable disabled={feedbackRating === null || isSubmittingFeedback} onPress={() => void submitSpotFeedback()} className={`mt-3 rounded-xl py-3 ${feedbackRating === null || isSubmittingFeedback ? "bg-slate-300" : "bg-teal-700"}`}><Text style={isDark ? { color: colors.text } : undefined} className="text-center font-extrabold text-white">{isSubmittingFeedback ? "Saving…" : "Post rating"}</Text></Pressable></View>}
                  {selectedSpot.comments?.length ? <View className="mt-4"><Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Friend notes</Text>{selectedSpot.comments.map((comment) => <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} key={comment.id} className="mb-2 rounded-2xl bg-slate-100 p-3"><View className="flex-row items-center justify-between"><Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-900">@{comment.user.username}</Text><Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-amber-700">★ {comment.rating}/5</Text></View><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm leading-5 text-slate-600">{comment.comment}</Text></View>)}</View> : null}
                </>
              ) : (
                <>
              <View className="flex-row items-start justify-between">
                <View className="mr-3 flex-1">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                    {selectedSpot.name}
                  </Text>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                    {selectedSpot.address}
                  </Text>
                </View>
                <View className="rounded-full bg-slate-900 px-3 py-2">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-bold text-white">
                    {selectedSpot.personalRating}/5
                  </Text>
                </View>
              </View>
              {selectedSpot.photos?.length ? (
                <View className="mt-3">
                  <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Photos
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedSpot.photos.map((photo) => (
                      <View
                        key={photo.id}
                        className="mr-3 h-32 w-44 overflow-hidden rounded-2xl"
                      >
                        <NativeImage
                          source={{ uri: photo.uri }}
                          style={styles.cardPhoto}
                        />
                        <View className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1">
                          <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-bold text-white">
                            @{photo.user.username}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : selectedSpot.photoUri ? (
                <NativeImage
                  source={{ uri: selectedSpot.photoUri }}
                  style={styles.detailPhoto}
                />
              ) : null}
              <View
                className="mt-3 self-start rounded-full px-3 py-1"
                style={{
                  backgroundColor: `${categoryColors[selectedSpot.category]}20`,
                }}
              >
                <Text
                  style={{ color: categoryColors[selectedSpot.category] }}
                  className="text-xs font-extrabold"
                >
                  {selectedSpot.category}
                </Text>
              </View>
              <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm font-bold text-teal-700">
                Pinned by {selectedSpot.pinnedBy}
              </Text>
              <View className="mt-2 flex-row items-center">
                <Star color="#F59E0B" size={18} fill="#F59E0B" />
                <Text style={isDark ? { color: colors.text } : undefined} className="ml-1 font-bold text-slate-700">
                  {selectedSpot.pinnedBy}'s rating:{" "}
                  {selectedSpot.personalRating}/5
                </Text>
              </View>
              <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-3 rounded-2xl bg-slate-100 p-4">
                <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Note from {selectedSpot.pinnedBy}
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-base leading-6 text-slate-700">
                  {selectedSpot.description || "No note added yet."}
                </Text>
              </View>
              {selectedSpot.userId === session.user.id && (
                <View className="mt-3 rounded-2xl border border-teal-100 bg-teal-50 p-3">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-teal-900">Sharing</Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-xs text-teal-700">Choose who can see this recommendation.</Text>
                    </View>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-bold text-teal-700">{selectedSpot.visibility === "friends" ? "Friends" : "Only me"}</Text>
                  </View>
                  <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-3 flex-row rounded-xl bg-white p-1">
                    {(["private", "friends"] as Visibility[]).map((option) => {
                      const selected = selectedSpot.visibility === option;
                      return <Pressable key={option} disabled={isUpdatingSharing} onPress={() => void updateSpotVisibility(option)} className={`flex-1 rounded-lg py-2.5 ${selected ? "bg-teal-700" : ""}`}><Text style={isDark ? { color: colors.text } : undefined} className={`text-center text-xs font-extrabold ${selected ? "text-white" : "text-slate-600"}`}>{option === "private" ? "Only me" : "Friends"}</Text></Pressable>;
                    })}
                  </View>
                </View>
              )}
              <View className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <View className="flex-row items-center justify-between">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
                    Friends' rating
                  </Text>
                  <View className="flex-row items-center">
                    <Star color="#F59E0B" size={17} fill="#F59E0B" />
                    <Text style={isDark ? { color: colors.text } : undefined} className="ml-1 font-extrabold text-amber-900">
                      {selectedSpot.communityRating ?? "—"}/5
                    </Text>
                  </View>
                </View>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-amber-800">
                  {selectedSpot.communityRatingCount
                    ? `From ${selectedSpot.communityRatingCount} friend${selectedSpot.communityRatingCount === 1 ? "" : "s"}`
                    : "No friend ratings yet"}
                </Text>
              </View>
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => getDirections(selectedSpot)}
                  className="flex-1 flex-row items-center justify-center rounded-2xl bg-slate-900 py-4"
                >
                  <Navigation color="white" size={18} />
                  <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-white">
                    Get Directions
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSaved(selectedSpot)}
                  className={`items-center justify-center rounded-2xl px-4 ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "bg-amber-400" : "bg-slate-100"}`}
                >
                  <Bookmark
                    color={
                      savedSpots.some((spot) => spot.id === selectedSpot.id)
                        ? "white"
                        : "#0F766E"
                    }
                    size={21}
                    fill={
                      savedSpots.some((spot) => spot.id === selectedSpot.id)
                        ? "white"
                        : "transparent"
                    }
                  />
                  <Text style={isDark ? { color: colors.text } : undefined}
                    className={`mt-1 text-xs font-extrabold ${savedSpots.some((spot) => spot.id === selectedSpot.id) ? "text-white" : "text-teal-700"}`}
                  >
                    {savedSpots.some((spot) => spot.id === selectedSpot.id)
                      ? "Saved"
                      : "Save"}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={openSchedule}
                className="mt-3 flex-row items-center justify-center rounded-2xl bg-teal-700 py-3"
              >
                <CalendarPlus color="white" size={18} />
                <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-white">
                  Schedule with friends
                </Text>
              </Pressable>
              {selectedSpot.userId === session.user.id && (
                <Pressable
                  onPress={() => deleteSpot(selectedSpot)}
                  className="mt-3 flex-row items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-3"
                >
                  <Trash2 color="#E11D48" size={17} />
                  <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-rose-600">
                    Delete pin
                  </Text>
                </Pressable>
              )}
              {selectedSpot.userId !== session.user.id &&
                selectedSpot.visibility === "friends" && (
                  <View className="mt-4 rounded-2xl bg-teal-50 p-4">
                    <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-teal-900">
                      What do you think?
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-teal-700">
                      Rate this recommendation and leave a note for friends.
                    </Text>
                    <View className="mt-3 flex-row gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          onPress={() => setFeedbackRating(score)}
                          className={`h-9 w-9 items-center justify-center rounded-full ${feedbackRating === score ? "bg-amber-400" : "bg-white"}`}
                        >
                          <Star
                            color={
                              feedbackRating === score ? "white" : "#F59E0B"
                            }
                            size={17}
                            fill={
                              feedbackRating === score ? "white" : "transparent"
                            }
                          />
                        </Pressable>
                      ))}
                    </View>
                    <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                      value={feedbackComment}
                      onChangeText={setFeedbackComment}
                      placeholder="e.g. Yes, this is amazing."
                      placeholderTextColor="#94A3B8"
                      maxLength={280}
                      multiline
                      onFocus={() => sheetRef.current?.snapToIndex(1)}
                      textAlignVertical="top"
                      className="mt-3 min-h-20 rounded-xl bg-white px-3 py-3 text-base leading-6 text-slate-900"
                    />
                    {feedbackPhotoUri ? (
                      <View className="mt-3 h-24 overflow-hidden rounded-xl">
                        <NativeImage
                          source={{ uri: feedbackPhotoUri }}
                          style={styles.cardPhoto}
                        />
                        <Pressable
                          onPress={() => setFeedbackPhotoUri(null)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1"
                        >
                          <X color="white" size={15} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={isDark ? { backgroundColor: colors.surface } : undefined}
                        onPress={pickFeedbackPhoto}
                        className="mt-3 rounded-xl border border-dashed border-teal-600 bg-white py-2.5"
                      >
                        <Text style={isDark ? { color: colors.text } : undefined} className="text-center text-sm font-bold text-teal-700">
                          Add a photo
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      disabled={feedbackRating === null || isSubmittingFeedback}
                      onPress={() => void submitSpotFeedback()}
                      className={`mt-3 rounded-xl py-3 ${feedbackRating === null || isSubmittingFeedback ? "bg-slate-300" : "bg-teal-700"}`}
                    >
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-extrabold text-white">
                        {isSubmittingFeedback
                          ? "Saving…"
                          : "Post rating & comment"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              {selectedSpot.comments?.length ? (
                <View className="mt-4">
                  <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Friend comments
                  </Text>
                  {selectedSpot.comments.map((comment) => (
                    <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined}
                      key={comment.id}
                      className="mb-2 rounded-2xl bg-slate-100 p-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-900">
                          @{comment.user.username}
                        </Text>
                        <View className="flex-row items-center">
                          <Star color="#F59E0B" size={14} fill="#F59E0B" />
                          <Text style={isDark ? { color: colors.text } : undefined} className="ml-1 text-xs font-extrabold text-slate-700">
                            {comment.rating}/5
                          </Text>
                        </View>
                      </View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm leading-5 text-slate-600">
                        {comment.comment}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
                </>
              )}
            </BottomSheetScrollView>
          )}
        </BottomSheet>
      </MapScreen>
      <SafeAreaView
        edges={["bottom"]}
        style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
        className="border-t px-4 pt-2"
      >
        <View className="flex-row items-end justify-between">
          <Pressable
            onPress={() => navigateToTab("map")}
            className="items-center pb-1"
          >
            <MapIcon
              color={activeTab === "map" ? "#0F766E" : "#64748B"}
              size={21}
              fill={activeTab === "map" ? "#CCFBF1" : "none"}
            />
            <Text style={isDark ? { color: colors.text } : undefined}
              className={`mt-1 text-[10px] font-extrabold ${activeTab === "map" ? "text-teal-700" : "text-slate-500"}`}
            >
              MAP
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigateToTab("friends")}
            className="items-center pb-1"
          >
            <View>
              <UsersRound
                color={activeTab === "friends" ? "#0F766E" : "#64748B"}
                size={21}
              />
              {incomingRequests.length > 0 && (
                <View className="absolute -right-2 -top-2 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-[9px] font-bold text-white">
                    {incomingRequests.length}
                  </Text>
                </View>
              )}
            </View>
            <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-[10px] font-bold text-slate-500">
              FRIENDS
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Add a new place"
            onPress={() => {
              navigateToTab("map");
              setIsTopBarCollapsed(true);
              setVisibility(preferences.defaultVisibility);
              setIsAddOpen(true);
            }}
            style={styles.navAdd}
            className="h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-teal-700 shadow-lg"
          >
            <Plus color="white" size={27} strokeWidth={3} />
            <Text style={styles.addLabel}>ADD</Text>
          </Pressable>
          <Pressable
            onPress={() => navigateToTab("saved")}
            className="items-center pb-1"
          >
            <Bookmark
              color={activeTab === "saved" ? "#0F766E" : "#64748B"}
              size={21}
            />
            <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-[10px] font-bold text-slate-500">
              SAVED
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { navigateToTab("map"); requestAnimationFrame(() => void openDiscover()); }}
            accessibilityLabel="Open Discover"
            className="items-center pb-1"
          >
            <Compass
              color={isDiscoverOpen ? "#0F766E" : "#64748B"}
              size={21}
            />
            <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-[10px] font-bold text-slate-500">
              DISCOVER
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={isDiscoverOpen}
        animationType="slide"
        onRequestClose={() => setIsDiscoverOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView edges={[]} style={{ paddingTop: tabTopInset, backgroundColor: colors.background }} className="flex-1">
            <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
              <View><Text style={{ color: colors.text }} className="text-2xl font-extrabold">Discover</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Places from this part of the map</Text></View>
              <Pressable onPress={() => setIsDiscoverOpen(false)} style={{ backgroundColor: colors.surfaceMuted }} className="h-11 w-11 items-center justify-center rounded-full"><X color={colors.icon} size={22} /></Pressable>
            </View>
            {isDiscoverLoading ? (
              <View className="flex-1 items-center justify-center"><ActivityIndicator color="#0F766E" size="large" /><Text style={{ color: colors.muted }} className="mt-4 font-bold">Finding your next picks…</Text></View>
            ) : discoverableSpots.length ? (
              <ScrollView ref={discoverPagerRef} pagingEnabled snapToInterval={discoverPageHeight} disableIntervalMomentum decelerationRate="fast" showsVerticalScrollIndicator={false} snapToAlignment="start" onMomentumScrollEnd={(event) => setDiscoverIndex(Math.round(event.nativeEvent.contentOffset.y / discoverPageHeight))}>
                {discoverableSpots.map((spot, index) => (
                  <View key={spot.id} style={{ height: discoverPageHeight }} className="px-5 pb-10">
                    <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="flex-1 overflow-hidden rounded-[32px] border shadow-lg">
                      <View style={{ backgroundColor: `${categoryColors[spot.category]}33` }} className="h-[42%] items-center justify-center">
                        {spot.photoUri ? <NativeImage source={{ uri: spot.photoUri }} style={styles.discoverPhoto} /> : <View style={{ backgroundColor: categoryColors[spot.category] }} className="h-20 w-20 items-center justify-center rounded-3xl shadow-lg">{categoryIcon(spot.category, "white", 36)}</View>}
                        <View style={{ backgroundColor: "rgba(15, 23, 42, 0.72)" }} className="absolute left-4 top-4 rounded-full px-3 py-1.5"><Text className="text-xs font-extrabold text-white">{index + 1} of {discoverableSpots.length}</Text></View>
                      </View>
                      <View className="flex-1 p-5">
                        <View className="flex-row items-start justify-between"><View className="mr-3 flex-1"><Text style={{ color: colors.text }} numberOfLines={2} className="text-2xl font-extrabold leading-7">{spot.name}</Text><Text style={{ color: categoryColors[spot.category] }} className="mt-2 text-sm font-extrabold">{spot.category} · {spot.personalRating}/5</Text></View><Pressable onPress={() => toggleSaved(spot)} style={{ backgroundColor: savedSpots.some((saved) => saved.id === spot.id) ? "#FBBF24" : colors.surfaceMuted }} className="h-11 w-11 items-center justify-center rounded-2xl"><Bookmark color={savedSpots.some((saved) => saved.id === spot.id) ? "white" : "#0F766E"} size={21} fill={savedSpots.some((saved) => saved.id === spot.id) ? "white" : "transparent"} /></Pressable></View>
                        <Text style={{ color: colors.muted }} numberOfLines={2} className="mt-3 text-sm leading-5">{spot.description || spot.note || spot.address}</Text>
                        <View className="mt-4 flex-1"><View className="flex-row items-center justify-between"><Text style={{ color: colors.muted }} className="text-xs font-bold">FROM THE CIRCLE</Text><Text style={{ color: categoryColors[spot.category] }} className="text-xs font-extrabold">{spot.communityRatingCount ? `${spot.communityRating?.toFixed(1)}/5 from friends` : "New recommendation"}</Text></View>{spot.comments?.filter((comment) => comment.comment.trim()).slice(0, 2).map((comment) => <View key={comment.id} style={{ backgroundColor: colors.surfaceMuted }} className="mt-2 rounded-2xl p-3"><View className="flex-row items-center justify-between"><Text style={{ color: colors.text }} className="font-extrabold">@{comment.user.username}</Text><Text style={{ color: "#D97706" }} className="text-xs font-extrabold">★ {comment.rating}/5</Text></View><Text style={{ color: colors.muted }} numberOfLines={2} className="mt-1 text-sm leading-5">“{comment.comment}”</Text></View>) ?? null}{!spot.comments?.some((comment) => comment.comment.trim()) && <View style={{ backgroundColor: colors.surfaceMuted }} className="mt-2 rounded-2xl p-3"><Text style={{ color: colors.text }} className="font-bold">{spot.pinnedBy || "Someone in your circle"} recommends this</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Open it on the map to add your own rating or comment.</Text></View>}</View>
                        <View className="mt-4"><Text style={{ color: colors.muted }} className="mb-2 text-center text-xs font-bold">{index < discoverableSpots.length - 1 ? "Swipe up for the next pick" : "You’ve seen every nearby pick"}</Text><View className="flex-row gap-2"><Pressable onPress={() => getDirections(spot)} className="flex-1 rounded-2xl bg-slate-900 py-3.5"><Text className="text-center font-extrabold text-white">Directions</Text></Pressable><Pressable onPress={() => { setIsDiscoverOpen(false); navigateToTab("map"); requestAnimationFrame(() => openSpot(spot)); }} className="flex-1 rounded-2xl bg-teal-700 py-3.5"><Text className="text-center font-extrabold text-white">See on map</Text></Pressable></View>{index < discoverableSpots.length - 1 ? <Pressable onPress={() => { const next = index + 1; discoverPagerRef.current?.scrollTo({ y: next * discoverPageHeight, animated: true }); setDiscoverIndex(next); }} style={{ backgroundColor: colors.surfaceMuted }} className="mt-2 rounded-2xl py-3"><Text style={{ color: colors.text }} className="text-center text-sm font-extrabold">Next pick</Text></Pressable> : null}</View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center px-8"><View style={{ backgroundColor: colors.surfaceMuted }} className="h-16 w-16 items-center justify-center rounded-3xl"><MapPin color="#0F766E" size={30} /></View><Text style={{ color: colors.text }} className="mt-5 text-xl font-extrabold">No picks here yet</Text><Text style={{ color: colors.muted }} className="mt-2 text-center leading-5">Move the map to a busier area, then open Discover again.</Text></View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
      <Modal
        visible={isAddOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior="height"
          keyboardVerticalOffset={0}
        >
          <View style={styles.addModalBackdrop}>
            <View
              style={
                [
                  selectedPlace
                    ? styles.addModalCardExpanded
                    : styles.addModalCardCompact,
                  { backgroundColor: colors.surface },
                ]
              }
            >
              <ScrollView
                contentContainerStyle={styles.addModalContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
              >
                <View className="px-6 pb-10 pt-5">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                        Add a place
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                        Search, rate and share your view.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setIsAddOpen(false)}
                      style={{ backgroundColor: colors.surfaceMuted }}
                      className="rounded-full bg-slate-100 p-2"
                    >
                      <X color="#334155" size={20} />
                    </Pressable>
                  </View>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-6 text-sm font-extrabold text-slate-700">
                    Find the venue
                  </Text>
                  <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="flex-row items-center rounded-2xl bg-slate-100 px-4">
                    <Search color="#64748B" size={19} />
                    <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                      value={query}
                      onChangeText={(value) => {
                        setQuery(value);
                        setSelectedPlace(null);
                        setResults([]);
                        setError(null);
                      }}
                      onSubmitEditing={searchPlaces}
                      placeholder="e.g. Bethwall Climbing Centre"
                      className="ml-2 flex-1 py-4 text-base leading-6 text-slate-900"
                      textAlignVertical="center"
                      placeholderTextColor="#94A3B8"
                      returnKeyType="search"
                    />
                  </View>
                  <Pressable
                    disabled={isSearching}
                    onPress={searchPlaces}
                    className={`mt-3 flex-row items-center justify-center rounded-xl py-3 ${isSearching ? "bg-slate-300" : "bg-teal-700"}`}
                  >
                    {isSearching ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-white">
                        Search Google Places
                      </Text>
                    )}
                  </Pressable>
                  {results.length > 0 && !selectedPlace && (
                    <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-3 rounded-2xl border border-slate-200 bg-white">
                      <Text style={isDark ? { color: colors.text } : undefined} className="px-4 pt-4 text-sm font-extrabold text-slate-800">
                        Choose the correct location
                      </Text>
                      {results.map((place) => (
                        <Pressable
                          key={place.placeId}
                          onPress={() => {
                            setSelectedPlace(place);
                            setResults([]);
                            setQuery(place.name);
                            setError(null);
                            Keyboard.dismiss();
                          }}
                          className="border-b border-slate-100 px-4 py-4"
                        >
                          <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                            {place.name}
                          </Text>
                          <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                            {place.address}
                          </Text>
                          <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-700">
                            Select venue
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {!selectedPlace ? (
                    <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-800">
                        Select a venue to continue
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm leading-5 text-slate-500">
                        Search for the place, then choose the correct result.
                        Nothing will be added until you tap Add place.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: isDark ? "#134E4A" : "#F0FDFA" }} className="mt-5 rounded-2xl bg-teal-50 p-4">
                        <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-teal-700">
                          Selected venue
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 font-extrabold text-slate-900">
                          {selectedPlace.name}
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-600">
                          {selectedPlace.address}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setSelectedPlace(null);
                            setQuery("");
                          }}
                        >
                          <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm font-bold text-teal-700">
                            Change venue
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Category *
                      </Text>
                      <Pressable
                        onPress={() =>
                          setIsAddCategoryPickerOpen((current) => !current)
                        }
                        style={{ backgroundColor: colors.surfaceMuted }}
                        className="flex-row items-center justify-between rounded-2xl bg-slate-100 px-4 py-3"
                      >
                        <View className="flex-row items-center">
                          <View
                            className="h-7 w-7 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: categoryColors[category],
                            }}
                          >
                            {categoryIcon(category, "white", 15)}
                          </View>
                          <Text style={isDark ? { color: colors.text } : undefined} className="ml-3 text-base font-extrabold text-slate-800">
                            {category}
                          </Text>
                        </View>
                        <ChevronDown
                          color="#0F766E"
                          size={18}
                          style={{
                            transform: [
                              {
                                rotate: isAddCategoryPickerOpen
                                  ? "180deg"
                                  : "0deg",
                              },
                            ],
                          }}
                        />
                      </Pressable>
                      {isAddCategoryPickerOpen && (
                        <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-2 max-h-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                          <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="flex-row items-center rounded-xl bg-slate-100 px-3">
                            <Search color="#64748B" size={17} />
                            <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                              value={addCategorySearch}
                              onChangeText={setAddCategorySearch}
                              placeholder="Search categories"
                              placeholderTextColor="#94A3B8"
                              className="ml-2 flex-1 py-2.5 text-base text-slate-900"
                            />
                          </View>
                          <ScrollView
                            className="mt-2"
                            keyboardShouldPersistTaps="handled"
                          >
                            {addCategoryMatches.map((item) => (
                              <Pressable
                                key={item}
                                onPress={() => {
                                  setCategory(item);
                                  setAddCategorySearch("");
                                  setIsAddCategoryPickerOpen(false);
                                }}
                                style={{ backgroundColor: item === category ? (isDark ? "#134E4A" : "#F0FDFA") : colors.surfaceMuted }}
                                className={`mt-1 flex-row items-center rounded-xl px-3 py-2.5 ${item === category ? "bg-teal-50" : "bg-slate-50"}`}
                              >
                                <View
                                  className="h-7 w-7 items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: categoryColors[item],
                                  }}
                                >
                                  {categoryIcon(item, "white", 14)}
                                </View>
                                <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 flex-1 text-sm font-bold text-slate-700">
                                  {item}
                                </Text>
                                {item === category && (
                                  <Check color="#0F766E" size={17} />
                                )}
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                      <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Your rating *
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {Array.from({ length: 5 }, (_, index) => index + 1).map(
                          (value) => (
                            <Pressable
                              key={value}
                              onPress={() => setPersonalRating(value)}
                              style={value === personalRating ? undefined : { backgroundColor: colors.surfaceMuted }}
                              className={`h-10 w-10 items-center justify-center rounded-full ${value === personalRating ? "bg-amber-400" : "bg-slate-100"}`}
                            >
                              <Text style={isDark ? { color: colors.text } : undefined}
                                className={`font-extrabold ${value === personalRating ? "text-white" : "text-slate-600"}`}
                              >
                                {value}
                              </Text>
                            </Pressable>
                          ),
                        )}
                      </View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Who can see this pin?
                      </Text>
                      <View className="flex-row gap-2">
                        {(["private", "friends"] as Visibility[]).map(
                          (option) => (
                            <Pressable
                              key={option}
                              onPress={() => setVisibility(option)}
                              style={visibility === option ? undefined : { backgroundColor: colors.surfaceMuted }}
                              className={`flex-1 rounded-xl px-2 py-3 ${visibility === option ? "bg-teal-700" : "bg-slate-100"}`}
                            >
                              <Text style={isDark ? { color: colors.text } : undefined}
                                className={`text-center text-xs font-extrabold ${visibility === option ? "text-white" : "text-slate-600"}`}
                              >
                                {option === "private" ? "Just me" : "Friends"}
                              </Text>
                            </Pressable>
                          ),
                        )}
                      </View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Your description{" "}
                        <Text style={isDark ? { color: colors.text } : undefined} className="normal-case text-slate-400">
                          (optional)
                        </Text>
                      </Text>
                      <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What makes this place worth visiting?"
                        multiline
                        maxLength={280}
                        textAlignVertical="top"
                        className="min-h-20 rounded-2xl bg-slate-100 px-4 py-3 text-base leading-6 text-slate-900"
                      />
                      <Pressable
                        onPress={pickPhoto}
                        style={{ backgroundColor: isDark ? "#134E4A" : "#F0FDFA" }}
                        className="mt-4 rounded-xl border border-dashed border-teal-600 bg-teal-50 py-3"
                      >
                        <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-teal-700">
                          {photoUris.length
                            ? `Add more photos (${photoUris.length}/5)`
                            : "Add photos"}
                        </Text>
                      </Pressable>
                      {photoUris.length ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="mt-3"
                        >
                          {photoUris.map((uri, index) => (
                            <View
                              key={uri}
                              className="mr-3 h-24 w-24 overflow-hidden rounded-2xl"
                            >
                              <NativeImage
                                source={{ uri }}
                                style={styles.cardPhoto}
                              />
                              <Pressable
                                onPress={() =>
                                  setPhotoUris((current) =>
                                    current.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    ),
                                  )
                                }
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                              >
                                <X color="white" size={15} />
                              </Pressable>
                            </View>
                          ))}
                        </ScrollView>
                      ) : null}
                      {error && (
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm text-rose-600">
                          {error}
                        </Text>
                      )}
                      <Pressable
                        disabled={personalRating === null}
                        onPress={() => {
                          if (selectedPlace) void savePlace(selectedPlace);
                        }}
                        className={`mt-5 rounded-2xl py-4 ${personalRating !== null ? "bg-teal-700" : "bg-slate-300"}`}
                      >
                        <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-extrabold text-white">
                          Add place
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SavedScreen active={activeTab === "saved"} opacity={tabFade}>
        <SafeAreaView
          edges={[]}
          style={{ paddingTop: tabTopInset, backgroundColor: colors.background }}
          className="flex-1"
        >
          <View style={{ backgroundColor: colors.background }} className="flex-1 px-5 pb-10 pt-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                  Saved for later
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                  Your personal shortlist.
                </Text>
              </View>
              <Pressable
                onPress={() => navigateToTab("map")}
                className="rounded-full bg-slate-100 p-2"
              >
                <X color="#334155" size={20} />
              </Pressable>
            </View>
            <View className="mt-5">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => { setSavedSort("nearest"); updatePreference("savedSort", "nearest"); }}
                  style={{ backgroundColor: savedSort === "nearest" ? "#0F766E" : colors.surfaceMuted }}
                  className={`flex-1 rounded-xl py-3 ${savedSort === "nearest" ? "bg-teal-700" : "bg-slate-100"}`}
                >
                  <Text style={isDark ? { color: colors.text } : undefined}
                    className={`text-center text-xs font-extrabold ${savedSort === "nearest" ? "text-white" : "text-slate-600"}`}
                  >
                    Nearest to me
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setSavedSort("recent"); updatePreference("savedSort", "recent"); }}
                  style={{ backgroundColor: savedSort === "recent" ? "#0F766E" : colors.surfaceMuted }}
                  className={`flex-1 rounded-xl py-3 ${savedSort === "recent" ? "bg-teal-700" : "bg-slate-100"}`}
                >
                  <Text style={isDark ? { color: colors.text } : undefined}
                    className={`text-center text-xs font-extrabold ${savedSort === "recent" ? "text-white" : "text-slate-600"}`}
                  >
                    Recently added
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
              >
                {(["All", ...categories] as (Category | "All")[]).map(
                  (item) => (
                    <Pressable
                      key={item}
                      onPress={() => setSavedCategory(item)}
                      style={{ backgroundColor: savedCategory === item ? "#FBBF24" : colors.surfaceMuted }}
                      className={`mr-2 rounded-full px-3 py-2 ${savedCategory === item ? "bg-amber-400" : "bg-slate-100"}`}
                    >
                      <Text style={isDark ? { color: colors.text } : undefined}
                        className={`text-xs font-extrabold ${savedCategory === item ? "text-white" : "text-slate-600"}`}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ),
                )}
              </ScrollView>
            </View>
            <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
              {filteredSavedSpots.length ? (
                filteredSavedSpots.map((spot) => (
                  <Pressable
                    key={spot.id}
                    onPress={() => {
                      navigateToTab("map");
                      requestAnimationFrame(() => openSpot(spot));
                    }}
                    className="mb-3 flex-row overflow-hidden rounded-2xl bg-slate-100"
                  >
                    <View
                      className="h-24 w-24 items-center justify-center"
                      style={{
                        backgroundColor: `${categoryColors[spot.category]}25`,
                      }}
                    >
                      {spot.photoUri ? (
                        <NativeImage
                          source={{ uri: spot.photoUri }}
                          style={styles.cardPhoto}
                        />
                      ) : (
                        <MapPin
                          color={categoryColors[spot.category]}
                          size={28}
                          fill={categoryColors[spot.category]}
                        />
                      )}
                    </View>
                    <View className="flex-1 justify-center px-4">
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-900">
                        {spot.name}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined}
                        className="mt-1 text-sm text-slate-500"
                        numberOfLines={1}
                      >
                        {spot.address}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-700">
                        {spot.personalRating}/5 · {spot.category}{distanceLabel(spot) ? ` · ${distanceLabel(spot)}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="items-center rounded-2xl bg-slate-100 py-10">
                  <Bookmark color="#94A3B8" size={30} />
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 font-bold text-slate-700">
                    Nothing saved yet
                  </Text>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-center text-sm text-slate-500">
                    Open a pin and tap Save to keep it for later.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </SavedScreen>

      <Modal
        visible={isScheduleOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsScheduleOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="rounded-t-3xl bg-white px-6 pb-10 pt-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                  Schedule with friends
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                  {selectedSpot?.name}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsScheduleOpen(false)}
                className="rounded-full bg-slate-100 p-2"
              >
                <X color="#334155" size={20} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => setPickerMode("date")}
              className="mt-5 rounded-2xl bg-slate-100 p-4"
            >
              <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Date & time
              </Text>
              <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-lg font-bold text-slate-900">
                {formatPlanDate(scheduledAt)}
              </Text>
            </Pressable>
            {pickerMode && (
              <DateTimePicker
                value={scheduledAt}
                mode={pickerMode}
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Invite friends
            </Text>
            {friends.length ? (
              friends.map((friend) => (
                <Pressable
                  key={friend.id}
                  onPress={() =>
                    setInviteeIds((current) =>
                      current.includes(friend.id)
                        ? current.filter((id) => id !== friend.id)
                        : [...current, friend.id],
                    )
                  }
                  className={`mb-2 flex-row items-center justify-between rounded-2xl p-3 ${inviteeIds.includes(friend.id) ? "bg-teal-100" : "bg-slate-100"}`}
                >
                  <View>
                    <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                      {friend.name}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-sm text-slate-500">
                      @{friend.username}
                    </Text>
                  </View>
                  {inviteeIds.includes(friend.id) && (
                    <Check color="#0F766E" size={20} />
                  )}
                </Pressable>
              ))
            ) : (
              <Text style={isDark ? { color: colors.text } : undefined} className="text-sm text-slate-500">
                Add and accept friends before scheduling a plan.
              </Text>
            )}
            {planError && (
              <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm text-rose-600">{planError}</Text>
            )}
            <Pressable
              disabled={!friends.length}
              onPress={createPlan}
              className={`mt-5 rounded-2xl py-4 ${friends.length ? "bg-teal-700" : "bg-slate-300"}`}
            >
              <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-extrabold text-white">
                Send invitations
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <FriendsScreen active={activeTab === "friends"} opacity={tabFade}>
        <SafeAreaView
          edges={[]}
          style={{ paddingTop: tabTopInset, backgroundColor: colors.background }}
          className="flex-1"
        >
          <View style={{ backgroundColor: colors.background }} className="flex-1 px-5 pb-10 pt-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                  Friends
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                  Connect and make plans together.
                </Text>
              </View>
              <Pressable
                onPress={() => navigateToTab("map")}
                className="rounded-full bg-slate-100 p-2"
              >
                <X color="#334155" size={20} />
              </Pressable>
            </View>
            <View style={{ backgroundColor: colors.surfaceMuted }} className="mt-5 flex-row rounded-2xl p-1">
              {(["plans", "circle", "requests"] as const).map((view) => {
                const label = view === "plans" ? "Plans" : view === "circle" ? "Circle" : "Requests";
                const badge = view === "requests" ? incomingRequests.length : 0;
                return <Pressable key={view} onPress={() => setFriendsView(view)} style={friendsView === view ? { backgroundColor: colors.surface } : undefined} className="flex-1 flex-row items-center justify-center rounded-xl py-2.5">
                  <Text style={{ color: friendsView === view ? "#0F766E" : colors.muted }} className="text-xs font-extrabold">{label}</Text>
                  {badge ? <View className="ml-1.5 min-w-4 items-center rounded-full bg-rose-500 px-1"><Text className="text-[10px] font-extrabold text-white">{badge}</Text></View> : null}
                </Pressable>;
              })}
            </View>
            <KeyboardAvoidingView
              style={styles.keyboardAvoider}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={12}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ paddingBottom: 112 }}
              >
                {friendsView === "circle" && <>
                <View className="mt-6 overflow-hidden rounded-3xl bg-teal-700 p-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-base font-extrabold text-white">
                        Add to your circle
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-sm text-teal-100">
                        Find people by their username.
                      </Text>
                    </View>
                  </View>
                  <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="mt-4 flex-row items-center rounded-2xl bg-white px-3">
                    <Search color="#64748B" size={18} />
                    <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                      value={friendUsername}
                      onChangeText={setFriendUsername}
                      placeholder="Username, e.g. sarah"
                      autoCapitalize="none"
                      className="ml-2 flex-1 py-3.5 text-base leading-6 text-slate-900"
                      textAlignVertical="center"
                      placeholderTextColor="#94A3B8"
                      returnKeyType="done"
                      onSubmitEditing={sendFriendRequest}
                    />
                    <Pressable
                      onPress={sendFriendRequest}
                      className="rounded-xl bg-slate-900 px-3 py-2"
                    >
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-white">
                        Add
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {friendError && (
                  <Text style={isDark ? { color: colors.text } : undefined}
                    className={`mt-3 px-1 text-sm font-medium ${friendError === "Friend request sent." ? "text-teal-700" : "text-rose-600"}`}
                  >
                    {friendError}
                  </Text>
                )}
                </>}
                {friendsView === "plans" && <>
                <View className="mb-3 mt-7 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-2 h-8 w-8 items-center justify-center rounded-xl bg-teal-50">
                      <CalendarPlus color="#0F766E" size={16} />
                    </View>
                    <View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-900">Plans</Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xs text-slate-500">What’s coming up</Text>
                    </View>
                  </View>
                  {upcomingPlans.length ? (
                    <View className="rounded-full bg-teal-50 px-2.5 py-1">
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-teal-700">
                        {upcomingPlans.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingRight: 8 }}>
                  {plannerDays.map((day) => {
                    const key = calendarKey(day);
                    const count = upcomingPlans.filter((plan) => calendarKey(plan.scheduledAt) === key).length;
                    const selected = key === activePlannerDate;
                    return <Pressable key={key} onPress={() => setSelectedPlannerDate(key)} style={{ backgroundColor: selected ? "#0F766E" : colors.surface, borderColor: selected ? "#0F766E" : colors.border }} className="mr-2 h-[66px] w-[52px] items-center justify-center rounded-2xl border">
                      <Text style={{ color: selected ? "#CCFBF1" : colors.muted }} className="text-[10px] font-extrabold uppercase">{day.toLocaleDateString([], { weekday: "short" })}</Text>
                      <Text style={{ color: selected ? "#FFFFFF" : colors.text }} className="mt-0.5 text-base font-extrabold">{day.getDate()}</Text>
                      <View style={{ backgroundColor: count ? (selected ? "#FFFFFF" : "#14B8A6") : "transparent" }} className="mt-1 h-1.5 w-1.5 rounded-full" />
                    </Pressable>;
                  })}
                </ScrollView>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text style={{ color: colors.text }} className="text-sm font-extrabold">{activePlannerLabel}</Text>
                  <Text style={{ color: colors.muted }} className="text-xs font-bold">{selectedDayPlans.length ? `${selectedDayPlans.length} plan${selectedDayPlans.length === 1 ? "" : "s"}` : "Free day"}</Text>
                </View>
                {selectedDayPlans.length ? (
                  selectedDayPlans.map((plan) => {
                    const mine = plan.hostId === session.user.id;
                    const invite = plan.invites.find(
                      (item) => item.userId === session.user.id,
                    );
                    return (
                      <Pressable
                        key={plan.id}
                        onPress={() => setSelectedPlan(plan)}
                        className="mb-3 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <View className="flex-row items-start">
                          <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                            <CalendarPlus color="#0F766E" size={19} />
                          </View>
                          <View className="ml-3 flex-1">
                            <Text style={isDark ? { color: colors.text } : undefined} numberOfLines={1} className="font-extrabold text-slate-900">
                              {plan.spot?.name ?? "Place"}
                            </Text>
                            <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-600">
                              {formatPlanDate(plan.scheduledAt)}
                            </Text>
                            <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-700">
                              {mine
                                ? "You’re hosting"
                                : `Invited by @${plan.host?.username ?? "friend"}`}
                            </Text>
                          </View>
                          <ChevronDown
                            color="#94A3B8"
                            size={18}
                            style={{ transform: [{ rotate: "-90deg" }] }}
                          />
                        </View>
                        {!mine && invite?.status === "pending" && (
                          <View className="mt-3 flex-row gap-2">
                            <Pressable
                              onPress={() => respondToPlan(plan.id, "accepted")}
                              className="flex-1 rounded-xl bg-teal-700 py-2.5"
                            >
                              <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-white">
                                Accept
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => respondToPlan(plan.id, "declined")}
                              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5"
                            >
                              <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-slate-600">
                                Decline
                              </Text>
                            </Pressable>
                          </View>
                        )}
                        {!mine && invite?.status !== "pending" && (
                          <View className="mt-2 flex-row items-center justify-between">
                            <Text style={isDark ? { color: colors.text } : undefined} className="text-sm text-slate-500">
                              You are {invite?.status}.
                            </Text>
                            <Pressable
                              onPress={() => setSelectedPlan(plan)}
                            className="rounded-full bg-white px-3 py-1.5"
                            >
                              <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-teal-700">
                                Change RSVP
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </Pressable>
                    );
                  })
                ) : upcomingPlans.length ? (
                  <View style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }} className="rounded-2xl border border-dashed p-4">
                    <Text style={{ color: colors.text }} className="font-bold">Nothing planned for {activePlannerLabel.toLowerCase()}</Text>
                    <Text style={{ color: colors.muted }} className="mt-1 text-sm leading-5">Choose another highlighted day to see a plan, or make one from a recommendation.</Text>
                  </View>
                ) : (
                  <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-700">Nothing planned yet</Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm leading-5 text-slate-500">
                      Open a recommendation to make a plan with friends.
                    </Text>
                  </View>
                )}
                </>}
                {friendsView === "requests" && <>
                <View className="mb-3 mt-7 flex-row items-center justify-between">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-extrabold text-slate-900">Requests</Text>
                  {incomingRequests.length ? (
                    <View className="rounded-full bg-rose-50 px-2.5 py-1">
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-rose-600">
                        {incomingRequests.length} new
                      </Text>
                    </View>
                  ) : null}
                </View>
                {incomingRequests.length ? (
                  incomingRequests.map((request) => (
                    <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined}
                      key={request.id}
                      className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <View className="flex-1 flex-row items-center">
                        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                          {request.user.photoUri ? (
                            <NativeImage source={{ uri: request.user.photoUri }} style={styles.friendAvatar} />
                          ) : (
                            <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-white">{request.user.name.trim().slice(0, 1).toUpperCase()}</Text>
                          )}
                        </View>
                        <View className="ml-3 flex-1">
                          <Text style={isDark ? { color: colors.text } : undefined} className="font-extrabold text-slate-900">{request.user.name}</Text>
                          <Text style={isDark ? { color: colors.text } : undefined} className="text-sm text-slate-500">@{request.user.username}</Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => acceptFriendRequest(request.id)}
                        className="flex-row items-center rounded-xl bg-teal-700 px-3 py-2"
                      >
                        <Check color="white" size={16} />
                        <Text style={isDark ? { color: colors.text } : undefined} className="ml-1 font-bold text-white">
                          Accept
                        </Text>
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <Text style={isDark ? { color: colors.text } : undefined} className="px-1 text-sm text-slate-500">No pending requests.</Text>
                )}
                </>}
                {friendsView === "circle" && <>
                <View className="mb-3 mt-7 flex-row items-center justify-between">
                  <View>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-extrabold text-slate-900">Your circle</Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-xs text-slate-500">People you share recommendations with</Text>
                  </View>
                  <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="rounded-full bg-slate-100 px-2.5 py-1">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold text-slate-600">{friends.length}</Text>
                  </View>
                </View>
                {friends.length ? (
                  friends.map((friend) => (
                    <Pressable
                      key={friend.id}
                      accessibilityLabel={`Open ${friend.name}'s profile`}
                      onPress={() => void openFriendProfile(friend)}
                      style={{ backgroundColor: isDark ? colors.surface : "#FFFFFF", borderColor: colors.border }}
                      className="mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                    >
                      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-teal-700">
                        {friend.photoUri ? (
                          <NativeImage
                            source={{ uri: friend.photoUri }}
                            style={styles.friendAvatar}
                          />
                        ) : (
                          <Text style={isDark ? { color: colors.text } : undefined} className="text-lg font-extrabold text-white">
                            {friend.name.trim().slice(0, 1).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View className="ml-3 flex-1">
                        <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                          {friend.name}
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-0.5 text-sm text-slate-500">
                          @{friend.username}
                        </Text>
                      </View>
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-50">
                        <ChevronDown color="#0F766E" size={18} style={{ transform: [{ rotate: "-90deg" }] }} />
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-700">Your circle is empty</Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm leading-5 text-slate-500">Add a friend above to share Friends-only recommendations.</Text>
                  </View>
                )}
                </>}
              </ScrollView>
            </KeyboardAvoidingView>
            {selectedPlan && (
              <View
                style={StyleSheet.absoluteFillObject}
                className="justify-center bg-black/40 px-5"
              >
                <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="max-h-[88%] rounded-3xl bg-white p-5">
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                        {selectedPlan.spot?.name ?? "Place"}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-2 text-sm font-bold text-teal-700">
                        {formatPlanDate(selectedPlan.scheduledAt, "full")}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                        Hosted by @{selectedPlan.host?.username}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedPlan(null)}
                      className="rounded-full bg-slate-100 p-2"
                    >
                      <X color="#334155" size={20} />
                    </Pressable>
                  </View>
                  {selectedPlan.spot && (
                    <>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-2 text-sm text-slate-600">
                        {selectedPlan.spot.address}
                      </Text>
                      <View
                        className="mt-4 overflow-hidden rounded-2xl"
                        style={styles.planMap}
                      >
                        <MapView
                          initialRegion={{
                            latitude: selectedPlan.spot.latitude,
                            longitude: selectedPlan.spot.longitude,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008,
                          }}
                          style={StyleSheet.absoluteFillObject}
                          scrollEnabled={false}
                          zoomEnabled={false}
                        >
                          <Marker
                            coordinate={{
                              latitude: selectedPlan.spot.latitude,
                              longitude: selectedPlan.spot.longitude,
                            }}
                          >
                            <View
                              style={[
                                styles.marker,
                                {
                                  backgroundColor:
                                    categoryColors[selectedPlan.spot.category],
                                },
                              ]}
                            >
                              <MapPin color="white" size={18} fill="white" />
                            </View>
                          </Marker>
                        </MapView>
                      </View>
                    </>
                  )}
                  <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Who's going
                  </Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {selectedPlan.invites.map((invite) => (
                      <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined}
                        key={invite.userId}
                        className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-100 p-3"
                      >
                        <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                          @{invite.user.username}
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined}
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${invite.status === "accepted" ? "bg-emerald-100 text-emerald-700" : invite.status === "declined" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {invite.status}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  {selectedPlan.hostId !== session.user.id && (
                    <View className="mt-3">
                      <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Your response
                      </Text>
                      <View className="flex-row gap-2">
                        {(
                          [
                            ["accepted", "Going"],
                            ["maybe", "Maybe"],
                            ["declined", "Not available"],
                          ] as const
                        ).map(([status, label]) => (
                          <Pressable
                            key={status}
                            onPress={() =>
                              void respondToPlan(selectedPlan.id, status)
                            }
                            className={`flex-1 rounded-xl py-3 ${selectedPlan.invites.find((invite) => invite.userId === session.user.id)?.status === status ? "bg-teal-700" : "bg-slate-100"}`}
                          >
                            <Text style={isDark ? { color: colors.text } : undefined}
                              className={`text-center text-xs font-extrabold ${selectedPlan.invites.find((invite) => invite.userId === session.user.id)?.status === status ? "text-white" : "text-slate-600"}`}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                  <Pressable
                    onPress={() =>
                      selectedPlan.spot && getDirections(selectedPlan.spot)
                    }
                    className="mt-3 rounded-xl bg-slate-900 py-3"
                  >
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-white">
                      Directions
                    </Text>
                  </Pressable>
                  {selectedPlan.hostId === session.user.id && (
                    <Pressable
                      onPress={() => deletePlan(selectedPlan)}
                      className="mt-3 flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3"
                    >
                      <Trash2 color="#E11D48" size={17} />
                      <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-rose-600">
                        Delete plan
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </FriendsScreen>
      <Modal
        visible={isFriendProfileLoading || Boolean(selectedFriendProfile)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isFriendProfileLoading) setSelectedFriendProfile(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="max-h-[86%] rounded-t-[32px] bg-white px-5 pb-10 pt-4">
            {isFriendProfileLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator color="#0F766E" size="large" />
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-4 text-sm font-bold text-slate-500">
                  Opening profile…
                </Text>
              </View>
            ) : (
              selectedFriendProfile && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="mb-5 h-1.5 w-11 self-center rounded-full bg-slate-200" />
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center">
                      <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-teal-100 bg-teal-700">
                        {selectedFriendProfile.user.photoUri ? (
                          <NativeImage
                            source={{
                              uri: selectedFriendProfile.user.photoUri,
                            }}
                            style={styles.friendProfileAvatar}
                          />
                        ) : (
                          <Text style={isDark ? { color: colors.text } : undefined} className="text-3xl font-extrabold text-white">
                            {selectedFriendProfile.user.name
                              .trim()
                              .slice(0, 1)
                              .toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View className="ml-4">
                        <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                          {selectedFriendProfile.user.name}
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-base font-bold text-teal-700">
                          @{selectedFriendProfile.user.username}
                        </Text>
                        <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                          Friend on Recs
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityLabel="Close friend profile"
                      onPress={() => setSelectedFriendProfile(null)}
                      className="rounded-full bg-slate-100 p-2"
                    >
                      <X color="#334155" size={20} />
                    </Pressable>
                  </View>
                  <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-6 flex-row rounded-2xl bg-slate-100 px-4 py-4">
                    <View className="flex-1 items-center border-r border-slate-200">
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-slate-900">
                        {selectedFriendProfile.locationCount}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-slate-500">
                        PINS
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-slate-900">
                        {selectedFriendProfile.friendCount}
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-slate-500">
                        FRIENDS
                      </Text>
                    </View>
                  </View>
                  <View className="mt-6 flex-row items-center justify-between">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Shared places
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xs font-bold text-teal-700">
                      {selectedFriendProfile.locationCount} pinned
                    </Text>
                  </View>
                  {selectedFriendProfile.spots.length ? (
                    selectedFriendProfile.spots.map((spot) => (
                      <Pressable
                        key={spot.id}
                        onPress={() => {
                          setSelectedFriendProfile(null);
                          navigateToTab("map");
                          openSpot(spot);
                        }}
                        className="mt-3 flex-row items-center rounded-2xl bg-slate-100 p-3"
                      >
                        <View
                          style={[
                            styles.friendSpotIcon,
                            { backgroundColor: categoryColors[spot.category] },
                          ]}
                        >
                          {markerIcon(spot)}
                        </View>
                        <View className="ml-3 flex-1">
                          <Text style={isDark ? { color: colors.text } : undefined}
                            numberOfLines={1}
                            className="font-extrabold text-slate-900"
                          >
                            {spot.name}
                          </Text>
                          <Text style={isDark ? { color: colors.text } : undefined}
                            numberOfLines={1}
                            className="mt-1 text-sm text-slate-500"
                          >
                            {spot.address}
                          </Text>
                          <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-700">
                            {spot.category} · {spot.personalRating}/5
                          </Text>
                        </View>
                        <MapPin color="#0F766E" size={19} />
                      </Pressable>
                    ))
                  ) : (
                    <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined} className="mt-3 rounded-2xl bg-slate-100 p-4">
                      <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-800">
                        No shared places yet
                      </Text>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                        Their friends-only recommendations will appear here.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )
            )}
          </View>
        </View>
      </Modal>
      <ProfileScreen active={activeTab === "profile"} opacity={tabFade}>
        <SafeAreaView
          edges={[]}
          style={{ paddingTop: tabTopInset, backgroundColor: colors.background }}
          className="flex-1"
        >
          <View style={{ backgroundColor: colors.background }} className="flex-1 px-5 pt-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Settings
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                  Your account and app preferences
                </Text>
              </View>
              <Pressable
                onPress={() => navigateToTab("map")}
                className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
              >
                <X color="#334155" size={20} />
              </Pressable>
            </View>
            <ScrollView
              className="mt-6"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 148 }}
            >
              <View className="rounded-3xl bg-teal-700 p-5 shadow-lg">
                <View className="flex-row items-center">
                  <Pressable
                    onPress={pickProfilePhoto}
                    className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-teal-600"
                  >
                    {profilePhotoUri ? (
                      <NativeImage
                        source={{ uri: profilePhotoUri }}
                        style={styles.profileAvatar}
                      />
                    ) : (
                      <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-white">
                        {session.user.name.trim().slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </Pressable>
                  <View className="ml-4 flex-1">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-white">
                      {session.user.name}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm font-bold text-teal-100">
                      @{session.user.username}
                    </Text>
                  </View>
                </View>
                <View className="mt-5 flex-row border-t border-teal-500 pt-4">
                  <View className="flex-1">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-white">
                      {savedSpots.length}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-100">
                      Saved
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-white">
                      {friends.length}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-100">
                      Friends
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-white">
                      {plans.length}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-xs font-bold text-teal-100">
                      Plans
                    </Text>
                  </View>
                </View>
              </View>
              <View className="mt-5 flex-row flex-wrap justify-between">
                {([
                  ["profile", "Profile"],
                  ["preferences", "Preferences"],
                  ["privacy", "Privacy"],
                  ["security", "Security"],
                ] as const).map(([key, label]) => (
                  <Pressable key={key} onPress={() => setSettingsSection(key)} style={{ backgroundColor: settingsSection === key ? "#0F766E" : colors.surface, borderColor: settingsSection === key ? "#0F766E" : colors.border }} className="mb-2 w-[48.5%] rounded-2xl border px-4 py-3 shadow-sm">
                    <Text style={{ color: settingsSection === key ? "#FFFFFF" : colors.text }} className="font-extrabold">{label}</Text>
                    <Text style={{ color: settingsSection === key ? "#CCFBF1" : colors.muted }} className="mt-1 text-xs">{key === "profile" ? "Details" : key === "preferences" ? "App choices" : key === "privacy" ? "Your circle" : "Sign-in & data"}</Text>
                  </Pressable>
                ))}
              </View>
              {settingsSection === "profile" && <>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Account
              </Text>
              <Pressable onPress={() => { setAccountName(session.user.name); setAccountUsername(session.user.username); setAccountEmail(session.user.email); setProfileError(null); setIsAccountEditorOpen(true); }} className="flex-row items-center rounded-2xl bg-white px-5 py-4 shadow-sm">
                <View className="flex-1"><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">Account details</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">{session.user.email} · @{session.user.username}</Text></View><ChevronDown color="#0F766E" size={19} style={{ transform: [{ rotate: "-90deg" }] }} />
              </Pressable>
              </>}
              {settingsSection === "security" && <>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Security
              </Text>
              <Pressable
                onPress={() => {
                  setProfileError(null);
                  setIsPasswordOpen(true);
                }}
                className="rounded-2xl bg-white px-5 py-4 shadow-sm"
              >
                <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                  Change password
                </Text>
                <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                  Use your current password to set a new one.
                </Text>
              </Pressable>
              </>}
              {settingsSection === "preferences" && <>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">Preferences</Text>
              <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="overflow-hidden rounded-2xl border shadow-sm">
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Start on the map</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Choose the recommendations you see first.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["mine", "friends"] as const).map((option) => <Pressable key={option} onPress={() => { updatePreference("defaultMapMode", option); setMapMode(option); }} className="flex-1 rounded-lg py-2" style={preferences.defaultMapMode === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.defaultMapMode === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "mine" ? "Mine" : "Friends"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">New recommendation visibility</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">The default for places you add.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["private", "friends"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("defaultVisibility", option)} className="flex-1 rounded-lg py-2" style={preferences.defaultVisibility === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.defaultVisibility === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "private" ? "Only me" : "Friends"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Directions</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Choose an app or be asked each time.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["ask", "apple", "google"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("directionsApp", option)} className="flex-1 rounded-lg py-2" style={preferences.directionsApp === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.directionsApp === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "ask" ? "Ask" : option === "apple" ? "Apple" : "Google"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Map startup</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Centre on your location or keep your last view.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["location", "last"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("mapStartup", option)} className="flex-1 rounded-lg py-2" style={preferences.mapStartup === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.mapStartup === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "location" ? "My location" : "Last view"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Saved places</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Default ordering for your shortlist.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["nearest", "recent"] as const).map((option) => <Pressable key={option} onPress={() => { updatePreference("savedSort", option); setSavedSort(option); }} className="flex-1 rounded-lg py-2" style={preferences.savedSort === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.savedSort === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "nearest" ? "Nearest" : "Recently added"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Distance units</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["miles", "kilometres"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("distanceUnit", option)} className="flex-1 rounded-lg py-2" style={preferences.distanceUnit === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.distanceUnit === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "miles" ? "Miles" : "Kilometres"}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Plan reminders</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">A notification for plans you create on this device.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{([0, 1, 24] as const).map((hours) => <Pressable key={hours} onPress={() => updatePreference("reminderHours", hours)} className="flex-1 rounded-lg py-2" style={preferences.reminderHours === hours ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.reminderHours === hours ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{hours === 0 ? "Off" : `${hours}h`}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Time format</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["system", "12h", "24h"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("timeFormat", option)} className="flex-1 rounded-lg py-2" style={preferences.timeFormat === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.timeFormat === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "system" ? "System" : option}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Date region</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Changes how plan dates are displayed.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["system", "uk", "us"] as const).map((option) => <Pressable key={option} onPress={() => updatePreference("dateRegion", option)} className="flex-1 rounded-lg py-2" style={preferences.dateRegion === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: preferences.dateRegion === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "system" ? "System" : option.toUpperCase()}</Text></Pressable>)}</View></View>
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Appearance</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Light, dark, or match your iPhone.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["light", "dark", "system"] as const).map((option) => <Pressable key={option} onPress={() => setThemeMode(option)} className="flex-1 rounded-lg py-2" style={themeMode === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: themeMode === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>)}</View></View>
                <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><View className="flex-1"><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">Notifications</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">Plan invitations and friend requests.</Text></View><Switch accessibilityLabel="Notifications" value={notificationsEnabled} onValueChange={(value) => { selectionHaptic(); setNotificationsEnabled(value); }} trackColor={{ false: "#CBD5E1", true: "#0F766E" }} /></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Open iPhone text size settings" onPress={() => void Linking.openSettings()} className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4"><View className="flex-1"><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">Text size</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">Uses your iPhone’s preferred text size.</Text></View><Text style={isDark ? { color: colors.text } : undefined} className="text-sm font-bold text-teal-700">Change</Text></Pressable>
                <View className="flex-row items-center justify-between px-5 py-4"><View className="flex-1"><Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">Haptic feedback</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">Gentle confirmation vibrations.</Text></View><Switch accessibilityLabel="Haptic feedback" value={hapticsEnabled} onValueChange={(value) => { if (value) void Haptics.selectionAsync(); setHapticsEnabled(value); }} trackColor={{ false: "#CBD5E1", true: "#0F766E" }} /></View>
              </View>
              </>}
              {settingsSection === "privacy" && <>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">Privacy</Text>
              <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="overflow-hidden rounded-2xl border shadow-sm">
                <View className="border-b px-5 py-4" style={{ borderColor: colors.border }}><Text style={{ color: colors.text }} className="font-bold">Who can send friend requests?</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">This applies across all devices.</Text><View className="mt-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceMuted }}>{(["everyone", "mutuals", "nobody"] as const).map((option) => <Pressable key={option} onPress={() => void saveFriendRequestPolicy(option)} className="flex-1 rounded-lg py-2" style={friendRequestPolicy === option ? { backgroundColor: colors.surface } : undefined}><Text style={{ color: friendRequestPolicy === option ? "#0F766E" : colors.muted }} className="text-center text-xs font-extrabold">{option === "everyone" ? "Everyone" : option === "mutuals" ? "Mutuals" : "Nobody"}</Text></Pressable>)}</View></View>
                <View className="px-5 py-4"><Text style={{ color: colors.text }} className="font-bold">Blocked accounts</Text><Text style={{ color: colors.muted }} className="mt-1 text-sm">Blocked people cannot see shared places or contact you.</Text><View className="mt-3 flex-row rounded-xl" style={{ backgroundColor: colors.surfaceMuted }}><TextInput value={blockUsername} onChangeText={setBlockUsername} autoCapitalize="none" placeholder="Username to block" placeholderTextColor={colors.muted} className="flex-1 px-3 py-3 text-sm text-slate-900" /><Pressable onPress={() => void blockUser()} className="m-1 rounded-lg bg-slate-900 px-4 py-3"><Text className="text-xs font-extrabold text-white">Block</Text></Pressable></View>{privacyError ? <Text className="mt-2 text-xs font-bold text-rose-600">{privacyError}</Text> : null}{blockedUsers.map((blocked) => <View key={blocked.id} className="mt-3 flex-row items-center justify-between"><Text style={{ color: colors.text }} className="font-bold">@{blocked.username}</Text><Pressable onPress={() => void unblockUser(blocked.id)}><Text className="text-sm font-extrabold text-teal-700">Unblock</Text></Pressable></View>)}</View>
              </View>
              </>}
              {settingsSection === "security" && <>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-7 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Account actions
              </Text>
              <Pressable
                onPress={() => {
                  void onSignOut();
                }}
                className="rounded-2xl bg-white py-4 shadow-sm"
              >
                <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-slate-700">
                  Sign out
                </Text>
              </Pressable>
              <Pressable
                onPress={deleteProfile}
                className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 py-4"
              >
                <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-rose-600">
                  Delete profile
                </Text>
              </Pressable>
              </>}
            </ScrollView>
          </View>
        </SafeAreaView>
      </ProfileScreen>
      <Modal
        visible={Boolean(selectedPlan) && activeTab !== "friends"}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedPlan(null)}
      >
        {selectedPlan && (
          <View className="flex-1 justify-center bg-black/40 px-6">
            <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="rounded-3xl bg-white p-5">
              <View className="flex-row items-start justify-between">
                <View className="mr-3 flex-1">
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-2xl font-extrabold text-slate-900">
                    Plan details
                  </Text>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-2 text-lg font-bold text-teal-700">
                    {selectedPlan.spot?.name ?? "Place"}
                  </Text>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-600">
                    {formatPlanDate(selectedPlan.scheduledAt, "full")}
                  </Text>
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                    Hosted by @{selectedPlan.host?.username}
                  </Text>
                  {selectedPlan.spot && (
                    <>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-2 text-sm text-slate-600">
                        {selectedPlan.spot.address}
                      </Text>
                      <View
                        className="mt-4 overflow-hidden rounded-2xl"
                        style={styles.planMap}
                      >
                        <MapView
                          initialRegion={{
                            latitude: selectedPlan.spot.latitude,
                            longitude: selectedPlan.spot.longitude,
                            latitudeDelta: 0.008,
                            longitudeDelta: 0.008,
                          }}
                          style={StyleSheet.absoluteFillObject}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          rotateEnabled={false}
                        >
                          <Marker
                            coordinate={{
                              latitude: selectedPlan.spot.latitude,
                              longitude: selectedPlan.spot.longitude,
                            }}
                          >
                            <View
                              style={[
                                styles.marker,
                                {
                                  backgroundColor:
                                    categoryColors[selectedPlan.spot.category],
                                },
                              ]}
                            >
                              <MapPin color="white" size={18} fill="white" />
                            </View>
                          </Marker>
                        </MapView>
                      </View>
                      <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm font-bold text-teal-700">
                        {
                          selectedPlan.invites.filter(
                            (invite) => invite.status === "accepted",
                          ).length
                        }{" "}
                        accepted ·{" "}
                        {
                          selectedPlan.invites.filter(
                            (invite) => invite.status === "pending",
                          ).length
                        }{" "}
                        awaiting reply
                      </Text>
                    </>
                  )}
                </View>
                <Pressable
                  onPress={() => setSelectedPlan(null)}
                  className="rounded-full bg-slate-100 p-2"
                >
                  <X color="#334155" size={20} />
                </Pressable>
              </View>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Who is coming
              </Text>
              {selectedPlan.invites.map((invite) => (
                <View style={isDark ? { backgroundColor: colors.surfaceMuted } : undefined}
                  key={invite.userId}
                  className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-100 p-3"
                >
                  <View>
                    <Text style={isDark ? { color: colors.text } : undefined} className="font-bold text-slate-900">
                      {invite.user.name}
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-sm text-slate-500">
                      @{invite.user.username}
                    </Text>
                  </View>
                  <Text style={isDark ? { color: colors.text } : undefined}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${invite.status === "accepted" ? "bg-emerald-100 text-emerald-700" : invite.status === "declined" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {invite.status}
                  </Text>
                </View>
              ))}
              {selectedPlan.hostId !== session.user.id && (
                <View className="mt-3">
                  <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Your response
                  </Text>
                  <View className="flex-row gap-2">
                    {(
                      [
                        ["accepted", "Going"],
                        ["maybe", "Maybe"],
                        ["declined", "Not available"],
                      ] as const
                    ).map(([status, label]) => {
                      const selected =
                        selectedPlan.invites.find(
                          (invite) => invite.userId === session.user.id,
                        )?.status === status;
                      return (
                        <Pressable
                          key={status}
                          onPress={() => void respondToPlan(selectedPlan.id, status)}
                          className={`flex-1 rounded-xl py-3 ${selected ? "bg-teal-700" : "bg-slate-100"}`}
                        >
                          <Text style={isDark ? { color: colors.text } : undefined}
                            className={`text-center text-xs font-extrabold ${selected ? "text-white" : "text-slate-600"}`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              {selectedPlan.hostId === session.user.id && (
                <Pressable
                  onPress={() => deletePlan(selectedPlan)}
                  className="mt-3 flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-3"
                >
                  <Trash2 color="#E11D48" size={17} />
                  <Text style={isDark ? { color: colors.text } : undefined} className="ml-2 font-bold text-rose-600">
                    Delete plan
                  </Text>
                </Pressable>
              )}
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() =>
                    selectedPlan.spot && getDirections(selectedPlan.spot)
                  }
                  className="flex-1 rounded-xl bg-slate-900 py-3"
                >
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-white">
                    Directions
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (selectedPlan.spot) {
                      setSelectedPlan(null);
                      navigateToTab("map");
                      openSpot(selectedPlan.spot);
                    }
                  }}
                  className="flex-1 rounded-xl bg-slate-100 py-3"
                >
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-center font-bold text-teal-700">
                    View on map
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>
      <Modal
        visible={isAccountEditorOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAccountEditorOpen(false)}
      >
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View className="flex-1 justify-center bg-black/40 px-6">
            <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="rounded-3xl bg-white p-5">
              <View className="mb-5 flex-row items-center justify-between"><View><Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-extrabold text-slate-900">Account details</Text><Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">Update how people find you.</Text></View><Pressable onPress={() => setIsAccountEditorOpen(false)} className="rounded-full bg-slate-100 p-2"><X color="#334155" size={20} /></Pressable></View>
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Name</Text><TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined} value={accountName} onChangeText={setAccountName} className="rounded-2xl bg-slate-100 px-4 py-3.5 text-base text-slate-900" />
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Username</Text><TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined} value={accountUsername} onChangeText={setAccountUsername} autoCapitalize="none" className="rounded-2xl bg-slate-100 px-4 py-3.5 text-base text-slate-900" />
              <Text style={isDark ? { color: colors.text } : undefined} className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Email</Text><TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined} value={accountEmail} onChangeText={setAccountEmail} autoCapitalize="none" keyboardType="email-address" className="rounded-2xl bg-slate-100 px-4 py-3.5 text-base text-slate-900" />
              {profileError ? <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm font-semibold text-rose-600">{profileError}</Text> : null}
              <Pressable onPress={() => void saveAccountDetails()} disabled={isSavingAccount} className={`mt-5 rounded-2xl py-4 ${isSavingAccount ? "bg-slate-300" : "bg-teal-700"}`}><Text style={isDark ? { color: colors.text } : undefined} className="text-center font-extrabold text-white">{isSavingAccount ? "Saving…" : "Save changes"}</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={isPasswordOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPasswordOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={12}
        >
          <ScrollView
            contentContainerStyle={styles.passwordModalContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <View className="flex-1 justify-center bg-black/40 px-6">
              <View style={isDark ? { backgroundColor: colors.surface } : undefined} className="rounded-3xl bg-white p-5 shadow-xl">
                <View className="mb-5 flex-row items-center justify-between">
                  <View>
                    <Text style={isDark ? { color: colors.text } : undefined} className="text-xl font-bold text-slate-900">
                      Change password
                    </Text>
                    <Text style={isDark ? { color: colors.text } : undefined} className="mt-1 text-sm text-slate-500">
                      Use at least 8 characters.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setIsPasswordOpen(false)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                  >
                    <X size={20} color="#334155" />
                  </Pressable>
                </View>
                <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Current password
                </Text>
                <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  className="mb-4 rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900"
                  textAlignVertical="center"
                  returnKeyType="next"
                  placeholder="Your current password"
                  placeholderTextColor="#94a3b8"
                />
                <Text style={isDark ? { color: colors.text } : undefined} className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  New password
                </Text>
                <TextInput style={isDark ? { color: colors.text, backgroundColor: colors.surfaceMuted } : undefined}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  className="rounded-2xl bg-slate-100 px-4 py-4 text-base leading-6 text-slate-900"
                  textAlignVertical="center"
                  returnKeyType="done"
                  placeholder="Your new password"
                  placeholderTextColor="#94a3b8"
                />
                {profileError ? (
                  <Text style={isDark ? { color: colors.text } : undefined} className="mt-3 text-sm font-semibold text-red-600">
                    {profileError}
                  </Text>
                ) : null}
                <Pressable
                  onPress={changePassword}
                  disabled={!currentPassword || newPassword.length < 8}
                  className={`mt-5 items-center rounded-2xl py-4 ${currentPassword && newPassword.length >= 8 ? "bg-teal-700" : "bg-slate-300"}`}
                >
                  <Text style={isDark ? { color: colors.text } : undefined} className="text-base font-bold text-white">
                    Update password
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const clusterMarkerStyle = {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderWidth: 4,
  borderColor: "white",
  backgroundColor: "#0F766E",
  elevation: 8,
  shadowColor: "#0F172A",
  shadowOpacity: 0.22,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 4 },
};
const styles = StyleSheet.create({
  marker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "white",
    elevation: 7,
    shadowColor: "#0F172A",
    shadowOpacity: 0.24,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  tabPage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    paddingBottom: 74,
    backgroundColor: "white",
  },
  mapHeaderSafeArea: {
    zIndex: 8,
    elevation: 8,
  },
  mapCategoryList: {
    maxHeight: 156,
  },
  keyboardAvoider: { flex: 1 },
  spotSheetContent: { paddingHorizontal: 24, paddingBottom: 28 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  addModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingTop: 92,
    paddingBottom: 94,
  },
  addModalCardCompact: {
    maxHeight: "100%",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "white",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  addModalCardExpanded: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "white",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  addModalContent: { paddingBottom: 28 },
  passwordModalContent: { flexGrow: 1 },
  profileAvatar: { width: "100%", height: "100%" },
  friendAvatar: { width: "100%", height: "100%" },
  friendProfileAvatar: { width: "100%", height: "100%" },
  friendSpotIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  planMap: { height: 145, width: "100%" },
  photoPreview: { width: "100%", height: 180 },
  detailPhoto: {
    width: "100%",
    height: 110,
    marginTop: 10,
    borderWidth: 0,
    borderRadius: 16,
  },
  friendDetailPhoto: {
    width: "100%",
    height: 148,
    marginTop: 14,
    borderRadius: 20,
  },
  cardPhoto: { width: "100%", height: "100%" },
  discoverPhoto: { width: "100%", height: "100%" },
  searchAreaContainer: {
    position: "absolute",
    top: 278,
    left: 0,
    right: 0,
    zIndex: 4,
    alignItems: "center",
  },
  locationButton: {
    position: "absolute",
    right: 18,
    bottom: 108,
    zIndex: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    shadowColor: "#0F172A",
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  navAdd: { marginTop: -31 },
  addLabel: {
    position: "absolute",
    bottom: -17,
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "800",
  },
  spotSheetContainer: { left: 12, right: 12 },
  spotSheetCard: { borderRadius: 30, overflow: "hidden" },
  sheet: {
    backgroundColor: "white",
    borderRadius: 30,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { backgroundColor: "#CBD5E1", width: 46, height: 5 },
});






