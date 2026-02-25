# Alchemy AI — Sprint 1 Skeleton
**Team:** The Alchemists | **CPSC 491** | Cal State Fullerton  
**PM:** Allisa Warren | **Sprint 1 Deliverable:** Feb 12 – Feb 22

---

## What's Included

This is the foundational skeleton for the Alchemy AI React Native app.  
It is intentionally lightweight — real API/database connections come in Sprint 2 and 3.

### Screens
| Screen | Status | Notes |
|---|---|---|
| `LoginScreen` | ✅ Sprint 1 | Google OAuth wired, needs real client IDs |
| `HomeScreen` | ✅ Sprint 1 | Placeholder cards, static data |
| `SearchScreen` | ✅ Sprint 1 | Search bar + ingredient chips, placeholder results |
| `ProfileScreen` | ✅ Sprint 1 | Guest layout, logout navigates to Login |

### Features stubbed for future sprints
| Feature | Sprint | Owner |
|---|---|---|
| Google OAuth real credentials | Sprint 2 | Allisa / Ethan |
| Backend API integration | Sprint 3 | Ethan |
| AI recommendation engine | Sprint 3 | Ngoc |
| Ingredient scanning (camera) | Sprint 4 | Ngoc |
| Party Mode | Sprint 4 | Mohamed / Ethan |

---

## File Structure

```
AlchemyAI/
├── App.js                        ← Entry point, font loading
├── package.json
├── babel.config.js
└── src/
    ├── theme/
    │   └── index.js              ← Colors, Typography, Spacing, Radius
    ├── navigation/
    │   ├── RootNavigator.js      ← Login → MainTabs stack
    │   └── TabNavigator.js       ← Bottom tab bar (5 tabs per FR-21)
    └── screens/
        ├── LoginScreen.js        ← Google OAuth + guest access
        ├── HomeScreen.js         ← Placeholder cocktail cards
        ├── SearchScreen.js       ← Search bar + ingredient chips
        └── ProfileScreen.js      ← User info + menu skeleton
```

---

## Quick Start

```bash
# 1. Install Expo CLI (if you don't have it)
npm install -g expo-cli

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start

# 4. Open on your phone with the Expo Go app
#    Or press 'i' for iOS simulator / 'a' for Android emulator
```

---

## Sprint 2 TODO (for Ethan + Allisa)
To activate real Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Create separate IDs for: iOS, Android, Web
4. Paste them into `src/screens/LoginScreen.js`:
   ```js
   const GOOGLE_CLIENT_ID_IOS     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
   const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
   const GOOGLE_CLIENT_ID_WEB     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
   ```
5. Add your redirect URI to the Google Cloud Console authorized list

---

## Design System
- **Color:** Dark background (`#0A0A0A`) + warm gold accent (`#C9A84C`)
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Pattern:** MVC — screens are Views, navigation is Controller layer, API calls go in a `src/api/` folder (Sprint 2+)
