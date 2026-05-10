export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  url: string;
}

interface SavedTrackItem {
  track: {
    id: string | null;
    name: string;
    artists: { name: string }[];
    external_urls: { spotify: string };
    is_local?: boolean;
  } | null;
}

interface PlaylistItem {
  id: string;
}

interface PlaylistTrackItem {
  track: {
    id: string | null;
    is_local?: boolean;
  } | null;
}

interface PaginatedResponse<T> {
  items: T[];
  next: string | null;
  total: number;
}

async function fetchAllPages<T>(initialUrl: string, token: string): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = initialUrl;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Spotify API error ${res.status}: ${res.statusText}`);
    }
    const page: PaginatedResponse<T> = await res.json();
    results.push(...page.items);
    nextUrl = page.next;
  }

  return results;
}

export async function getLikedSongs(token: string): Promise<SpotifyTrack[]> {
  const items = await fetchAllPages<SavedTrackItem>(
    "https://api.spotify.com/v1/me/tracks?limit=50",
    token
  );

  return items
    .filter((item): item is SavedTrackItem & { track: NonNullable<SavedTrackItem["track"]> } =>
      item.track !== null && item.track.id !== null && !item.track.is_local
    )
    .map((item) => ({
      id: item.track.id as string,
      name: item.track.name,
      artists: item.track.artists.map((a) => a.name).join(", "),
      url: item.track.external_urls.spotify,
    }));
}

async function getPlaylistTrackIds(playlistId: string, token: string): Promise<Set<string>> {
  try {
    const items = await fetchAllPages<PlaylistTrackItem>(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,is_local)),next,total`,
      token
    );

    const ids = new Set<string>();
    for (const item of items) {
      if (item.track?.id && !item.track.is_local) {
        ids.add(item.track.id);
      }
    }
    return ids;
  } catch {
    // Skip playlists that are inaccessible (same behaviour as the CLI)
    return new Set();
  }
}

export async function getAllPlaylistTrackIds(token: string): Promise<Set<string>> {
  const playlists = await fetchAllPages<PlaylistItem>(
    "https://api.spotify.com/v1/me/playlists?limit=50",
    token
  );

  const allIds = new Set<string>();
  for (const playlist of playlists) {
    const ids = await getPlaylistTrackIds(playlist.id, token);
    for (const id of ids) {
      allIds.add(id);
    }
  }

  return allIds;
}
