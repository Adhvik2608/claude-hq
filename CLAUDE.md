# claude-hq

## Sound & raag APIs
When the user mentions tanpura, tabla, raag/raga, taal, bols, or a codename starting
with `@` (`@freesound`, `@dunya`, `@saraga`, `@tabla-strokes`, `@raga-json`, `@raagadb`,
`@archive`, `@ragajunglism`), read `sound-apis/REGISTRY.md` first. It defines each
source's endpoints, auth, licence rules and which one to pick.

- Keys live in env vars: `FREESOUND_API_KEY`, `DUNYA_TOKEN`. Never commit them.
- Browse sources from the terminal: `python3 sound-apis/browse.py --help`
- Visual library browser: `sound-apis/library.html`
