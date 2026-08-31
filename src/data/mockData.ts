export type Category = "Coffee" | "Restaurant" | "Pub" | "Cocktail Bar" | "Bakery" | "Brunch" | "Padel" | "Tennis" | "Football" | "Gym" | "Bouldering" | "Yoga" | "Pilates" | "Running" | "Cycling" | "Swimming" | "Golf" | "Cinema" | "Live Music" | "Theatre" | "Museum" | "Art Gallery" | "Gaming" | "Shopping" | "Market" | "Park" | "Walk" | "Wellness" | "Other";

export interface User { id: string; username: string; handle: string; name: string; email: string; photoUri?: string | null; }
export type Visibility = "private" | "friends";
export interface SpotComment { id: string; userId: string; user: User; rating: number; comment: string; createdAt: string; photoUri?: string | null; }
export interface SpotPhoto { id: string; uri: string; userId: string; user: User; }

export interface Spot {
  id: string;
  userId?: string;
  name: string;
  category: Category;
  customCategory?: string;
  isCluster?: boolean;
  clusterCount?: number;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  personalRating: number;
  communityRating?: number | null;
  communityRatingCount?: number;
  comments?: SpotComment[];
  photos?: SpotPhoto[];
  description: string;
  note: string;
  photoUri?: string | null;
  photoUris?: string[];
  visibility: Visibility;
  pinnedBy: string;
  ownerType: "current-user";
}
