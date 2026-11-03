# Amy Studio

An independent, static website for games and tools. Its navigation, branding and footer contain no links to the personal homepage. The personal website links to this Studio at `https://amy22707.github.io/amy-studio/`.

The site has no third-party runtime dependencies, analytics, external fonts, or account integrations. It includes responsive layouts, category filters, project details, download links, studio updates, and a theme switch with system-following mode.

## Edit the collection

Update `site/data/studio.json`. Travel Frog fills the first game slot; a blank tool slot remains for future work. Leave URL fields empty until a real destination exists: no fake download link is generated. Blank slots are counted as coming soon, not released projects.

```json
{
  "id": "tool-01",
  "kind": "tool",
  "title": "",
  "description": "",
  "details": "",
  "highlights": [],
  "platforms": ["Windows"],
  "version": "",
  "image": "",
  "pageUrl": "",
  "downloadUrl": "",
  "playUrl": "",
  "sourceUrl": "",
  "releaseUrl": ""
}
```

- `kind`: `game` or `tool`.
- `details`: plain text; use `\n` for newlines.
- `highlights`: optional array of short feature descriptions, shown directly on the homepage card.
- `pageUrl`: optional project introduction URL. A page without a download or playable URL is marked `PREVIEW · TESTING`, not available for release.
- `image`: put the screenshot in `site/images/` and use `./images/example.png`, or use an HTTPS image URL. Keep local paths relative for GitHub project Pages.
- `downloadUrl`: a GitHub Releases asset URL, for example `https://github.com/Amy22707/REPO/releases/latest/download/FILE.zip`. Replace both placeholders with real values before adding it.
- `playUrl`: a real hosted game URL, if available.
- `sourceUrl`: optional source repository link.
- `releaseUrl`: optional release page or changelog link.
- Add more entries by copying an object and choosing a unique `id`.

For each new game or tool, copy the object above into `projects`, set `kind`, then fill in the title, summary, image, feature highlights and platform list. `pageUrl` provides a longer introduction or tutorial; without it, View details opens the built-in project dialog. Fill `downloadUrl` and/or `playUrl` only when the project is ready to use. Cards and Games / Tools filters update automatically; the HTML layout does not need to be edited. Put new screenshots or icons in `site/images/`.

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

This is a **separate Git repository**. When checked out at
`D:\PKU\CODE\my-homepage\.studio-workspace\amy-studio`, it is ignored by the personal
website repository. Committing and pushing `my-homepage` does not include these
files or trigger this repository's deployment. Run Studio's Git commands inside
this directory, and include `site/i18n/` and `site/images/` with the other changes.

The header includes the same globe language selector as the personal site.
It is present in the HTML rather than inserted only after JavaScript loads.
The committed `site/i18n/` dictionaries translate Studio's visible introduction,
collection cards, dialogs, and navigation; personal biography data is not imported.

All site assets use relative URLs so the site works under `/amy-studio/`. A separate domain can be configured later.

## About the one-way link

Travel Frog currently links only to its introduction at `https://amy22707.github.io/studio/travel-frog/`. Publish that introduction from the personal website repository before pushing the Studio card. Download, playable-game, source and release links are intentionally empty until testing is complete. This Studio change does not publish the game runtime or installers.

The Studio site does not offer navigation back to the personal website and does not display the owner's real name, education, personal blog, or personal contact details. This is navigation separation, not identity isolation: the shared GitHub account and `github.io` hostname can still identify the author.
