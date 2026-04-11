# PFRA React - Air Force Physical Fitness Readiness Assessment Calculator

## Project Overview
A React Native / Expo mobile application for calculating US Air Force Physical Fitness Readiness Assessment (PFRA) scores. Supports multiple fitness events across cardio, strength, and core categories.

## Tech Stack
- **Framework**: Expo SDK 54 with React Native 0.81.5
- **Language**: TypeScript
- **UI**: React Native components with custom theming
- **Audio**: expo-av (HAMR test beeps)
- **Location**: expo-location (run tracking)
- **Storage**: @react-native-async-storage/async-storage (score history)
- **Web Support**: react-dom + react-native-web

## Project Structure
- `App.tsx` - Main application container and state controller
- `index.ts` - Entry point
- `app.json` - Expo configuration
- `src/` - Core business logic and UI
  - `components/` - Modular UI components (EventInput, GoalLookup, ScoreHistory, HamrPlayer, RunTracker)
  - `hooks/` - Custom hooks (useHistory)
  - `scoring.ts` - Score calculation engine
  - `scoringData.json` - Official AF scoring tables
  - `types.ts` - TypeScript interfaces
  - `theme.ts` - Colors and styling constants
- `assets/` - Images, icons, and audio files (beep.wav)

## Running the App
- **Workflow**: "Start application" - runs `npx expo start --web --port 5000`
- **Port**: 5000 (web preview)
- The app runs in web mode via Expo for Replit preview

## Key Features
- Gender and age group profile selection
- Multi-event scoring (Cardio: Run/HAMR/Walk, Strength: Push-ups/HR Push-ups, Core: Sit-ups/Crunches/Plank)
- Waist-to-height ratio measurement
- Real-time score calculation with pass/fail indicators
- Goal lookup (target performance for desired score)
- Score history with AsyncStorage persistence

## Package Manager
- npm (package-lock.json present)

## Notes
- Some package versions have compatibility warnings with Expo SDK 54 (async-storage, picker, file-system, location, sharing) but the app runs correctly
- expo-av deprecation warning is expected (deprecated in SDK 54)
