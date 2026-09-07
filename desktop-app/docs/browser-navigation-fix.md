# Browser navigation fixes in the AcoFork build

## Reproduced cause

With the same responsive site at 1440px and 390px, the third desktop anchor was
`/create/` while the third mobile anchor was a Twitter link. BrowserSync represented
clicks as a tag name and a global tag index. Clicking the desktop navigation caused
an untrusted click on the unrelated mobile link. The old `in-preview` popup policy
then replaced the shared preview address with that link's URL. A feedback link
could be selected in the same way when the mobile drawer changed the DOM.

This was reproduced in Electron against the running `localhost:4321` website.
JSON-LD did not cause the navigation. Filtering iframe navigation alone could not
fix a synthetic click that creates a genuine top-level popup/navigation.

## Behavior

- BrowserSync still provides its socket transport, scroll synchronization and file
  reloads. Positional click/form/location mirroring is disabled.
- Links, downloads and native form submissions run only in the source browser.
  The device receiving genuine mouse/keyboard input owns shared navigation. Its
  committed main-frame URL (including HTTP redirects and SPA history) is mirrored
  to the other previews. Child-frame navigation stays in the child frame.
- Non-navigation controls and non-sensitive form state use conservative semantic
  matching. Missing, hidden, disabled or ambiguous targets are skipped. There is
  no index fallback. Passwords and file inputs are not broadcast.
- Popup requests use Chromium's native child-window creation. The original preview
  remains open; WindowProxy, opener, named targets, POST data, cookies, postMessage
  and close semantics are retained. Mirrored control actions cannot duplicate the
  source popup. Repeated deliberate opens are not deduplicated by URL or time.
- Child windows are sandboxed, have no Node integration or app-shell preload and
  do not join mirroring. Existing `in-preview` preferences migrate to native
  windows. Explicit external-browser mode remains an opt-in setting.
- Unsafe native/custom schemes remain blocked; mailto/tel are delegated to the OS.
  Local-file popup access is limited to local-file openers, and blob URLs must
  belong to the opener's origin.

This is still an Electron responsive-testing application, not Chrome's complete
browser UI. New browsing contexts appear as separate windows rather than tabs.
Semantic control mirroring intentionally favors doing nothing over clicking an
uncertain target. Arbitrary closed shadow roots and application-specific control
identity are not inferred. Provider-specific OAuth and browser-extension support
are not claimed by the local OAuth protocol tests.

## Verify and build

Run commands from `desktop-app`:

```powershell
yarn typecheck
node node_modules/typescript/bin/tsc --noEmit -p e2e/tsconfig.json
yarn test
$env:E2E_HEADLESS = 'true'
node node_modules/@playwright/test/cli.js test --config=e2e/playwright.config.ts browser-semantics.spec.ts popup-policy.spec.ts cross-device-mirroring.spec.ts --workers=1 --reporter=line
yarn package
$env:E2E_EXECUTABLE = (Resolve-Path 'release/build/win-unpacked/ResponsivelyApp.exe').Path
node node_modules/@playwright/test/cli.js test --config=e2e/playwright.config.ts browser-semantics.spec.ts --workers=1 --reporter=line
Remove-Item Env:E2E_EXECUTABLE
Remove-Item Env:E2E_HEADLESS
```

The E2E harness creates isolated user-data directories and uses native input,
including actual Electron downloads, child windows and local HTTP POST requests.
It does not use the owner's account sessions. The current Windows unit suite has
two pre-existing failures in `src/mcp-cli/launch.test.ts` concerning simulated
macOS app paths; navigation/mirroring tests are independent of those failures.

Fork builds have a distinct version and installer filename. Their updater targets
`afoim/responsively-app`, not the official releases, so the local fixes cannot be
silently replaced by an upstream automatic update. Packaging uses `--publish never`.
