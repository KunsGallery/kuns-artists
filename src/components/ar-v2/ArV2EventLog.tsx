"use client";

import type { ArV2Event } from "@/lib/ar-v2";

export function ArV2EventLog({ events }: { events: ArV2Event[] }) {
  return (
    <section className="arv2-panel" aria-labelledby="event-log-title">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">Runtime telemetry</p>
          <h2 id="event-log-title">Event Log</h2>
        </div>
        <span className="arv2-count">{events.length}</span>
      </div>
      <div className="arv2-event-log" aria-live="polite">
        {events.length === 0 ? (
          <p className="arv2-empty">Build a model to capture browser events.</p>
        ) : (
          events.map((event) => (
            <div className="arv2-event-row" key={event.id}>
              <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>
              <span className="arv2-event-type">{event.type}</span>
              <span>{event.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
