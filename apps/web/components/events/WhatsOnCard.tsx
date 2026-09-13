"use client";

import React, { useState } from "react";
import type { CustomerEventView } from "@/app/events/actions";
import { registerEventRsvpAction } from "@/app/events/actions";
import { Ticket, Calendar, Clock, Check } from "lucide-react";

interface WhatsOnCardProps {
  initialEvents: CustomerEventView[];
}

export const WhatsOnCard: React.FC<WhatsOnCardProps> = ({ initialEvents }) => {
  const [events, setEvents] = useState<CustomerEventView[]>(initialEvents);
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);
  const [activeGuestModalEventId, setActiveGuestModalEventId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [feedback, setFeedback] = useState<{ eventId: string; message: string } | null>(null);

  if (!events || events.length === 0) {
    return null;
  }

  const handleJoin = async (eventId: string, isGuestSubmit = false) => {
    setRsvpLoadingId(eventId);
    setFeedback(null);

    try {
      const res = await registerEventRsvpAction(
        eventId,
        isGuestSubmit ? guestName : undefined,
        isGuestSubmit ? guestContact : undefined
      );

      if (res.success) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, rsvpCount: e.rsvpCount + 1, isRegistered: true } : e
          )
        );
        setFeedback({ eventId, message: res.message || "✓ You're in!" });
        setActiveGuestModalEventId(null);
        setGuestName("");
        setGuestContact("");
      } else {
        setFeedback({ eventId, message: res.message || "Could not register." });
      }
    } catch {
      setFeedback({ eventId, message: "An error occurred." });
    } finally {
      setRsvpLoadingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-[#9B2C2C] dark:text-[#F6AD55]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
            What&apos;s On at Smol Café
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
          Community Events
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const startDate = new Date(event.startsAt);
          const formattedDate = startDate.toLocaleDateString("en-IN", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          const formattedTime = startDate.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          const spotsLeft = Math.max(0, event.capacity - event.rsvpCount);

          return (
            <div
              key={event.id}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#9B2C2C] dark:text-[#F6AD55]">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formattedDate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formattedTime}</span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                    {event.title}
                  </h3>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold ${
                    spotsLeft <= 3 && spotsLeft > 0
                      ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  {event.isFull ? "Full" : `${spotsLeft} spots left`}
                </span>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {event.description}
              </p>

              {event.joinUrlOrNote && (
                <p className="text-[11px] font-medium text-stone-500 bg-stone-50 p-2.5 rounded-xl dark:bg-stone-800/60 dark:text-stone-400">
                  {event.joinUrlOrNote}
                </p>
              )}

              {feedback && feedback.eventId === event.id && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {feedback.message}
                </p>
              )}

              {/* Guest RSVP Inline Drawer */}
              {activeGuestModalEventId === event.id ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                    Quick Guest RSVP
                  </span>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  />
                  <input
                    type="text"
                    placeholder="Phone or Email (Optional)"
                    value={guestContact}
                    onChange={(e) => setGuestContact(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleJoin(event.id, true)}
                      disabled={rsvpLoadingId === event.id || !guestName.trim()}
                      className="flex-1 rounded-xl bg-[#9B2C2C] py-2 text-xs font-bold text-white shadow transition hover:bg-[#822424] disabled:opacity-50 dark:bg-[#C53030]"
                    >
                      {rsvpLoadingId === event.id ? "Registering..." : "Confirm RSVP"}
                    </button>
                    <button
                      onClick={() => setActiveGuestModalEventId(null)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-stone-500">
                    {event.rsvpCount} Attending
                  </span>

                  {event.isRegistered ? (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> Registered
                    </span>
                  ) : event.isFull ? (
                    <span className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-400 dark:border-stone-800 dark:bg-stone-800">
                      Sold Out
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveGuestModalEventId(event.id)}
                      disabled={rsvpLoadingId === event.id}
                      className="rounded-2xl bg-[#9B2C2C] px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-[#822424] active:scale-95 disabled:opacity-50 dark:bg-[#C53030]"
                    >
                      Join Event →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
