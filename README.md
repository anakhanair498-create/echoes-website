# ECHOES

ECHOES is a browser-based, first-person interactive mystery game. Explore three connected cases, investigate scenes, collect clues, question characters, and use your discoveries to move the story forward.

## Technologies

- **HTML5** for the game screens and interface
- **CSS3** for styling and responsive layouts
- **JavaScript** for gameplay, controls, and story logic
- **Three.js (r128)** for the 3D scenes and rendering, loaded from a CDN
- **Vite** for local development and production builds
- **Netlify** for static-site hosting and deployment

The game is a static website with no server-side application. Despite the AI-themed descriptions in the interface, the current dialogue and command handling are implemented with local JavaScript rules; no AI service or API key is required.

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

The game needs a modern browser with WebGL support. Three.js and Google Fonts are loaded from external CDNs, so an internet connection is needed for those resources.

## How to play

- Choose **Start Journey** to begin the first case.
- Use **WASD** or the on-screen directional buttons to move.
- Drag with the mouse to look around; on touch devices, drag in the scene.
- Click or tap visible objects to investigate them.
- Press **F** to toggle the flashlight, **E** to grab or drop an object, and **Space** to climb where possible.
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
- `package.json` — Vite scripts and development dependency
