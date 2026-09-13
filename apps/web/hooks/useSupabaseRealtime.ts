"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface RealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onData: (payload: unknown) => void;
  enabled?: boolean;
}

/**
 * Custom React hook for real-time PostgreSQL WebSocket subscriptions via Supabase Realtime.
 * Automatically cleans up subscriptions on component unmount and handles reconnects.
 */
export function useSupabaseRealtime({
  table,
  schema = "public",
  filter,
  event = "*",
  onData,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // If client creation fails or placeholder
      return;
    }

    // Create a unique channel name per component/table/filter
    const channelName = `realtime_${table}_${filter || "all"}_${Math.random().toString(36).substring(7)}`;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any).channel(channelName);

    if (!channel || typeof channel.on !== "function") {
      // Mock client does not support real WebSockets; caller falls back to polling gracefully
      return;
    }

    channel
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: unknown) => {
          if (onDataRef.current) {
            onDataRef.current(payload);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          // Connected
        }
      });

    return () => {
      try {
        if (typeof (supabase as unknown as { removeChannel?: (c: unknown) => void }).removeChannel === "function") {
          (supabase as unknown as { removeChannel: (c: unknown) => void }).removeChannel(channel);
        }
      } catch {
        // ignore cleanup error
      }
    };
  }, [table, schema, filter, event, enabled]);
}
