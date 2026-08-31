import { createServer } from "node:http";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const scrypt = promisify(scryptCallback);
const root = process.cwd();
const envPath = join(root, ".env");
if (existsSync(envPath)) for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const usersPath = join(root, "server", "users.json");
const spotsPath = join(root, "server", "spots.json");
const friendshipsPath = join(root, "server", "friendships.json");
const savedPath = join(root, "server", "saved.json");
const plansPath = join(root, "server", "plans.json");
const reviewsPath = join(root, "server", "reviews.json");
const sessions = new Map(); // Deliberately in-memory for this local prototype.

const send = (response, status, body) => { response.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); response.end(JSON.stringify(body)); };
const readBody = (request) => new Promise((resolve, reject) => { let raw = ""; request.on("data", (chunk) => { raw += chunk; }); request.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON body")); } }); });
const readJson = async (file, fallback = []) => existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : fallback;
const writeJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2));
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, username: user.username, handle: `@${user.username}`, photoUri: user.photoUri ?? null });
const friendIdsFor = (friendships, userId) => new Set(friendships.filter((friendship) => friendship.status === "accepted" && (friendship.requesterId === userId || friendship.recipientId === userId)).map((friendship) => friendship.requesterId === userId ? friendship.recipientId : friendship.requesterId));
const canViewSpot = (spot, userId, friendIds) => spot.userId === userId || (spot.visibility === "friends" && friendIds.has(spot.userId));
const withSpotFeedback = (spot, reviews, users) => {
  const feedback = reviews.filter((review) => review.spotId === spot.id);
  const communityRating = feedback.length ? Math.round((feedback.reduce((total, review) => total + review.rating, 0) / feedback.length) * 10) / 10 : null;
  const owner = users.find((account) => account.id === spot.userId);
  const ownerPhotoUris = Array.isArray(spot.photoUris) ? spot.photoUris : spot.photoUri ? [spot.photoUri] : [];
  const photos = [...ownerPhotoUris.map((uri, index) => ({ id: `spot-${spot.id}-${index}`, uri, userId: spot.userId, user: publicUser(owner) })), ...feedback.filter((review) => review.photoUri).map((review) => ({ id: `review-${review.id}`, uri: review.photoUri, userId: review.userId, user: publicUser(users.find((account) => account.id === review.userId)) }))];
  return { ...spot, photoUri: ownerPhotoUris[0] ?? null, photoUris: ownerPhotoUris, photos, communityRating, communityRatingCount: feedback.length, comments: feedback.filter((review) => review.comment || review.photoUri).sort((first, second) => second.createdAt.localeCompare(first.createdAt)).map((review) => ({ id: review.id, userId: review.userId, rating: review.rating, comment: review.comment, photoUri: review.photoUri ?? null, createdAt: review.createdAt, user: publicUser(users.find((account) => account.id === review.userId)) })) };
};

const hashPassword = async (password) => { const salt = randomBytes(16).toString("hex"); const hash = (await scrypt(password, salt, 64)).toString("hex"); return `${salt}:${hash}`; };
const verifyPassword = async (password, stored) => { const [salt, hash] = stored.split(":"); const actual = Buffer.from(await scrypt(password, salt, 64)); const expected = Buffer.from(hash, "hex"); return actual.length === expected.length && timingSafeEqual(actual, expected); };
const createSession = (userId) => { const token = randomUUID(); sessions.set(token, userId); return token; };
const authenticate = async (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const userId = token && sessions.get(token);
  if (!userId) { const error = new Error("Please sign in to continue."); error.status = 401; throw error; }
  const user = (await readJson(usersPath)).find((item) => item.id === userId);
  if (!user) { const error = new Error("Account not found."); error.status = 401; throw error; }
  return user;
};

