# Obsidian Spotify Sorter

An [Obsidian](https://obsidian.md) plugin that finds Liked Songs in your Spotify library that aren't in any of your playlists, then saves them as a note in your vault.

> **Desktop only** — the Obsidian mobile app is not supported.

## Prerequisites

- A [Spotify Developer](https://developer.spotify.com/dashboard) account with an app configured

## Spotify App Setup

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app (or use an existing one).
2. In the app settings, add `obsidian://spotify-auth` as a **Redirect URI** and save.
3. Copy your **Client ID** and **Client Secret** — you'll paste these into the plugin settings.

## Installing into Obsidian

### From the community plugin browser (recommended)

Search for **Spotify Sorter** in **Settings → Community plugins → Browse**.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Copy them into your vault's plugin folder:

   ```
   <your-vault>/.obsidian/plugins/spotify-sorter/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

3. In Obsidian, go to **Settings → Community plugins**, disable Safe mode if prompted, and enable **Spotify Sorter**.

## Configuration

Open **Settings → Spotify Sorter** and fill in:

| Setting | Description |
|---|---|
| **Client ID** | From your Spotify Developer Dashboard app |
| **Client Secret** | From your Spotify Developer Dashboard app |
| **Redirect URI** | Must match the Redirect URI in your Spotify app settings (default: `obsidian://spotify-auth`) |
| **Output folder** | Vault folder to save reports in — leave blank for the vault root |

## Usage

Run **"Find unorganized Spotify tracks"** from the command palette (`Ctrl/Cmd+P`), or click the music note icon in the ribbon.

**First run:** your browser will open to Spotify's authorization page. Grant access, then return to Obsidian — the plugin captures the OAuth callback automatically via the `obsidian://spotify-auth` URI.

**Subsequent runs:** the saved refresh token is reused silently; no browser step needed. Use the **Clear tokens** button in settings to force re-authentication.

The plugin creates (or overwrites) a note named `Spotify Unorganized Tracks YYYY-MM-DD.md` in your configured output folder, listing every liked song that isn't in any playlist with clickable Spotify links.

## Building from source

```bash
npm install
npm run build   # produces main.js
```

Use `npm run dev` for watch mode during development.

## License

Licensed under the [Apache License 2.0](LICENSE).
