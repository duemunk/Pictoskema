# Pictoskema

A pictogram schedule of everyday tasks (morning, after school, evening), added to the home
screen of an **original iPad Air on iOS 12 Safari**. Hosted on GitHub Pages at
https://duemunk.github.io/Pictoskema/. Lessons carried over from `../Spilplatte`.

## Who writes here
- The app is described by a non-technical person, often **in Danish**. Answer Danish messages in
  Danish, in short plain sentences without jargon. This overrides any "always answer in English"
  preference. Everything user-facing in the app is Danish. Code identifiers stay English.
- Don't ask them to run commands, read diffs or click links in the chat. Show progress in the
  in-app browser pane (`preview_start` with the URL); if `tabs_context` says the pane is hidden,
  say: "Tryk på 🌐 globus-knappen øverst til højre."

## Publish continuously
Every working step is committed and pushed to `main`; GitHub Pages deploys it. This standing
request overrides "never commit unprompted" for this repo. Commit subjects follow the
"This commit will …" convention, subject only, no trailers.

## Hard rules (iOS 12)
- Plain `<script>` files, no build step, frameworks, modules or CDN imports.
- ES2017 only (no `?.`, `??`, class fields, `flat`, `Object.fromEntries`). Check before pushing:
  `npx --yes es-check@7 es2017 app.js sw.js`.
- No CSS `gap` on flexbox (Safari 14.1+); use margins.
- Emoji must be Unicode 11 or older (no 🪥 🧍 🪑 …).
- Navigate with `location.href`, never plain `<a>` (opens Safari from the home-screen app).
- Touch targets at least 60 × 60 points.
- New files the app needs offline go in `FILES` in `sw.js`.

## Privacy
The repo is public. Anything personal (names, places, photos) never goes into tracked files or
commit messages. Plain values live in `private/personal.json` (gitignored), keyed by the
`data-private="<key>"` attribute of the element that shows them; the 6-digit code is in
`private/unlock-code.txt`. Run `node tools/seal.mjs` to encrypt them into `sealed.json`
(AES-GCM, PBKDF2 key) before committing. The "🔑 Kode" button reveals them on a device.

## Preview locally
`python3 -m http.server 8000` from the repo root.
