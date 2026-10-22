# ECHOES

> **Every decision leaves a trace.**

ECHOES is a browser-based, first-person mystery adventure built around three connected cases. Explore a forest, investigate a museum after dark, and uncover the truth inside Blackwood Manor. Search for clues, question characters, and piece the evidence together to solve the story.

## At a glance

| | |
| --- | --- |
| **Genre** | First-person mystery and exploration |
| **Levels** | The Unknown · Museum After Dark · The Final Case |
| **Runs on** | Modern browsers with WebGL support |
| **Built with** | HTML, CSS, JavaScript, Three.js, and Vite |
| **Hosting** | Netlify-ready static site |

### What you can do

- Explore interactive 3D environments and investigate objects.
- Follow a live map through the forest and search for evidence.
- Question characters, use inventory tools, and connect clues across cases.
- Turn on the museum and manor lights, climb the manor staircase, and inspect its landing.
- Listen to a different procedural soundtrack in each level—or stop the music whenever you like.

## Get started

You’ll need [Node.js](https://nodejs.org/) (npm is included) and a modern browser with WebGL enabled.

```sh
# Install project dependencies
npm install

# Start the local development server
npm run dev
```

Open the local address printed in the terminal. Vite reloads the page as you edit files. Stop the server with `Ctrl+C`.

To build and preview the production site locally:

```sh
npm run build
npm run preview
```

## How to play

| Action | Controls |
| --- | --- |
| Move | **WASD** or the on-screen direction buttons |
| Look around | Drag in the 3D scene |
| Inspect an object | Click or tap it |
| Toggle flashlight | **F** or the flashlight button |
| Pick up or drop an object | **E** |
| Use a held food, water, or medical item | **E** or **USE** |
| Climb the forest hill | **Space** |
| Ask for suggestions | Type **help** in the command box |

In Level 1, use the field map to find landmarks and clues. In Levels 2 and 3, look for a wall switch to light the room. Walk up the staircase in the manor to inspect the upper landing. Use **STOP MUSIC** and **PLAY MUSIC** to control the soundtrack.

## The three cases

1. **The Unknown** — Find your bearings, investigate the campsite, and follow the trail through the forest.
2. **Museum After Dark** — Question the exhibits, search the gallery, and uncover the mystery behind Project Echo.
3. **The Final Case** — Explore Blackwood Manor, question its residents, and gather evidence to prove your innocence.

## Technology and assets

- **HTML5, CSS3, and JavaScript** power the interface, responsive layouts, and game logic.
- **Three.js (r128)** renders the 3D worlds and loads the tree model.
- **Vite** runs the development server and creates production builds.
- **Web Audio API** generates the level-specific ambient soundtrack in the browser; no audio files or external audio service are required.
- **Netlify** can host the generated static site.

Three.js and game assets are bundled locally. Google Fonts are loaded from an external CDN, so an internet connection is needed for those fonts. Dialogue and command handling use local JavaScript rules; despite the AI-themed presentation, the game does not connect to an AI service or require an API key.

The forest tree, foliage, and ground textures, along with the interior PBR maps, are free CC0 assets. Sources and credits:

- [Forest asset credits](./public/assets/forest/ASSET_CREDITS.md)
- [Interior asset credits](./public/assets/interiors/ASSET_CREDITS.md)

## Deploy with Netlify

Connect the GitHub repository to Netlify. The included [`netlify.toml`](./netlify.toml) configures the build command and publish directory automatically:

| Netlify setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

No environment variables are required. Each deploy builds the Vite app and publishes `dist`, which contains the bundled game and its local assets. For a manual deploy, run `npm run build` and publish the generated `dist` directory.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Game screens and interface |
| `styles.css` | Visual styling and responsive layout |
| `public/game.js` | 3D scenes, controls, interaction, and story logic |
| `src/main.js` | Loads Three.js and its glTF decoder, then starts the game script |
| `public/assets/forest/` | Forest models, textures, and asset credits |
| `public/assets/interiors/` | Interior surface maps and asset credits |
| `package.json` | Project dependencies and Vite commands |

The **Play With Friends** screen is a preview; multiplayer is not implemented yet.
