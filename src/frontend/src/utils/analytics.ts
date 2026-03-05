// Anonymous analytics — localStorage-based CRM
// No personal data is stored. Events are keyed by type and payload only.

const STORAGE_KEY = "bonsai_analytics";
const MAX_EVENTS = 500;

export interface AnalyticsEvent {
  eventType: string;
  payload: string;
  timestamp: number;
}

export interface AnalyticsSummary {
  totalEvents: number;
  byType: Record<string, number>;
  topPayloads: Record<string, { payload: string; count: number }[]>;
}

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Storage quota exceeded — silent fail
  }
}

/**
 * Record an anonymous analytics event.
 * Ring-buffer: caps at MAX_EVENTS by dropping the oldest when full.
 */
export function recordEvent(eventType: string, payload: string) {
  const events = loadEvents();
  const newEvent: AnalyticsEvent = {
    eventType,
    payload: payload.slice(0, 200), // cap payload length
    timestamp: Date.now(),
  };

  events.push(newEvent);

  // Ring-buffer: drop oldest entries if over limit
  const trimmed =
    events.length > MAX_EVENTS
      ? events.slice(events.length - MAX_EVENTS)
      : events;

  saveEvents(trimmed);
}

/**
 * Returns an aggregated summary of all recorded events.
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  const events = loadEvents();

  const byType: Record<string, number> = {};
  const payloadCounts: Record<string, Record<string, number>> = {};

  for (const ev of events) {
    // Count by type
    byType[ev.eventType] = (byType[ev.eventType] ?? 0) + 1;

    // Count payloads per type
    if (!payloadCounts[ev.eventType]) {
      payloadCounts[ev.eventType] = {};
    }
    const bucket = payloadCounts[ev.eventType];
    bucket[ev.payload] = (bucket[ev.payload] ?? 0) + 1;
  }

  // Build top 10 payloads per event type
  const topPayloads: Record<string, { payload: string; count: number }[]> = {};
  for (const [type, counts] of Object.entries(payloadCounts)) {
    topPayloads[type] = Object.entries(counts)
      .map(([payload, count]) => ({ payload, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return {
    totalEvents: events.length,
    byType,
    topPayloads,
  };
}

/**
 * Clear all analytics data from localStorage.
 */
export function clearAnalytics() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}
