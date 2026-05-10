import { Notice, Plugin, TFile } from "obsidian";
import { authenticate, handleAuthCallback } from "./auth";
import { getLikedSongs, getAllPlaylistTrackIds, SpotifyTrack } from "./spotify";
import {
  SpotifySorterSettings,
  DEFAULT_SETTINGS,
  SpotifySorterSettingTab,
} from "./settings";

export default class SpotifySorterPlugin extends Plugin {
  settings: SpotifySorterSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SpotifySorterSettingTab(this.app, this));

    this.registerObsidianProtocolHandler("spotify-auth", (params) => {
      handleAuthCallback(params);
    });

    this.addCommand({
      id: "find-unorganized-tracks",
      name: "Find unorganized Spotify tracks",
      callback: () => this.run(),
    });

    this.addRibbonIcon("music", "Find unorganized Spotify tracks", () => this.run());
  }

  async run() {
    if (!this.settings.clientId || !this.settings.clientSecret) {
      new Notice(
        "Spotify Sorter: Set your Client ID and Client Secret in plugin settings first."
      );
      return;
    }

    try {
      new Notice("Spotify Sorter: Authenticating...");
      const token = await authenticate(this);

      new Notice("Spotify Sorter: Fetching your library — this may take a moment...");
      const [likedSongs, playlistTrackIds] = await Promise.all([
        getLikedSongs(token),
        getAllPlaylistTrackIds(token),
      ]);

      const unorganized = likedSongs.filter((s) => !playlistTrackIds.has(s.id));

      if (unorganized.length === 0) {
        new Notice("Spotify Sorter: All liked songs are already in at least one playlist.");
        return;
      }

      await this.generateNote(unorganized, likedSongs.length);
    } catch (err) {
      console.error("Spotify Sorter:", err);
      new Notice(
        `Spotify Sorter: Error — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async generateNote(tracks: SpotifyTrack[], totalLiked: number) {
    const date = new Date().toISOString().split("T")[0];
    const fileName = `Spotify Unorganized Tracks ${date}.md`;
    const folder = this.settings.outputFolder;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const content = [
      `# Spotify Unorganized Tracks`,
      ``,
      `Generated: ${new Date().toLocaleString()}  `,
      `Liked songs: ${totalLiked} | Unorganized: ${tracks.length}`,
      ``,
      ...tracks.map((t) => `- [${t.name} — ${t.artists}](${t.url})`),
    ].join("\n");

    if (folder && !(await this.app.vault.adapter.exists(folder))) {
      await this.app.vault.createFolder(folder);
    }

    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(filePath, content);
    }

    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
    }

    new Notice(`Spotify Sorter: Note saved — ${fileName}`);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
