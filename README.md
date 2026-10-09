# Amy Studio

An independent, static website for games and tools. Its navigation, branding and footer contain no links to the personal homepage. The personal website links to this Studio at `https://amy22707.github.io/amy-studio/`.

The site has no third-party runtime dependencies, analytics, external fonts, or account integrations. It includes responsive layouts, category filters, project details, download links, studio updates, and a theme switch with system-following mode.

## Edit the collection

Update `site/data/studio.json`. The initial two entries are intentionally blank; they render as clearly marked coming-soon slots. Leave URL fields empty until a real destination exists: no fake download link is generated.

```json
{
  "id": "tool-01",
  "kind": "tool",
  "title": "",
  "description": "",
  "details": "",
  "platforms": ["Windows"],
  "version": "",
  "image": "",
  "downloadUrl": "",
  "playUrl": "",
  "sourceUrl": "",
  "releaseUrl": ""
}
```

- `kind`: `game` or `tool`.
- `details`: plain text; use `\n` for newlines.
- `image`: put the screenshot in `site/images/` and use `./images/example.png`, or use an HTTPS image URL. Keep local paths relative for GitHub project Pages.
- `downloadUrl`: a GitHub Releases asset URL, for example `https://github.com/Amy22707/REPO/releases/latest/download/FILE.zip`. Replace both placeholders with real values before adding it.
- `playUrl`: a real hosted game URL, if available.
- `sourceUrl`: optional source repository link.
- `releaseUrl`: optional release page or changelog link.
- Add more entries by copying an object and choosing a unique `id`.

`updates` is initially an empty array. A release-note entry has `date`, `title`, `description`, and `url` fields. Dates use `YYYY-MM-DD`; `url` can be empty.

`contact.email` and `contact.feedbackUrl` are blank. Fill these with a studio-specific email and/or an Issues or feedback URL. Personal contact details are not imported.

## Local preview

Requires Node.js 22 or newer. No dependency installation is needed.

```sh
npm run dev
```

Open `http://127.0.0.1:4322/amy-studio/`. Use the local server rather than opening `index.html` as a file, because the collection is loaded from JSON.

```sh
npm run build
npm run preview
```

Build output goes to `dist/`. The build validates project data and checks configured URLs for accidental links to the personal website.

## GitHub Pages

In this repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**. Push to `main` (or trigger the `Deploy Amy Studio` workflow). `.github/workflows/deploy.yml` builds and publishes the site.

Expected URL: `https://amy22707.github.io/amy-studio/`.

All site assets use relative URLs so the site works under `/amy-studio/`. A separate domain can be configured later.

## About the one-way link

The Studio site does not offer navigation back to the personal website and does not display the owner's real name, education, personal blog, or personal contact details. This is navigation separation, not identity isolation: the shared GitHub account and `github.io` hostname can still identify the author.
