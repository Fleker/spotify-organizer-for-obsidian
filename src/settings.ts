import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type SpotifySorterPlugin from "./main";

export interface SpotifySorterSettings {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  outputFolder: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const DEFAULT_SETTINGS: SpotifySorterSettings = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://127.0.0.1:8100/callback",
  outputFolder: "",
  accessToken: "",
  refreshToken: "",
  expiresAt: 0,
};

export class SpotifySorterSettingTab extends PluginSettingTab {
  plugin: SpotifySorterPlugin;

  constructor(app: App, plugin: SpotifySorterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("p", {
      text: "Create a Spotify app at developer.spotify.com, add http://127.0.0.1:8100/callback as a Redirect URI, then paste your credentials below.",
    });

    new Setting(containerEl)
      .setName("Client ID")
      .setDesc("From your Spotify Developer Dashboard app")
      .addText((text) =>
        text
          .setPlaceholder("Paste your Client ID")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Client Secret")
      .setDesc("From your Spotify Developer Dashboard app")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("Paste your Client Secret")
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Redirect URI")
      .setDesc(
        "Must exactly match the Redirect URI added in your Spotify app settings."
      )
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:8100/callback")
          .setValue(this.plugin.settings.redirectUri)
          .onChange(async (value) => {
            this.plugin.settings.redirectUri = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc(
        "Vault folder to save reports in. Leave blank to save in the vault root."
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g. Music")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Clear saved tokens")
      .setDesc("Force re-authentication on the next run.")
      .addButton((btn) =>
        btn.setButtonText("Clear tokens").onClick(async () => {
          this.plugin.settings.accessToken = "";
          this.plugin.settings.refreshToken = "";
          this.plugin.settings.expiresAt = 0;
          await this.plugin.saveSettings();
          new Notice("Spotify Sorter: Tokens cleared.");
        })
      );
  }
}