const searchPlaces = async (query) => {
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not configured on the server.");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating" }, body: JSON.stringify({ textQuery: query, languageCode: "en", maxResultCount: 5 }) });
  if (!response.ok) throw new Error(`Google Places request failed (${response.status}).`);
  const { places = [] } = await response.json();
  return places.filter((place) => place.location).map((place) => ({ placeId: place.id, name: place.displayName?.text ?? "Unnamed venue", address: place.formattedAddress ?? "Address unavailable", latitude: place.location.latitude, longitude: place.location.longitude, rating: place.rating ?? 0 }));
};

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") { response.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" }); return response.end(); }
  try {
    if (request.method === "GET" && request.url === "/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/api/auth/register") {
      const { email, password, name, username } = await readBody(request);
      const normalizedEmail = String(email ?? "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return send(response, 400, { error: "Enter a valid email address." });
      if (typeof password !== "string" || password.length < 8) return send(response, 400, { error: "Use a password with at least 8 characters." });
      const normalizedUsername = String(username ?? "").trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) return send(response, 400, { error: "Username must be 3–20 characters: letters, numbers or underscores." });
      const users = await readJson(usersPath);
      if (users.some((user) => user.email === normalizedEmail)) return send(response, 409, { error: "An account with this email already exists." });
      if (users.some((user) => user.username === normalizedUsername)) return send(response, 409, { error: "That username is already taken." });
      const user = { id: randomUUID(), email: normalizedEmail, username: normalizedUsername, name: String(name ?? "").trim() || normalizedUsername, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
      await writeJson(usersPath, [...users, user]);
      return send(response, 201, { token: createSession(user.id), user: publicUser(user) });
    }
    if (request.method === "POST" && request.url === "/api/auth/login") {
      const { email, password } = await readBody(request);
      const user = (await readJson(usersPath)).find((item) => item.email === String(email ?? "").trim().toLowerCase());
      if (!user || !await verifyPassword(String(password ?? ""), user.passwordHash)) return send(response, 401, { error: "Incorrect email or password." });
      return send(response, 200, { token: createSession(user.id), user: publicUser(user) });
    }
    if (request.method === "POST" && request.url === "/api/auth/logout") { const token = request.headers.authorization?.replace(/^Bearer\s+/i, ""); if (token) sessions.delete(token); return send(response, 204, {}); }
    const user = await authenticate(request);
    if (request.method === "GET" && request.url === "/api/me") return send(response, 200, publicUser(user));
    if (request.method === "PATCH" && request.url === "/api/me") {
      const { photoUri } = await readBody(request);
      if (photoUri !== null && (typeof photoUri !== "string" || photoUri.length > 2000)) return send(response, 400, { error: "Invalid profile photo." });
      const users = await readJson(usersPath); const account = users.find((item) => item.id === user.id); account.photoUri = photoUri || null; await writeJson(usersPath, users);
      return send(response, 200, publicUser(account));
    }
    if (request.method === "POST" && request.url === "/api/me/password") {
      const { currentPassword, newPassword } = await readBody(request);
      if (!await verifyPassword(String(currentPassword ?? ""), user.passwordHash)) return send(response, 401, { error: "Your current password is incorrect." });
      if (typeof newPassword !== "string" || newPassword.length < 8) return send(response, 400, { error: "Use a new password with at least 8 characters." });
      const users = await readJson(usersPath); const account = users.find((item) => item.id === user.id); account.passwordHash = await hashPassword(newPassword); await writeJson(usersPath, users);
      return send(response, 204, {});
    }
    if (request.method === "DELETE" && request.url === "/api/me") {
      const userId = user.id; const ownedSpotIds = new Set((await readJson(spotsPath)).filter((spot) => spot.userId === userId).map((spot) => spot.id));
      await writeJson(spotsPath, (await readJson(spotsPath)).filter((spot) => spot.userId !== userId));
      await writeJson(savedPath, (await readJson(savedPath)).filter((item) => item.userId !== userId && !ownedSpotIds.has(item.spotId)));
      await writeJson(reviewsPath, (await readJson(reviewsPath)).filter((review) => review.userId !== userId && !ownedSpotIds.has(review.spotId)));
      await writeJson(friendshipsPath, (await readJson(friendshipsPath)).filter((item) => item.requesterId !== userId && item.recipientId !== userId));
      const remainingPlans = (await readJson(plansPath)).filter((plan) => plan.hostId !== userId).map((plan) => ({ ...plan, invites: plan.invites.filter((invite) => invite.userId !== userId) })).filter((plan) => plan.invites.length > 0);
      await writeJson(plansPath, remainingPlans);
      await writeJson(usersPath, (await readJson(usersPath)).filter((item) => item.id !== userId));
      for (const [token, sessionUserId] of sessions.entries()) if (sessionUserId === userId) sessions.delete(token);
      return send(response, 204, {});
    }
    if (request.method === "GET" && request.url?.startsWith("/api/spots")) {
      const friendships = await readJson(friendshipsPath);
      const friendIds = friendIdsFor(friendships, user.id);
      const params = new URL(request.url, "http://localhost").searchParams;
      const mode = params.get("mode") ?? "mine";
      const search = (params.get("q") ?? "").trim().toLowerCase();
      const filters = (params.get("filters") ?? "").split(",").filter(Boolean);
      const latitude = Number(params.get("latitude")); const longitude = Number(params.get("longitude"));
      const latitudeDelta = Math.max(Number(params.get("latitudeDelta")) || 0.1, 0.005); const longitudeDelta = Math.max(Number(params.get("longitudeDelta")) || 0.1, 0.005);
      const candidates = (await readJson(spotsPath)).filter((spot) => mode === "friends" ? friendIds.has(spot.userId) && spot.visibility === "friends" : spot.userId === user.id);
      const users = await readJson(usersPath); const reviews = await readJson(reviewsPath);
      const matchesSearch = (spot) => { const searchable = `${spot.name} ${spot.address} ${spot.category} ${spot.customCategory ?? ""} ${spot.description ?? spot.note ?? ""}`.toLowerCase(); return !search || searchable.includes(search) || (search.includes("climb") && spot.category === "Bouldering"); };
      const matchesFilter = (spot) => !filters.length || filters.includes(spot.category);
      const distanceFromCentreKm = (spot) => {
        const latitudeRadians = latitude * Math.PI / 180;
        const northSouthKm = (spot.latitude - latitude) * 111.32;
        const eastWestKm = (spot.longitude - longitude) * 111.32 * Math.cos(latitudeRadians);
        return Math.hypot(northSouthKm, eastWestKm);
      };
      // The horizontal edge of the viewport defines the discovery radius: this
      // avoids loading corner pins that are technically on-screen but feel far away.
      const viewportRadiusKm = Math.abs(longitudeDelta) * 0.5 * 111.32 * Math.cos(latitude * Math.PI / 180);
      const visible = Number.isFinite(latitude) && Number.isFinite(longitude) ? candidates.filter((spot) => matchesSearch(spot) && matchesFilter(spot) && distanceFromCentreKm(spot) <= viewportRadiusKm) : candidates.filter((spot) => matchesSearch(spot) && matchesFilter(spot));
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && params.get("cluster") === "1") {
        const cellLatitude = latitudeDelta / 5; const cellLongitude = longitudeDelta / 5; const groups = new Map();
        for (const spot of visible) { const key = `${Math.floor(spot.latitude / cellLatitude)}:${Math.floor(spot.longitude / cellLongitude)}`; const group = groups.get(key) ?? []; group.push(spot); groups.set(key, group); }
        const clusters = [...groups.entries()].flatMap(([key, group]) => group.length === 1 ? group : [{ id: `cluster-${key}`, isCluster: true, clusterCount: group.length, latitude: group.reduce((sum, spot) => sum + spot.latitude, 0) / group.length, longitude: group.reduce((sum, spot) => sum + spot.longitude, 0) / group.length, name: "Nearby places", category: "Other", address: "", rating: 0, personalRating: 0, description: "", note: "", visibility: "friends", pinnedBy: "", ownerType: "current-user" }]);
        return send(response, 200, clusters);
      }
      const inView = Number.isFinite(latitude) && Number.isFinite(longitude) ? visible.sort((a, b) => ((a.latitude - latitude) ** 2 + (a.longitude - longitude) ** 2) - ((b.latitude - latitude) ** 2 + (b.longitude - longitude) ** 2)).slice(0, 15) : visible.slice(0, 15);
      return send(response, 200, inView.map((spot) => withSpotFeedback(spot, reviews, users)));
    }
    if (request.method === "GET" && request.url === "/api/saved") {
      const friendships = await readJson(friendshipsPath); const friendIds = friendIdsFor(friendships, user.id); const saved = await readJson(savedPath); const spots = await readJson(spotsPath); const ids = new Set(saved.filter((item) => item.userId === user.id).map((item) => item.spotId));
      const users = await readJson(usersPath); const reviews = await readJson(reviewsPath);
      return send(response, 200, spots.filter((spot) => ids.has(spot.id) && canViewSpot(spot, user.id, friendIds)).map((spot) => withSpotFeedback(spot, reviews, users)));
    }
    if (request.method === "GET" && request.url === "/api/plans") {
      const users = await readJson(usersPath); const spots = await readJson(spotsPath); const plans = await readJson(plansPath);
      return send(response, 200, plans.filter((plan) => new Date(plan.scheduledAt).getTime() > Date.now() && (plan.hostId === user.id || plan.invites.some((invite) => invite.userId === user.id))).map((plan) => ({ ...plan, spot: spots.find((spot) => spot.id === plan.spotId), host: publicUser(users.find((item) => item.id === plan.hostId)), invites: plan.invites.map((invite) => ({ ...invite, user: publicUser(users.find((item) => item.id === invite.userId)) })) })));
    }
    if (request.method === "GET" && request.url === "/api/friends") {
      const users = await readJson(usersPath); const friendships = await readJson(friendshipsPath);
      const toUser = (id) => publicUser(users.find((item) => item.id === id));
      return send(response, 200, { friends: [...friendIdsFor(friendships, user.id)].map(toUser), incoming: friendships.filter((item) => item.status === "pending" && item.recipientId === user.id).map((item) => ({ ...item, user: toUser(item.requesterId) })), outgoing: friendships.filter((item) => item.status === "pending" && item.requesterId === user.id).map((item) => ({ ...item, user: toUser(item.recipientId) })) });
    }
    const friendProfileMatch = request.url?.match(/^\/api\/friends\/([^/]+)\/profile$/);
    if (request.method === "GET" && friendProfileMatch) {
      const friendId = decodeURIComponent(friendProfileMatch[1]); const friendships = await readJson(friendshipsPath); const friendIds = friendIdsFor(friendships, user.id);
      if (!friendIds.has(friendId)) return send(response, 404, { error: "Friend not found." });
      const users = await readJson(usersPath); const friend = users.find((item) => item.id === friendId);
      if (!friend) return send(response, 404, { error: "Friend not found." });
      const spots = (await readJson(spotsPath)).filter((spot) => spot.userId === friend.id && spot.visibility === "friends");
      const reviews = await readJson(reviewsPath);
      return send(response, 200, { user: publicUser(friend), locationCount: spots.length, friendCount: friendIdsFor(friendships, friend.id).size, spots: spots.slice(0, 6).map((spot) => withSpotFeedback(spot, reviews, users)) });
    }
    if (request.method === "POST" && request.url === "/api/friends/requests") {
      const { username } = await readBody(request); const normalized = String(username ?? "").trim().toLowerCase().replace(/^@/, ""); const users = await readJson(usersPath); const recipient = users.find((item) => item.username === normalized);
      if (!recipient) return send(response, 404, { error: "No SpotCheck account has that username." });
      if (recipient.id === user.id) return send(response, 400, { error: "You cannot add yourself." });
      const friendships = await readJson(friendshipsPath); if (friendships.some((item) => (item.requesterId === user.id && item.recipientId === recipient.id) || (item.requesterId === recipient.id && item.recipientId === user.id))) return send(response, 409, { error: "A friend request or friendship already exists." });
      const friendship = { id: randomUUID(), requesterId: user.id, recipientId: recipient.id, status: "pending", createdAt: new Date().toISOString() }; await writeJson(friendshipsPath, [...friendships, friendship]); return send(response, 201, friendship);
    }
    const acceptMatch = request.url?.match(/^\/api\/friends\/requests\/([^/]+)\/accept$/);
    if (request.method === "POST" && acceptMatch) { const friendships = await readJson(friendshipsPath); const requestId = acceptMatch[1]; const friendship = friendships.find((item) => item.id === requestId && item.recipientId === user.id && item.status === "pending"); if (!friendship) return send(response, 404, { error: "Friend request not found." }); friendship.status = "accepted"; await writeJson(friendshipsPath, friendships); return send(response, 200, friendship); }
    if (request.method === "POST" && request.url === "/api/places/search") { const { query } = await readBody(request); if (typeof query !== "string" || query.trim().length < 3) return send(response, 400, { error: "Enter at least three characters." }); return send(response, 200, await searchPlaces(query.trim())); }
    const reviewMatch = request.url?.match(/^\/api\/spots\/([^/]+)\/reviews$/);
    if (request.method === "POST" && reviewMatch) {
      const spotId = decodeURIComponent(reviewMatch[1]); const { rating, comment = "", photoUri = null } = await readBody(request); const friendships = await readJson(friendshipsPath); const friendIds = friendIdsFor(friendships, user.id); const spots = await readJson(spotsPath); const spot = spots.find((item) => item.id === spotId);
      if (!spot || spot.visibility !== "friends" || !friendIds.has(spot.userId)) return send(response, 404, { error: "You can only review a friend's shared recommendation." });
      const score = Number(rating); if (!Number.isInteger(score) || score < 1 || score > 5) return send(response, 400, { error: "Choose a rating from 1 to 5." });
      if (photoUri !== null && (typeof photoUri !== "string" || photoUri.length > 2000)) return send(response, 400, { error: "Invalid photo." });
      const reviews = await readJson(reviewsPath); const cleanComment = String(comment).trim().slice(0, 280); const existing = reviews.find((review) => review.spotId === spotId && review.userId === user.id);
      if (existing) { existing.rating = score; existing.comment = cleanComment; existing.photoUri = photoUri; existing.createdAt = new Date().toISOString(); } else reviews.push({ id: randomUUID(), spotId, userId: user.id, rating: score, comment: cleanComment, photoUri, createdAt: new Date().toISOString() });
      await writeJson(reviewsPath, reviews); return send(response, 200, withSpotFeedback(spot, reviews, await readJson(usersPath)));
    }
    if (request.method === "POST" && request.url === "/api/plans") {
      const { spotId, scheduledAt, inviteeIds } = await readBody(request); const date = new Date(scheduledAt); const friendships = await readJson(friendshipsPath); const friendIds = friendIdsFor(friendships, user.id); const spot = (await readJson(spotsPath)).find((item) => item.id === spotId);
      if (!spot || !canViewSpot(spot, user.id, friendIds)) return send(response, 404, { error: "That place is not available." });
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return send(response, 400, { error: "Choose a future date and time." });
      const recipients = [...new Set(Array.isArray(inviteeIds) ? inviteeIds : [])].filter((id) => friendIds.has(id));
      if (!recipients.length) return send(response, 400, { error: "Choose at least one friend." });
      const plan = { id: randomUUID(), spotId, hostId: user.id, scheduledAt: date.toISOString(), invites: recipients.map((userId) => ({ userId, status: "pending" })), createdAt: new Date().toISOString() }; await writeJson(plansPath, [...await readJson(plansPath), plan]); return send(response, 201, plan);
    }
    const planResponseMatch = request.url?.match(/^\/api\/plans\/([^/]+)\/respond$/);
    if (request.method === "POST" && planResponseMatch) { const { status } = await readBody(request); if (!["accepted", "maybe", "declined"].includes(status)) return send(response, 400, { error: "Invalid response." }); const plans = await readJson(plansPath); const plan = plans.find((item) => item.id === planResponseMatch[1]); const invite = plan?.invites.find((item) => item.userId === user.id); if (!invite) return send(response, 404, { error: "Plan invitation not found." }); invite.status = status; await writeJson(plansPath, plans); return send(response, 200, plan); }
    const planDeleteMatch = request.url?.match(/^\/api\/plans\/([^/]+)$/);
    if (request.method === "DELETE" && planDeleteMatch) { const plans = await readJson(plansPath); const plan = plans.find((item) => item.id === planDeleteMatch[1]); if (!plan || plan.hostId !== user.id) return send(response, 404, { error: "Only the plan host can delete this plan." }); await writeJson(plansPath, plans.filter((item) => item.id !== plan.id)); return send(response, 204, {}); }
    const saveMatch = request.url?.match(/^\/api\/saved\/([^/]+)$/);
    if (saveMatch && request.method === "POST") {
      const spotId = decodeURIComponent(saveMatch[1]); const friendships = await readJson(friendshipsPath); const spot = (await readJson(spotsPath)).find((item) => item.id === spotId);
      if (!spot || !canViewSpot(spot, user.id, friendIdsFor(friendships, user.id))) return send(response, 404, { error: "That pin is no longer available." });
      const saved = await readJson(savedPath); if (!saved.some((item) => item.userId === user.id && item.spotId === spotId)) await writeJson(savedPath, [...saved, { id: randomUUID(), userId: user.id, spotId, createdAt: new Date().toISOString() }]);
      return send(response, 201, { spotId });
    }
    if (saveMatch && request.method === "DELETE") { const spotId = decodeURIComponent(saveMatch[1]); const saved = await readJson(savedPath); await writeJson(savedPath, saved.filter((item) => !(item.userId === user.id && item.spotId === spotId))); return send(response, 204, {}); }
    const spotDeleteMatch = request.url?.match(/^\/api\/spots\/([^/]+)$/);
    if (request.method === "DELETE" && spotDeleteMatch) {
      const spotId = decodeURIComponent(spotDeleteMatch[1]); const spots = await readJson(spotsPath); const spot = spots.find((item) => item.id === spotId);
      if (!spot || spot.userId !== user.id) return send(response, 404, { error: "Only the person who pinned this place can delete it." });
      await writeJson(spotsPath, spots.filter((item) => item.id !== spotId));
      await writeJson(savedPath, (await readJson(savedPath)).filter((item) => item.spotId !== spotId));
      await writeJson(reviewsPath, (await readJson(reviewsPath)).filter((review) => review.spotId !== spotId));
      await writeJson(plansPath, (await readJson(plansPath)).filter((item) => item.spotId !== spotId));
      return send(response, 204, {});
    }
    if (request.method === "POST" && request.url === "/api/spots") {
      const { place, category, customCategory = "", personalRating, description = "", photoUris = [], visibility = "private" } = await readBody(request);
      if (!place?.name || !place?.address || typeof place?.latitude !== "number" || typeof place?.longitude !== "number") return send(response, 400, { error: "A valid place selection is required." });
      if (!["private", "friends"].includes(visibility)) return send(response, 400, { error: "Invalid visibility setting." });
      if (!["Coffee", "Restaurant", "Pub", "Cocktail Bar", "Bakery", "Brunch", "Padel", "Tennis", "Football", "Gym", "Bouldering", "Yoga", "Pilates", "Running", "Cycling", "Swimming", "Golf", "Cinema", "Live Music", "Theatre", "Museum", "Art Gallery", "Gaming", "Shopping", "Market", "Park", "Walk", "Wellness", "Other"].includes(category)) return send(response, 400, { error: "Choose a category." });
      if (category === "Other" && String(customCategory).trim().length < 2) return send(response, 400, { error: "Add a category for this place." });
      if (!Number.isFinite(Number(personalRating)) || Number(personalRating) < 1 || Number(personalRating) > 5) return send(response, 400, { error: "Choose a rating from 1 to 5." });
      if (!Array.isArray(photoUris) || photoUris.length > 5 || photoUris.some((uri) => typeof uri !== "string" || uri.length > 2000)) return send(response, 400, { error: "Add up to five valid photos." });
      const cleanDescription = String(description).trim().slice(0, 280);
      const spot = { id: `place-${place.placeId ?? Date.now()}`, userId: user.id, name: place.name, category, customCategory: category === "Other" ? String(customCategory).trim().slice(0, 40) : null, latitude: place.latitude, longitude: place.longitude, address: place.address, rating: place.rating || 0, personalRating: Number(personalRating), description: cleanDescription, photoUri: photoUris[0] ?? null, photoUris, visibility, note: cleanDescription || "No note added yet.", pinnedBy: `@${user.username}`, ownerType: "current-user", googlePlaceId: place.placeId };
      const spots = await readJson(spotsPath);
      await writeJson(spotsPath, [spot, ...spots.filter((item) => !(item.userId === user.id && item.id === spot.id))]);
      return send(response, 201, spot);
    }
    return send(response, 404, { error: "Not found" });
  } catch (error) { return send(response, error.status ?? 500, { error: error instanceof Error ? error.message : "Unexpected server error" }); }
});
server.listen(port, () => console.log(`SpotCheck API listening on http://localhost:${port}`));
