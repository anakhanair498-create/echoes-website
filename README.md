# ECHOES

ECHOES is a browser-based, first-person interactive mystery game. Explore three connected cases, investigate scenes, collect clues, question characters, and use your discoveries to move the story forward.

## Technologies

- **HTML5** for the game screens and interface
- **CSS3** for styling and responsive layouts
- **JavaScript** for gameplay, controls, and story logic
- **Three.js (r128)** for 3D rendering and glTF asset loading
- **Vite** for local development and production builds
- **Netlify** for static-site hosting and deployment

The game is a static website with no server-side application. Three.js and the forest/interior assets are bundled in the project; Google Fonts are loaded from an external CDN. Despite the AI-themed descriptions in the interface, the current dialogue and command handling are implemented with local JavaScript rules; no AI service or API key is required.

Each level has its own procedural ambient soundtrack generated in the browser with the Web Audio API; no music files or external audio services are used. The on-screen music control can mute or resume it.

## Run locally

Install [Node.js](https://nodejs.org/) (which includes npm), then run these commands from the project directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in your browser. The development server supports hot reload while editing. Stop it with `Ctrl+C`.

To create and preview the production build locally:

```sh
npm run build
npm run preview
```

The game needs a modern browser with WebGL support. An internet connection is only needed to load Google Fonts; Three.js and the game assets are bundled locally.

## How to play

- Choose **Start Journey** to begin the first case.
- Use **WASD** or the on-screen directional buttons to move.
- Drag with the mouse to look around; on touch devices, drag in the scene.
- Click or tap visible objects to investigate them.
- Press **F** to toggle the brighter flashlight, **E** to grab or drop an object (or use a held food/water/medical item), and **Space** to climb the forest hill.
- Click food, water, or medical supplies in the inventory to see them in your hand; press **E** or the **USE** button to consume them.
- Follow the live map in the forest. In the museum and manor, find and click the wall switch to turn on the room lights. Walk up the manor staircase to inspect its upper landing.
- Use the **MUSIC ON/OFF** button to control the level-specific ambient soundtrack.
- Use the command box to ask questions or enter actions. Type **help** to see suggestions for the current level.
- Inspect and use inventory items when needed, and collect enough clues to complete each case.

The **Play With Friends** screen is a preview; multiplayer is not implemented yet.

## Deploy on Netlify

Connect the Git repository to Netlify and configure the site with:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

No environment variables are required. For a manual deploy, run `npm run build` and upload the generated `dist` directory.

## Project files

- `index.html` — game screens and interface
- `styles.css` — visual styling and responsive layout
- `public/game.js` — 3D scenes, gameplay, controls, and story logic (served as a classic script to preserve the existing inline handlers)
- `src/main.js` — loads Three.js and its glTF decoder, then starts the classic game script
- `public/assets/forest/` — locally bundled trees, foliage maps, ground texture, and asset credits
- `public/assets/interiors/` — locally bundled marble/wood PBR maps and asset credits
- `package.json` — Vite scripts and project dependencies

Free CC0 asset sources and license details are documented in [`public/assets/forest/ASSET_CREDITS.md`](./public/assets/forest/ASSET_CREDITS.md) and [`public/assets/interiors/ASSET_CREDITS.md`](./public/assets/interiors/ASSET_CREDITS.md).
