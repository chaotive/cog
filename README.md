# COG · Cities of Gold

A turn-based expedition game built with TypeScript, Phaser, and Vite. Outfit the Marigold, sail to the Verdant Coast, and chart a continent in search of three sun seals. Return to the ship to complete your voyage.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` creates a production build; `npm run preview` serves it. `npm test` runs the rule and world-generation tests using Node 22.18 or newer (native TypeScript support).

With the dev server running, `npm run test:browser` checks the actual interface in headless Chrome and writes desktop/mobile screenshots to `.tmp/`. It uses the standard Windows Chrome location; set `CHROME_PATH` to use another installation. The browser test runs in a separate browser profile.

## Play

- Move with **WASD / arrows** or click an adjacent tile. Every step advances a turn.
- **F** forage, **C** camp, **E** open orders, **Space** wait, **R** recenter, **?** open the field guide.
- Select a distant explored tile and choose **Take the next step** to follow a route one turn at a time. Drag to pan; scroll or use the map controls to zoom.
- Trade and exchange stories at settlements. Two trust lets you recover seals without spending tools. Ruins reveal city locations.
- Watch supplies and health. Forage in new tiles, buy food, or help with harvests. Landmarks protect you from enemy pursuit.
- Recover all three seals and return to the Marigold, or finish early with the discoveries you have made.

Progress saves in local browser storage after every turn. Chart numbers reproduce geography. New voyages replace the saved expedition when you set sail. No server or account is required. Fonts use Google Fonts with local fallbacks; all artwork is drawn in code. Sounds are off until enabled.

## Structure

- `src/game/`: reusable grid/pathfinding, seeded randomness, and atomic turn clock.
- `src/cog/`: expedition rules, content data, procedural world generation, and Phaser atlas renderer.
- `src/main.ts`: browser interface, keyboard controls, dialogs, save wiring, and optional sound.
- `src/style.css`: responsive atlas presentation.
- `tests/`: deterministic rules, save validation, progression, combat, survival, and reachability tests.

Game rules are synchronous and independent of Phaser. Rendering never advances turns. Save data includes the random generator state, terrain visibility, encounters, cooldowns, and expedition history.
