"use server";

import { getTableSessionCookie, isValidUuid } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SongRequest, SongRequestStatus, MusicSession } from "@smol-cafe/db";

export interface CustomerJukeboxTrack extends SongRequest {
  hasVoted: boolean;
  isMyRequest: boolean;
}

export interface CustomerJukeboxData {
  success: boolean;
  hasSession: boolean;
  tableLabel?: string;
  isJukeboxOpen: boolean;
  playingTrack: SongRequest | null;
  queue: CustomerJukeboxTrack[];
  message?: string;
}

export interface StaffJukeboxData {
  success: boolean;
  session: MusicSession | null;
  playingTrack: SongRequest | null;
  pendingRequests: SongRequest[];
  queuedTracks: SongRequest[];
  playedHistory: SongRequest[];
}

/**
 * Public Server Action: Fetches customer jukebox queue with live votes and active track.
 */
export async function fetchJukeboxQueueAction(): Promise<CustomerJukeboxData> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId || !session.locationId || !isValidUuid(session.sessionId)) {
    return {
      success: false,
      hasSession: false,
      isJukeboxOpen: false,
      playingTrack: null,
      queue: [],
      message: "Please scan a table QR code to request and vote for music.",
    };
  }

  const supabase = createAdminClient();

  try {
    // 1. Find Open Music Session for this location
    const { data: musicSession } = await supabase
      .from("music_sessions")
      .select("*")
      .eq("location_id", session.locationId)
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!musicSession) {
      return {
        success: true,
        hasSession: true,
        tableLabel: session.tableLabel,
        isJukeboxOpen: false,
        playingTrack: null,
        queue: [],
        message: "The café jukebox is currently taking a break.",
      };
    }

    // 2. Fetch Currently Playing Track
    const { data: playingTrack } = await supabase
      .from("song_requests")
      .select("*")
      .eq("session_id", musicSession.id)
      .eq("status", "PLAYING")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch Queued & Approved Tracks
    const { data: queuedTracks, error: qErr } = await supabase
      .from("song_requests")
      .select("*")
      .eq("session_id", musicSession.id)
      .in("status", ["QUEUED", "APPROVED"])
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: true });

    if (qErr) {
      console.error("Error fetching queued tracks:", qErr);
    }

    // 4. Fetch table's cast votes
    const { data: userVotes } = await supabase
      .from("song_votes")
      .select("request_id")
      .eq("table_session_id", session.sessionId);

    const votedSet = new Set((userVotes || []).map((v) => v.request_id));

    const enrichedQueue: CustomerJukeboxTrack[] = ((queuedTracks as SongRequest[]) || []).map(
      (track) => ({
        ...track,
        hasVoted: votedSet.has(track.id),
        isMyRequest: track.table_session_id === session.sessionId,
      })
    );

    return {
      success: true,
      hasSession: true,
      tableLabel: session.tableLabel,
      isJukeboxOpen: true,
      playingTrack: (playingTrack as SongRequest) || null,
      queue: enrichedQueue,
    };
  } catch (err) {
    console.error("Error in fetchJukeboxQueueAction:", err);
    return {
      success: false,
      hasSession: true,
      tableLabel: session.tableLabel,
      isJukeboxOpen: false,
      playingTrack: null,
      queue: [],
      message: "Could not load the café music queue.",
    };
  }
}

/**
 * Public Server Action: Submits a new song request from a table session
 */
