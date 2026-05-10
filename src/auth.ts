import { Notice } from "obsidian";
import * as http from "http";
import * as url from "url";
import type SpotifySorterPlugin from "./main";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

const SCOPES = [
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export async function authenticate(plugin: SpotifySorterPlugin): Promise<string> {
  const { clientId, clientSecret, redirectUri } = plugin.settings;

  // Return cached token if still valid (with 5-minute buffer)
  if (
    plugin.settings.accessToken &&
    plugin.settings.expiresAt > Date.now() + 5 * 60 * 1000
  ) {
    return plugin.settings.accessToken;
  }

  // Try refreshing with stored refresh token
  if (plugin.settings.refreshToken) {
    try {
      const token = await refreshAccessToken(clientId, clientSecret, plugin.settings.refreshToken);
      await saveTokens(plugin, token);
      return token.access_token;
    } catch {
      // Fall through to full authorization
    }
  }

  // Full OAuth flow
  const code = await getAuthorizationCode(clientId, redirectUri);
  const token = await exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
  await saveTokens(plugin, token);
  return token.access_token;
}

async function saveTokens(plugin: SpotifySorterPlugin, token: TokenResponse): Promise<void> {
  plugin.settings.accessToken = token.access_token;
  plugin.settings.expiresAt = Date.now() + token.expires_in * 1000;
  if (token.refresh_token) {
    plugin.settings.refreshToken = token.refresh_token;
  }
  await plugin.saveSettings();
}

function getAuthorizationCode(clientId: string, redirectUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
    });
    const authUrl = `https://accounts.spotify.com/authorize?${params}`;

    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url ?? "", true);
      if (parsed.pathname !== "/callback") return;

      const code = parsed.query.code as string | undefined;
      const error = parsed.query.error as string | undefined;

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        error
          ? `<h1>Authorization failed: ${error}</h1><p>You can close this tab.</p>`
          : `<h1>Authorization successful!</h1><p>You can close this tab and return to Obsidian.</p>`
      );
      server.close();

      if (error || !code) {
        reject(new Error(`Spotify authorization failed: ${error ?? "no code returned"}`));
      } else {
        resolve(code);
      }
    });

    const port = parseInt(new URL(redirectUri).port || "8100");
    server.listen(port, "127.0.0.1", () => {
      new Notice("Spotify Sorter: Opening browser for Spotify authorization...", 8000);
      // Use Electron's shell to open in the system browser
      const { shell } = require("electron") as typeof import("electron");
      shell.openExternal(authUrl);
    });

    server.on("error", (err) => reject(new Error(`Could not start callback server: ${err.message}`)));

    // Time out after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timed out (5 minutes). Please try again."));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<TokenResponse>;
}
