import { Notice } from "obsidian";
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

let pendingAuthResolve: ((code: string) => void) | null = null;
let pendingAuthReject: ((reason: Error) => void) | null = null;
let authTimeout: ReturnType<typeof setTimeout> | null = null;

export function handleAuthCallback(params: Record<string, string>): void {
  if (!pendingAuthResolve || !pendingAuthReject) return;

  const resolve = pendingAuthResolve;
  const reject = pendingAuthReject;
  pendingAuthResolve = null;
  pendingAuthReject = null;

  if (authTimeout) {
    clearTimeout(authTimeout);
    authTimeout = null;
  }

  const error = params["error"];
  const code = params["code"];

  if (error || !code) {
    reject(new Error(`Spotify authorization failed: ${error ?? "no code returned"}`));
  } else {
    resolve(code);
  }
}

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

    pendingAuthResolve = resolve;
    pendingAuthReject = reject;

    authTimeout = setTimeout(() => {
      pendingAuthResolve = null;
      pendingAuthReject = null;
      authTimeout = null;
      reject(new Error("Authorization timed out (5 minutes). Please try again."));
    }, 5 * 60 * 1000);

    new Notice("Spotify Sorter: Opening browser for Spotify authorization...", 8000);
    window.open(authUrl);
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
