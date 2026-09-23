# Nodir Pare — নদীর পাড়ে

A cozy anime-style HTML5 village life game set in rural Bangladesh.

## Version 0.2 features

- Free-roaming player movement with WASD / arrow keys and touch D-pad
- Explore the whole illustrated village map
- Fishing mini-game at the fishing spot and pond
- Fishing rewards and fish inventory
- Build village structures
- Upgrade structures through multiple levels
- Upgrade the main home through Level 4
- Chicken Coop, Fishing Dock, Wooden Bridge and Village Well
- Forest wood gathering
- Market for supplies and fish sales
- Persistent save/load with browser localStorage
- XP and leveling
- Mobile-friendly interface

## Run locally

This is a static HTML game. You can open `index.html` directly, but a local web server is recommended.

Example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

Upload the project to a GitHub repository. The included `.github/workflows/pages.yml` workflow publishes the game through GitHub Pages.

## Android APK

The repository includes a Capacitor configuration and `.github/workflows/android-apk.yml` workflow. Push to GitHub, then run the **Build Android APK** workflow from the Actions tab. The workflow produces a debug APK artifact.

For a production Play Store build, configure an Android signing key and release build separately.

## Controls

- **WASD / Arrow keys:** move
- **E:** interact
- **I:** inventory
- **Interact button:** use the nearby location
- **Build button:** open the building menu
- **Click a location marker:** quickly walk to that location

## Build system

### Home
Upgrade from Level 1 to Level 4.

### Village structures
- Chicken Coop: 3 upgrade stages
- Fishing Dock: 3 upgrade stages
- Wooden Bridge: 2 upgrade stages
- Village Well: 2 upgrade stages

### Resources
- Wood: gather in the forest
- Bamboo and supplies: buy from the market
- Fish: catch and sell

## Art

The prototype uses the included `assets/village-map.png` as the illustrated world background. The game logic is intentionally separated from the art so the map and character assets can later be replaced with a full tile-based anime art set.
