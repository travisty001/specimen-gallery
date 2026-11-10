# Travis Downing · Specimen Archive

Static, mobile-friendly 3D specimen gallery hosted on GitHub Pages. No build step, account for visitors, or paid hosting is required. The initial catalog is intentionally empty, ready for the first real GLB.

## Adding a specimen

1. Preserve the original scan elsewhere. Put an optimized, self-contained GLB under `models/`. Ordinary GitHub files must be under 100 MiB; aim for 10–30 MB for phone viewing.
2. Add reference images under `images/`, if available.
3. Add a record to the `specimens` array in `specimens.json`, for example:

```json
{
  "specimens": [
    {
      "id": "TD-001",
      "title": "Specimen title",
      "file": "models/td-001.glb",
      "description": "Collection and scan context. Do not publish precise locality details unless intended.",
      "observations": "Visible surface features and capture limitations.",
      "interpretation": "Provisional interpretation, uncertainty, and examination status.",
      "allowDownload": true,
      "images": [{"src": "images/td-001-reference.jpg", "caption": "Annotated reference view"}]
    }
  ]
}
```

4. Commit and push to `main`. GitHub Pages publishes from the repository root. A specimen link ends with `/#TD-001`.

Use unique IDs and relative paths. Published site content and repository files are public and can be downloaded; hiding a download button is not access control. Do not add private scans or precise locality coordinates accidentally. No blanket license is granted for specimen imagery/models; the vendored viewer retains its upstream license.

## Viewer

Drag to orbit, pinch/scroll to zoom, two fingers or Shift+drag to pan. The front/side/top buttons use the model's stored coordinate system; anatomical orientation must be reviewed when adding each scan. Reset restores the camera, turntable, and exposure. Rotation starts only when requested. Light controls change exposure, not physical raking-light direction. A full-screen button works where the browser supports the Fullscreen API.

“Open a GLB file” previews a local file using an in-browser object URL. It does not upload, save, or publish that file. An embedded-texture GLB is required; external resources are not bundled automatically. Large scans can exceed a phone's graphics memory, even when they fit hosting limits.

## Development and dependencies

Serve the repository with a static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000`. No Python source scripts are included. Do not open `index.html` directly: browsers restrict fetching the catalog from file URLs.

`vendor/model-viewer.min.js` is the upstream `@google/model-viewer` 4.4.0 distribution (Apache-2.0; see `vendor/LICENSE`). Fonts load from Google Fonts with system fallbacks. The viewer may fetch upstream decoder assets for compressed GLBs; review compressed-file behavior on the actual first specimen before publishing it. Standard uncompressed GLBs use the bundled viewer directly.

## Hosting

GitHub Pages source: branch `main`, folder `/`. `.nojekyll` disables Jekyll processing. Published site must remain within GitHub Pages limits (currently 1 GB total; 100 GB/month soft bandwidth limit). Maintain original scan backups separately.
