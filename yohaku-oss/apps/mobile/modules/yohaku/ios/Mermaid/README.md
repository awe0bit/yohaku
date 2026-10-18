# Mermaid on iOS

Pele 1.6.0 runs in a serial JavaScriptCore actor. `MermaidSVG` adapts its generated
SVG for the already installed SDWebImageSVGCoder; no WebView is involved. The
existing Expo `renderMermaid` method still returns a cached PNG and logical size.
CoreText shapes labels into glyph paths so CoreSVG preserves mixed styles, spaces,
and multiline positions. Color emoji retain a native text fallback.

`Resources/pele.js` is the unmodified `dist/pele.global.js` from `pele@1.6.0` on npm.
Its license is included beside it. To update it, unpack `npm pack pele@<version>`,
copy the global bundle and license, update `MermaidEngine.version`, and run:

```sh
swift test --package-path modules/yohaku/ios/Mermaid
```

The cache key includes the engine version, colors, source, and render scale.
Changing the SVG compatibility layer also requires incrementing that version.
