const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
const empty = (status = 204) => new Response(null, { status, headers: { "Access-Control-Allow-Origin": "*" } });
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const encoder = new TextEncoder();
const categories = new Set(["Coffee", "Restaurant", "Pub", "Cocktail Bar", "Bakery", "Brunch", "Padel", "Tennis", "Football", "Gym", "Bouldering", "Yoga", "Pilates", "Running", "Cycling", "Swimming", "Golf", "Cinema", "Live Music", "Theatre", "Museum", "Art Gallery", "Gaming", "Shopping", "Market", "Park", "Walk", "Wellness", "Other"]);

const base64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${base64(salt)}:${base64(bits)}`;
}
async function checkPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  return passwordHash(password, fromBase64(salt)).then((actual) => actual === `${salt}:${expected}`);
}
const publicUser = (user) => user && ({ id: user.id, email: user.email, name: user.name, username: user.username, handle: `@${user.username}`, photoUri: null });
const first = async (statement) => (await statement.first()) ?? null;
const all = async (statement) => (await statement.all()).results;
const body = async (request) => request.json().catch(() => ({}));

async function authenticated(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Please sign in to continue."), { status: 401 });
  const user = await first(env.DB.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?").bind(token));
  if (!user) throw Object.assign(new Error("Please sign in to continue."), { status: 401 });
  return { user, token };
}
async function friendIds(env, userId) {
  const rows = await all(env.DB.prepare("SELECT requester_id, recipient_id FROM friendships WHERE status='accepted' AND (requester_id=? OR recipient_id=?)").bind(userId, userId));
  return new Set(rows.map((row) => row.requester_id === userId ? row.recipient_id : row.requester_id));
}
async function canView(env, spot, userId) { return spot.user_id === userId || (spot.visibility === "friends" && (await friendIds(env, userId)).has(spot.user_id)); }
function isInVisibleMapArea(spot, latitude, longitude, latitudeDelta, longitudeDelta) {
  if (![latitude, longitude, latitudeDelta, longitudeDelta].every(Number.isFinite)) return true;
  const latitudeRadius = Math.max(latitudeDelta / 2, 0.002);
  const longitudeRadius = Math.max(longitudeDelta / 2, 0.002);
  const latitudeDistance = (Number(spot.latitude) - latitude) / latitudeRadius;
  const longitudeDistance = (Number(spot.longitude) - longitude) / longitudeRadius;
  return latitudeDistance ** 2 + longitudeDistance ** 2 <= 1.15;
}
function makeClusters(spots, latitudeDelta, longitudeDelta) {
  // Keep markers comfortably tappable: about seven columns by ten rows at most.
  // Cells shrink with the map, so a cluster naturally separates as the user zooms in.
  const latitudeCellSize = Math.max(latitudeDelta / 10, 0.00012);
  const longitudeCellSize = Math.max(longitudeDelta / 7, 0.00012);
  const groups = new Map();
  for (const spot of spots) {
    const key = `${Math.floor(Number(spot.latitude) / latitudeCellSize)}:${Math.floor(Number(spot.longitude) / longitudeCellSize)}`;
    groups.set(key, [...(groups.get(key) ?? []), spot]);
  }
  return [...groups.entries()].map(([key, members]) => {
    if (members.length === 1) return members[0];
    return {
      id: `cluster-${key}`,
      name: `${members.length} recommendations`,
      category: "Other",
      latitude: members.reduce((total, spot) => total + Number(spot.latitude), 0) / members.length,
      longitude: members.reduce((total, spot) => total + Number(spot.longitude), 0) / members.length,
      address: "",
      rating: 0,
      personalRating: 0,
      description: "",
      note: "",
      visibility: "friends",
      pinnedBy: "",
      ownerType: "current-user",
      isCluster: true,
      clusterCount: members.length,
    };
  });
}
async function photosFor() { return []; }
async function shapeSpot(env, spot) {
  const owner = await first(env.DB.prepare("SELECT * FROM users WHERE id=?").bind(spot.user_id));
  const reviews = await all(env.DB.prepare("SELECT r.*,u.email,u.name,u.username,u.photo_uri FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.spot_id=? ORDER BY r.created_at DESC").bind(spot.id));
  const photos = await photosFor();
  const average = reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10 : null;
  return { id: spot.id, userId: spot.user_id, name: spot.name, category: spot.category, latitude: spot.latitude, longitude: spot.longitude, address: spot.address, rating: spot.google_rating, personalRating: spot.personal_rating, description: spot.description, note: spot.description || "No note added yet.", visibility: spot.visibility, pinnedBy: `@${owner.username}`, ownerType: "friend", photoUri: photos[0]?.uri ?? null, photoUris: photos.map((photo) => photo.uri), photos, communityRating: average, communityRatingCount: reviews.length, comments: reviews.filter((review) => review.comment).map((review) => ({ id: review.id, userId: review.user_id, rating: review.rating, comment: review.comment, photoUri: null, createdAt: review.created_at, user: publicUser(review) })) };
}
async function googleSearch(env, query) {
  if (!env.GOOGLE_PLACES_API_KEY) throw new Error("Google Places is not configured.");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating" }, body: JSON.stringify({ textQuery: query, languageCode: "en", maxResultCount: 5 }) });
  if (!response.ok) throw new Error("Google Places search failed.");
  const { places = [] } = await response.json();
  return places.filter((place) => place.location).map((place) => ({ placeId: place.id, name: place.displayName?.text ?? "Unnamed venue", address: place.formattedAddress ?? "Address unavailable", latitude: place.location.latitude, longitude: place.location.longitude, rating: place.rating ?? 0 }));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return empty();
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (request.method === "GET" && path === "/health") return json({ ok: true });
      if (request.method === "POST" && path === "/api/auth/register") {
        const { email, password, name, username } = await body(request); const normalizedEmail = String(email ?? "").trim().toLowerCase(); const normalizedUsername = String(username ?? "").trim().toLowerCase().replace(/^@/, "");
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return json({ error: "Enter a valid email address." }, 400);
        if (typeof password !== "string" || password.length < 8) return json({ error: "Use a password with at least 8 characters." }, 400);
        if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) return json({ error: "Username must be 3–20 characters: letters, numbers or underscores." }, 400);
        if (await first(env.DB.prepare("SELECT id FROM users WHERE email=? OR username=?").bind(normalizedEmail, normalizedUsername))) return json({ error: "Email or username is already in use." }, 409);
        const user = { id: id(), email: normalizedEmail, username: normalizedUsername, name: String(name ?? "").trim() || normalizedUsername, password_hash: await passwordHash(password), created_at: now() };
        const token = id(); await env.DB.batch([env.DB.prepare("INSERT INTO users (id,email,username,name,password_hash,created_at) VALUES (?,?,?,?,?,?)").bind(user.id,user.email,user.username,user.name,user.password_hash,user.created_at), env.DB.prepare("INSERT INTO sessions (token,user_id,created_at) VALUES (?,?,?)").bind(token,user.id,now())]);
        return json({ token, user: publicUser(user) }, 201);
      }
      if (request.method === "POST" && path === "/api/auth/login") {
        const { email, password } = await body(request); const user = await first(env.DB.prepare("SELECT * FROM users WHERE email=?").bind(String(email ?? "").trim().toLowerCase()));
        if (!user || !await checkPassword(String(password ?? ""), user.password_hash)) return json({ error: "Incorrect email or password." }, 401);
        const token = id(); await env.DB.prepare("INSERT INTO sessions (token,user_id,created_at) VALUES (?,?,?)").bind(token,user.id,now()).run(); return json({ token, user: publicUser(user) });
      }
      if (request.method === "POST" && path === "/api/auth/logout") { const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i,""); if (token) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run(); return empty(); }
      const { user, token } = await authenticated(request, env);
      if (request.method === "GET" && path === "/api/me") return json(publicUser(user));
      if (request.method === "POST" && path === "/api/places/search") { const { query } = await body(request); if (String(query ?? "").trim().length < 3) return json({ error: "Enter at least three characters." },400); return json(await googleSearch(env, query.trim())); }
      if (path === "/api/uploads" || path.startsWith("/api/files/")) return json({ error: "Photo uploads are not enabled in this hosted preview." }, 501);
      if (request.method === "GET" && path === "/api/spots") {
        const mode=url.searchParams.get("mode") ?? "mine", filters=(url.searchParams.get("filters") ?? "").split(",").filter(Boolean), latitude=Number(url.searchParams.get("latitude")), longitude=Number(url.searchParams.get("longitude")), latitudeDelta=Number(url.searchParams.get("latitudeDelta")), longitudeDelta=Number(url.searchParams.get("longitudeDelta")), wantsClusters=url.searchParams.get("cluster")==="1"; const friends=await friendIds(env,user.id);
        const rows=await all(env.DB.prepare(mode==="friends" ? "SELECT * FROM spots WHERE visibility='friends'" : "SELECT * FROM spots WHERE user_id=?").bind(...(mode==="friends"?[]:[user.id])));
        const filtered=rows.filter((spot)=>mode==="friends"?friends.has(spot.user_id):true).filter((spot)=>!filters.length||filters.includes(spot.category)).filter((spot)=>isInVisibleMapArea(spot,latitude,longitude,latitudeDelta,longitudeDelta)).sort((a,b)=>Number.isFinite(latitude)?(a.latitude-latitude)**2+(a.longitude-longitude)**2-((b.latitude-latitude)**2+(b.longitude-longitude)**2):0);
        if (wantsClusters) {
          const clusters=makeClusters(filtered,latitudeDelta,longitudeDelta);
          return json(await Promise.all(clusters.map((spot)=>spot.isCluster?spot:shapeSpot(env,spot))));
        }
        return json(await Promise.all(filtered.slice(0,60).map((spot)=>shapeSpot(env,spot))));
      }
      if (request.method === "POST" && path === "/api/spots") {
        const { place, category, personalRating, description="", photoUris=[], visibility="private" }=await body(request);
        if (!place?.name || !place?.address || !Number.isFinite(place?.latitude) || !Number.isFinite(place?.longitude)) return json({ error:"A valid place selection is required."},400);
        if (!categories.has(category) || !["private","friends"].includes(visibility) || !Number.isFinite(Number(personalRating))) return json({error:"Choose a category, rating and visibility."},400);
        const spot={id:`place-${place.placeId ?? id()}`,user_id:user.id,name:place.name,category,latitude:place.latitude,longitude:place.longitude,address:place.address,google_rating:Number(place.rating ?? 0),personal_rating:Number(personalRating),description:String(description).trim().slice(0,280),visibility,google_place_id:place.placeId ?? null,created_at:now()};
        await env.DB.prepare("INSERT OR REPLACE INTO spots (id,user_id,name,category,latitude,longitude,address,google_rating,personal_rating,description,visibility,google_place_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(spot.id,spot.user_id,spot.name,spot.category,spot.latitude,spot.longitude,spot.address,spot.google_rating,spot.personal_rating,spot.description,spot.visibility,spot.google_place_id,spot.created_at).run();
        return json(await shapeSpot(env,spot),201);
      }
      const spotId = path.match(/^\/api\/spots\/([^/]+)$/)?.[1];
      if (request.method==="DELETE" && spotId) { const spot=await first(env.DB.prepare("SELECT * FROM spots WHERE id=?").bind(decodeURIComponent(spotId))); if(!spot||spot.user_id!==user.id)return json({error:"Only the person who pinned this place can delete it."},404); await env.DB.prepare("DELETE FROM spots WHERE id=?").bind(spot.id).run(); return empty(); }
      if (request.method==="GET" && path==="/api/saved") { const rows=await all(env.DB.prepare("SELECT s.* FROM saved_places p JOIN spots s ON s.id=p.spot_id WHERE p.user_id=? ORDER BY p.created_at DESC").bind(user.id)); return json(await Promise.all((await Promise.all(rows.map(async spot=>(await canView(env,spot,user.id))?spot:null))).filter(Boolean).map(spot=>shapeSpot(env,spot)))); }
      const savedId=path.match(/^\/api\/saved\/([^/]+)$/)?.[1];
      if(savedId&&request.method==="POST"){const spot=await first(env.DB.prepare("SELECT * FROM spots WHERE id=?").bind(decodeURIComponent(savedId)));if(!spot||!await canView(env,spot,user.id))return json({error:"That pin is no longer available."},404);await env.DB.prepare("INSERT OR IGNORE INTO saved_places (user_id,spot_id,created_at) VALUES (?,?,?)").bind(user.id,spot.id,now()).run();return json({spotId:spot.id},201);}
      if(savedId&&request.method==="DELETE"){await env.DB.prepare("DELETE FROM saved_places WHERE user_id=? AND spot_id=?").bind(user.id,decodeURIComponent(savedId)).run();return empty();}
      if(request.method==="GET"&&path==="/api/friends"){const rows=await all(env.DB.prepare("SELECT f.id AS friendship_id,f.requester_id,f.recipient_id,f.status,f.created_at,u.id,u.email,u.username,u.name,u.photo_uri FROM friendships f JOIN users u ON u.id=CASE WHEN f.requester_id=? THEN f.recipient_id ELSE f.requester_id END WHERE f.requester_id=? OR f.recipient_id=?").bind(user.id,user.id,user.id));return json({friends:rows.filter(r=>r.status==="accepted").map(publicUser),incoming:rows.filter(r=>r.status==="pending"&&r.recipient_id===user.id).map(r=>({id:r.friendship_id,user:publicUser(r)})),outgoing:rows.filter(r=>r.status==="pending"&&r.requester_id===user.id).map(r=>({id:r.friendship_id,user:publicUser(r)}))});}
      if(request.method==="POST"&&path==="/api/friends/requests"){const {username}=await body(request);const name=String(username??"").trim().toLowerCase().replace(/^@/,"");const recipient=await first(env.DB.prepare("SELECT * FROM users WHERE username=?").bind(name));if(!recipient)return json({error:"No Recs account has that username."},404);if(recipient.id===user.id)return json({error:"You cannot add yourself."},400);const existing=await first(env.DB.prepare("SELECT id FROM friendships WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)").bind(user.id,recipient.id,recipient.id,user.id));if(existing)return json({error:"A friend request or friendship already exists."},409);const requestId=id();await env.DB.prepare("INSERT INTO friendships (id,requester_id,recipient_id,status,created_at) VALUES (?,?,?,?,?)").bind(requestId,user.id,recipient.id,"pending",now()).run();return json({id:requestId},201);}
      const acceptId=path.match(/^\/api\/friends\/requests\/([^/]+)\/accept$/)?.[1];
      if(request.method==="POST"&&acceptId){const friendship=await first(env.DB.prepare("SELECT * FROM friendships WHERE id=?").bind(acceptId));if(!friendship)return json({error:"Friend request not found."},404);if(friendship.recipient_id!==user.id)return json({error:"Only the invited person can accept this request."},403);if(friendship.status==="pending")await env.DB.prepare("UPDATE friendships SET status='accepted' WHERE id=?").bind(acceptId).run();return json({id:acceptId,status:"accepted"});}
      const profileId=path.match(/^\/api\/friends\/([^/]+)\/profile$/)?.[1];
      if(request.method==="GET"&&profileId){const friend=await first(env.DB.prepare("SELECT * FROM users WHERE id=?").bind(decodeURIComponent(profileId)));if(!friend||!(await friendIds(env,user.id)).has(friend.id))return json({error:"Friend not found."},404);const rows=await all(env.DB.prepare("SELECT * FROM spots WHERE user_id=? AND visibility='friends' ORDER BY created_at DESC LIMIT 6").bind(friend.id));return json({user:publicUser(friend),locationCount:rows.length,friendCount:(await friendIds(env,friend.id)).size,spots:await Promise.all(rows.map(s=>shapeSpot(env,s)))});}
      if(request.method==="PATCH"&&path==="/api/me"){const {photoUri}=await body(request);if(photoUri)return json({error:"Photo uploads are not enabled in this hosted preview."},400);await env.DB.prepare("UPDATE users SET photo_uri=NULL WHERE id=?").bind(user.id).run();return json(publicUser({...user,photo_uri:null}));}
      if(request.method==="POST"&&path==="/api/me/password"){const {currentPassword,newPassword}=await body(request);if(!await checkPassword(String(currentPassword??""),user.password_hash))return json({error:"Your current password is incorrect."},401);if(String(newPassword??"").length<8)return json({error:"Use a new password with at least 8 characters."},400);await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(await passwordHash(newPassword),user.id).run();return empty();}
      if(request.method==="DELETE"&&path==="/api/me"){await env.DB.batch([env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),env.DB.prepare("DELETE FROM users WHERE id=?").bind(user.id)]);return empty();}
      const reviewId=path.match(/^\/api\/spots\/([^/]+)\/reviews$/)?.[1];
      if(request.method==="POST"&&reviewId){const spot=await first(env.DB.prepare("SELECT * FROM spots WHERE id=?").bind(decodeURIComponent(reviewId)));if(!spot||spot.visibility!=="friends"||!(await friendIds(env,user.id)).has(spot.user_id))return json({error:"You can only review a friend's shared recommendation."},404);const {rating,comment=""}=await body(request);if(!Number.isInteger(Number(rating))||rating<1||rating>5)return json({error:"Choose a rating from 1 to 5."},400);await env.DB.prepare("INSERT INTO reviews (id,spot_id,user_id,rating,comment,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(spot_id,user_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,created_at=excluded.created_at").bind(id(),spot.id,user.id,Number(rating),String(comment).trim().slice(0,280),now()).run();return json(await shapeSpot(env,spot));}
      if(request.method==="GET"&&path==="/api/plans"){const rows=await all(env.DB.prepare("SELECT p.* FROM plans p LEFT JOIN plan_invites i ON i.plan_id=p.id WHERE (p.host_id=? OR i.user_id=?) AND p.scheduled_at>? GROUP BY p.id ORDER BY p.scheduled_at").bind(user.id,user.id,now()));const plans=await Promise.all(rows.map(async plan=>{const spot=await first(env.DB.prepare("SELECT * FROM spots WHERE id=?").bind(plan.spot_id)),host=await first(env.DB.prepare("SELECT * FROM users WHERE id=?").bind(plan.host_id)),invites=await all(env.DB.prepare("SELECT i.*,u.id,u.email,u.username,u.name,u.photo_uri FROM plan_invites i JOIN users u ON u.id=i.user_id WHERE i.plan_id=?").bind(plan.id));return {id:plan.id,scheduledAt:plan.scheduled_at,hostId:plan.host_id,host:publicUser(host),spot:spot&&await shapeSpot(env,spot),invites:invites.map(i=>({userId:i.user_id,status:i.status,user:publicUser(i)}))};}));return json(plans);}
      if(request.method==="POST"&&path==="/api/plans"){const {spotId,scheduledAt,inviteeIds=[]}=await body(request),spot=await first(env.DB.prepare("SELECT * FROM spots WHERE id=?").bind(spotId));if(!spot||!await canView(env,spot,user.id)||new Date(scheduledAt)<=new Date())return json({error:"Choose an available place and future date."},400);const allowed=await friendIds(env,user.id),recipients=[...new Set(inviteeIds)].filter(i=>allowed.has(i));if(!recipients.length)return json({error:"Choose at least one friend."},400);const planId=id();await env.DB.batch([env.DB.prepare("INSERT INTO plans (id,spot_id,host_id,scheduled_at,created_at) VALUES (?,?,?,?,?)").bind(planId,spot.id,user.id,new Date(scheduledAt).toISOString(),now()),...recipients.map(i=>env.DB.prepare("INSERT INTO plan_invites (plan_id,user_id,status) VALUES (?,?,?)").bind(planId,i,"pending"))]);return json({id:planId},201);}
      const rsvp=path.match(/^\/api\/plans\/([^/]+)\/respond$/)?.[1];
      if(request.method==="POST"&&rsvp){const {status}=await body(request);if(!["accepted","maybe","declined"].includes(status))return json({error:"Invalid response."},400);const result=await env.DB.prepare("UPDATE plan_invites SET status=? WHERE plan_id=? AND user_id=?").bind(status,rsvp,user.id).run();return result.meta.changes?json({id:rsvp,status}):json({error:"Plan invitation not found."},404);}
      const planId=path.match(/^\/api\/plans\/([^/]+)$/)?.[1];
      if(request.method==="DELETE"&&planId){const result=await env.DB.prepare("DELETE FROM plans WHERE id=? AND host_id=?").bind(planId,user.id).run();return result.meta.changes?empty():json({error:"Only the plan host can delete this plan."},404);}
      return json({ error: "Not found" },404);
    } catch (error) { return json({ error: error instanceof Error ? error.message : "Unexpected server error" }, error.status ?? 500); }
  }
};
