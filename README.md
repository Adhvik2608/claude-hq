# Swapna Griha · The Dream House

A five-floor 3D dream house you walk through as your own character. It runs in the browser with three.js and has no build step.

- **Mandir at the entrance**: marble Radha-Krishna and Devi murtis, a brass Ganesha, and a Shiva lingam with Nandi. Tanjore-style paintings of the gods line both walls, two frames are layered 3D reliefs, and you can put your own photo in any frame. You can ring the bells, blow the shankh, perform aarti, offer abhishek and sit to meditate.
- **Tanpura in any scale**: all 12 keys, a low (male) or high (female) register, fine tuning in cents, an exact Sa in Hz, and Pa/Ma/Ni/ni/Dha/Sa as the first string. A key change takes effect on the next pluck, so the drone never restarts. Every other instrument follows the same Sa.
- **Music room**: harmonium (bass and female reeds, Sa/Pa drones), tabla (pads plus thekas in Teentaal, Ektaal, Jhaptaal, Rupak, Keherwa and Dadra, with manjira), sitar with meend glides, bansuri, tanpura and a grand piano. Sit at an instrument and play it with the keyboard or the on-screen keys.
- **Every floor**:
  - Ground: foyer, living room with a jhoola, dining hall, kitchen (make chai), storeroom, washroom.
  - First: music room, library, yoga room, sunroom and front balcony.
  - Second: bedroom, bathroom with tub and shower, guest room, study, family lounge with carrom.
  - Third: master suite and spa bath, home cinema, chai lounge, grand balcony.
  - Terrace: infinity pool you can wade into, garden with a tulsi and a telescope, fire-pit lounge.
- **Getting around**: a glass lift inside a spiral staircase serves all five floors. Doors open as you approach.
- **Character creator**: body shape, height, build, skin, face shape, nose, lips, brows, eye shape, colour and size, 14 hairstyles, beard and moustache, tops, bottoms, footwear, glasses, bindi/tilak, headwear, earrings, watch and mala.

## Run it

```bash
npm start          # http://localhost:8080
```

Any static file server works. Open `index.html` through a server, not as a `file://` URL, because the page uses ES modules and a Web Worker.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Walk |
| Shift | Sprint |
| Space | Jump |
| E | Sit, use or stand up |
| F | Secondary action, such as putting your photo in a frame or flushing |
| Drag / wheel | Look around / zoom |
| V | First person |
| P | Tanpura on/off |
| M | Music studio |
| Tab | House map (tap a room to go there) |
| T | Time of day |
| C | Edit character |
| 1–5 | Namaste, wave, dance, clap, pray |
| 0–4 | Pick a floor while in the lift |
| Esc | Close a panel or stand up from an instrument |

On phones, use the joystick and buttons to move, and drag anywhere else to look around.

## Using your own tanpura recording

The built-in tanpura is an original string model. To play a specific recording instead, you have two options:

- **In the app**: open the Tanpura panel and choose **Load recording…**. The app detects the recording's Sa and register, and remembers the file in your browser.
- **Bundled with the site**: put the file in `assets/audio/` with a manifest at `assets/audio/tanpura.json`:

  ```json
  { "file": "tanpura.mp3", "sa": "C#", "cents": 0, "register": "male", "name": "My tanpura" }
  ```

The recording is looped with a crossfaded seam. It is retuned by resampling to whichever Sa you choose, using at most six semitones up or down. A key change crossfades in at the same point in the cycle. Only use recordings you have the right to use.

## QA

```bash
npm test           # unit tests + whole-house simulation (Node, no GPU needed)
npm run test:e2e   # browser end-to-end in headless Chromium (needs the `playwright` package)
```

- `tests/unit`:
  - physics: floors, steps, walls, curved walls with lift doors, spiral stair, camera rays.
  - the room and wall plan: every room exists, has a doorway, and has a valid spawn; openings fit their walls.
  - tanpura maths: keys, registers, custom Hz and recording retune intervals.
  - rendered strings are in tune to within 1 cent.
  - recording key detection across all 12 keys, both registers and the Pa/Ma/Ni tunings.
  - taal and thaat tables, and keyboard maps.
  - every character option builds a sound, grounded body.
  - every animation stays finite.
- `tests/world`: builds the entire house in Node and drives the real player controller through it.
  - every room is reachable on foot on every floor.
  - every seat can be sat in and left from a free spot.
  - every prompt does something.
  - the spiral stair climbs from the ground floor to the terrace and back.
  - the lift serves all floors without riders sinking, and empty shafts stay sealed.
  - every door opens and closes.
  - you can wade into the pool and climb out.
  - walls hold.
- `tests/e2e`: the real page in Chromium.
  - title → play, walking, every panel.
  - tanpura playback and retuning, and loading a recording.
  - map teleport, temple interactions and photo upload.
  - every instrument dock, plus tabla theka playback.
  - the lift panel, time of day, the character creator and quality settings.
  - a phone layout with the touch joystick.
  - no console errors.

CI runs both suites on every pull request (`.github/workflows/qa.yml`).

## Layout

```
index.html, css/            page shell and UI styles
js/main.js                  boot, game loop
js/engine/                  renderer, input, physics, follow camera, light pool
js/world/                   textures, materials, structure, doors, lift, rooms, exterior, deity art and murtis
js/character/               avatar, procedural animation, player controller
js/audio/                   sound effects, tanpura (+ worker), instruments
js/ui/                      HUD, panels, instrument docks, character creator
vendor/three/               three.js r187 (MIT)
tests/                      unit, world-simulation and browser QA
```
