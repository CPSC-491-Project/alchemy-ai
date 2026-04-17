/**
 * EventBus.js — Singleton Observer/Pub-Sub Implementation
 * Alchemy AI | SCRUM Integration Responsibility (Allisa Warren)
 *
 * Architecture: Observer Pattern (Proposal §6.2.1–6.3.3)
 * Usage:
 *   import EventBus from './EventBus';
 *   const unsub = EventBus.subscribe('INGREDIENTS_UPDATED', handler);
 *   EventBus.emit('INGREDIENTS_UPDATED', { userId, updatedPantry });
 *   unsub(); // unsubscribe when component unmounts
 *
 * Event Catalogue (Proposal §6.2.4):
 *   INGREDIENTS_UPDATED   — pantry scan or manual cabinet add/remove
 *   RECIPE_LIKED          — user favourites a recipe
 *   CONNECTIVITY_OFFLINE  — device loses network
 *   CONNECTIVITY_ONLINE   — device regains network
 *   USER_LOGOUT           — session terminated
 *   PARTY_REMINDER_READY  — 30-min pre-party push trigger
 *   NOTIF_APPROVED        — Notification Scheduler cleared send
 *   NOTIF_SENT            — PushGateway confirms delivery to APNs
 */

// --------------------------------------------------------------------------
// Developer console flag — flip to true during local dev/testing
// Logs every emit, subscriber count, and payload preview to the console.
// Proposal §6.3.3: "Dev console logs all event emissions, subscribers,
// timestamps, and payload previews."
// --------------------------------------------------------------------------
const DEV_MODE = __DEV__ ?? false;

// --------------------------------------------------------------------------
// Registered event names — acts as the internal contract between front-end
// and back-end teams (Proposal §6.2.4).  Import and use these constants
// instead of raw strings to prevent typo-driven silent failures.
// --------------------------------------------------------------------------
export const Events = Object.freeze({
  INGREDIENTS_UPDATED:  'INGREDIENTS_UPDATED',
  RECIPE_LIKED:         'RECIPE_LIKED',
  CONNECTIVITY_OFFLINE: 'CONNECTIVITY_OFFLINE',
  CONNECTIVITY_ONLINE:  'CONNECTIVITY_ONLINE',
  USER_LOGOUT:          'USER_LOGOUT',
  PARTY_REMINDER_READY: 'PARTY_REMINDER_READY',
  NOTIF_APPROVED:       'NOTIF_APPROVED',
  NOTIF_SENT:           'NOTIF_SENT',
});

// --------------------------------------------------------------------------
// EventBus — private singleton instance
// --------------------------------------------------------------------------
class EventBusClass {
  constructor() {
    // Map<eventName, Set<handler>>
    this._listeners = new Map();
    // Circular log buffer for the dev console overlay (last 50 events)
    this._log = [];
    this._logLimit = 50;
  }

  // ------------------------------------------------------------------------
  // subscribe(eventName, handler) → unsubscribe function
  //
  // Registers a handler for the given event.  Returns a cleanup function so
  // React components can unsubscribe on unmount without holding a reference
  // to the handler function:
  //
  //   useEffect(() => {
  //     return EventBus.subscribe(Events.INGREDIENTS_UPDATED, handleUpdate);
  //   }, []);
  // ------------------------------------------------------------------------
  subscribe(eventName, handler) {
    if (typeof handler !== 'function') {
      console.warn(`[EventBus] subscribe("${eventName}") — handler must be a function`);
      return () => {};
    }

    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);

    if (DEV_MODE) {
      const count = this._listeners.get(eventName).size;
      console.log(`[EventBus] ✅ subscribed to "${eventName}" (${count} listener${count !== 1 ? 's' : ''})`);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(eventName, handler);
  }

  // ------------------------------------------------------------------------
  // unsubscribe(eventName, handler)
  //
  // Removes a specific handler from an event.  Prefer using the cleanup
  // function returned by subscribe() over calling this directly.
  // ------------------------------------------------------------------------
  unsubscribe(eventName, handler) {
    const handlers = this._listeners.get(eventName);
    if (!handlers) return;

    handlers.delete(handler);
    if (handlers.size === 0) {
      this._listeners.delete(eventName);
    }

    if (DEV_MODE) {
      console.log(`[EventBus] ❌ unsubscribed from "${eventName}"`);
    }
  }

  // ------------------------------------------------------------------------
  // emit(eventName, data)
  //
  // Broadcasts data to all handlers subscribed to eventName.  Each handler
  // is called synchronously in subscription order.  Errors in individual
  // handlers are caught and logged so a single bad observer cannot break the
  // entire fan-out (Proposal §6.2.5 — "easy fan-out" advantage).
  // ------------------------------------------------------------------------
  emit(eventName, data = {}) {
    const timestamp = new Date().toISOString();
    const handlers  = this._listeners.get(eventName);
    const count     = handlers ? handlers.size : 0;

    // Dev console overlay entry (Proposal §6.3.3)
    const entry = { eventName, data, timestamp, listenerCount: count };
    this._log.push(entry);
    if (this._log.length > this._logLimit) this._log.shift();

    if (DEV_MODE) {
      console.group(`[EventBus] 📢 emit "${eventName}" — ${count} listener${count !== 1 ? 's' : ''} @ ${timestamp}`);
      console.log('Payload:', data);
      if (count === 0) console.warn('  ⚠️  No listeners registered for this event.');
      console.groupEnd();
    }

    if (!handlers || count === 0) return;

    // Fan-out: call each observer independently
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Handler error on "${eventName}":`, err);
      }
    });
  }

  // ------------------------------------------------------------------------
  // once(eventName, handler)
  //
  // Convenience helper — subscribes a handler that auto-removes itself after
  // the first invocation.  Useful for one-shot events like NOTIF_SENT.
  // ------------------------------------------------------------------------
  once(eventName, handler) {
    const wrapper = (data) => {
      handler(data);
      this.unsubscribe(eventName, wrapper);
    };
    return this.subscribe(eventName, wrapper);
  }

  // ------------------------------------------------------------------------
  // getLog() — returns the dev console event history (last 50 entries)
  // Consumed by the Developer Console Overlay (Proposal §6.3.3).
  // ------------------------------------------------------------------------
  getLog() {
    return [...this._log];
  }

  // ------------------------------------------------------------------------
  // clearAll() — removes every listener (test utility only, not for prod)
  // ------------------------------------------------------------------------
  clearAll() {
    this._listeners.clear();
    this._log = [];
    if (DEV_MODE) console.log('[EventBus] 🧹 all listeners cleared');
  }

  // ------------------------------------------------------------------------
  // listenerCount(eventName) — returns the number of active listeners
  // Useful in unit tests: fire a mock event, assert count === expected.
  // ------------------------------------------------------------------------
  listenerCount(eventName) {
    return this._listeners.get(eventName)?.size ?? 0;
  }
}

// Export a single shared instance — any module that imports EventBus gets
// the same object, fulfilling the Singleton requirement (Proposal §6.2.2).
const EventBus = new EventBusClass();
export default EventBus;
