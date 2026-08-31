# SpotCheck MVP

An Expo/React Native local prototype for saving places you want to visit.

## Run

Install Node.js first, then run:

```bash
npm install
npx expo start
```

Open the app using Expo Go, an Android emulator, or an iOS simulator.

## Real venue search (Google Places)

1. In Google Cloud, enable **Places API (New)** and create an API key.
2. Copy `.env.example` to `.env`, put the key in `GOOGLE_PLACES_API_KEY`, and replace the example `EXPO_PUBLIC_API_URL` with your computer's LAN IP when using a physical phone.
3. Start the private local backend with `npm run server`.
4. Start Expo in a second terminal with `npx expo start -c`.

The Add flow searches Google Places through the backend, lets a user confirm the matching venue and then persists the selected name, address, coordinates and category in `server/spots.json`.

## Included

- Real venue search through the local Google Places backend.
- Personal pins with a 1–5 rating, category, description, and optional photo.
- A pin details sheet with your photo, rating, note, and real Apple Maps / Google Maps directions.

## Local accounts

Create an account with email and password on the first screen. Passwords are salted and hashed in `server/users.json`; signed-in sessions are stored securely on the device. Each account only receives its own pins. Existing unassigned local pins are intentionally excluded from every account.

The local backend keeps sessions in memory, so after restarting `npm run server`, sign in again. Google sign-in needs a Google OAuth client ID and redirect URL, so it is reserved for the hosted deployment rather than simulated locally.

## Friends and visibility

Choose **Just me**, **Friends**, or **Public** when adding a place. Use the Friends tab to send a request using another account's username; when they accept, Friends-only pins are visible to both accounts. Public pins are visible to every signed-in local account.
