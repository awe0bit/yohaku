import { defineConfig } from 'taze'

export default defineConfig({
  // ignore packages from bumping
  exclude: [
    'tailwindcss',
    'crossbell',
    '@excalidraw/excalidraw',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    'react-native-gesture-handler',
    'react-native-screens',
    'react-native-safe-area-context',
    // Yohaku carries a ~370-line native iOS patch (code-block header strip).
    // Upstream 1.1.x renamed/moved those files, so the patch no longer applies;
    // re-target it by hand before bumping past 1.0.2.
    'react-native-enriched-markdown',
    // pnpm 12.18.0's frozen-lockfile validator rejects this workspace's
    // symlinked members (each of apps/mobile, packages/{design-system,
    // dom-webview,rich-content} is listed both under its symlink path and its
    // real yohaku-oss path) with ERR_PNPM_OUTDATED_LOCKFILE for a "local
    // dependency ... is outdated", even though `pnpm install` reports the
    // lockfile is up to date. Verify `CI=true pnpm install --frozen-lockfile`
    // before bumping past 12.14.0.
    'pnpm',
  ],
  // fetch latest package info from registry without cache
  force: true,
  // write to package.json
  write: true,
  // run `npm install` or `yarn install` right after bumping
  install: true,
  // ignore paths for looking for package.json in monorepo
  ignorePaths: ['**/node_modules/**', '**/test/**'],
  // override with different bumping mode for each package
  packageMode: {
    typescript: 'major',
  },
  // disable checking for "overrides" package.json field
  depFields: {
    overrides: false,
  },
  recursive: true,
  mode: 'latest',
})