export async function submitSongRequestAction(
  trackName: string,
  artist: string
): Promise<{ success: boolean; message?: string }> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId || !session.locationId || !isValidUuid(session.sessionId)) {
    return { success: false, message: "Please scan a table QR code to request songs." };
  }

  const supabase = createAdminClient();

  try {
    const { data: res, error } = await supabase.rpc("submit_song_request", {
      p_location_id: session.locationId,
      p_table_session_id: session.sessionId,
      p_track_name: trackName,
      p_artist: artist,
    });

    if (error) {
      console.error("Error in submit_song_request RPC:", error);
      return { success: false, message: "Failed to submit song request." };
    }

    const parsed = res as { success: boolean; message?: string; error?: string };
    return {
      success: parsed.success,
      message: parsed.message || (parsed.success ? "Song requested!" : "Could not request song."),
    };
  } catch (err) {
    console.error("Error in submitSongRequestAction:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/**
 * Public Server Action: Casts an upvote for a track from a table session
 */
export async function castSongVoteAction(
  requestId: string
): Promise<{ success: boolean; voteCount?: number; message?: string }> {
  const session = await getTableSessionCookie();
  if (!session || !session.sessionId || !isValidUuid(session.sessionId)) {
    return { success: false, message: "Please scan your table QR code to vote." };
  }

  const supabase = createAdminClient();

  try {
    const { data: res, error } = await supabase.rpc("cast_song_vote", {
      p_request_id: requestId,
      p_table_session_id: session.sessionId,
    });

    if (error) {
      console.error("Error in cast_song_vote RPC:", error);
      return { success: false, message: "Could not cast vote." };
    }

    const parsed = res as { success: boolean; vote_count?: number; message?: string };
    return {
      success: parsed.success,
      voteCount: parsed.vote_count,
      message: parsed.message,
    };
  } catch (err) {
    console.error("Error in castSongVoteAction:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/**
 * Staff Server Action: Fetches all tracks and sessions for Staff DJ management
 */
export async function fetchStaffJukeboxAction(): Promise<StaffJukeboxData> {
  const supabase = createAdminClient();

  try {
    // 1. Get latest music session
    const { data: session } = await supabase
      .from("music_sessions")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return {
        success: true,
        session: null,
        playingTrack: null,
        pendingRequests: [],
        queuedTracks: [],
        playedHistory: [],
      };
    }

    // 2. Fetch tracks grouped by status
    const { data: allTracks } = await supabase
      .from("song_requests")
      .select("*")
      .eq("session_id", session.id)
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: true });

    const tracks = (allTracks as SongRequest[]) || [];
    const playingTrack = tracks.find((t) => t.status === "PLAYING") || null;
    const pendingRequests = tracks.filter((t) => t.status === "PENDING");
    const queuedTracks = tracks.filter((t) => t.status === "QUEUED" || t.status === "APPROVED");
    const playedHistory = tracks.filter((t) => t.status === "PLAYED" || t.status === "SKIPPED");

    return {
      success: true,
      session: session as MusicSession,
      playingTrack,
      pendingRequests,
      queuedTracks,
      playedHistory,
    };
  } catch (err) {
    console.error("Error in fetchStaffJukeboxAction:", err);
    return {
      success: false,
      session: null,
      playingTrack: null,
      pendingRequests: [],
      queuedTracks: [],
      playedHistory: [],
    };
  }
}

import { requireStaffAuth } from "@/lib/auth/rbac";

/**
 * Staff Server Action: Updates a song request status (Approve, Play, Played, Reject, Skip)
 */
export async function updateSongStatusAction(
  requestId: string,
  status: SongRequestStatus
): Promise<{ success: boolean; message?: string }> {
  const auth = await requireStaffAuth(["admin", "super_admin", "cashier", "kitchen"]);
  if (!auth.authorized) {
    return { success: false, message: auth.message || "Unauthorized." };
  }

  const supabase = createAdminClient();

  try {
    // If setting to PLAYING, move any previous PLAYING track to PLAYED
    if (status === "PLAYING") {
      const { data: currentPlaying } = await supabase
        .from("song_requests")
        .select("id")
        .eq("status", "PLAYING")
        .neq("id", requestId);

      if (currentPlaying && currentPlaying.length > 0) {
        await supabase
          .from("song_requests")
          .update({ status: "PLAYED", updated_at: new Date().toISOString() })
          .in(
            "id",
            currentPlaying.map((p) => p.id)
          );
      }
    }

    const { error } = await supabase
      .from("song_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      return { success: false, message: "Failed to update track status." };
    }

    return { success: true, message: `Track marked as ${status}.` };
  } catch (err) {
    console.error("Error in updateSongStatusAction:", err);
    return { success: false, message: "An unexpected error occurred." };
  }
}

/**
 * Staff Server Action: Opens or Closes a Music Session
 */
export async function toggleMusicSessionAction(
  sessionId: string,
  isOpen: boolean
): Promise<{ success: boolean; message?: string }> {
  const auth = await requireStaffAuth(["admin", "super_admin", "cashier", "kitchen"]);
  if (!auth.authorized) {
    return { success: false, message: auth.message || "Unauthorized." };
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("music_sessions")
      .update({
        status: isOpen ? "OPEN" : "CLOSED",
        closed_at: isOpen ? null : new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      return { success: false, message: "Failed to update session." };
    }

    return {
      success: true,
      message: `Jukebox is now ${isOpen ? "open for requests" : "closed"}.`,
    };
  } catch {
    return { success: false, message: "An unexpected error occurred." };
  }
}
