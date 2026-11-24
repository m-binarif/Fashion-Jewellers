/**
 * realtime.js — Browser client for Server-Sent Events (SSE) synchronization.
 * Automatically keeps UI updated when other users make database changes.
 */

import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class RealtimeSyncManager {
  constructor() {
    this.source = null;
    this.listeners = new Map(); // eventName -> Set of callback functions
    this.reconnectTimeout = null;
  }

  connect() {
    if (this.source) return;

    try {
      this.source = new EventSource(`${API_BASE}/sync/events`);

      this.source.addEventListener('orders:changed', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('orders:changed', data);
      });

      this.source.addEventListener('products:changed', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('products:changed', data);
      });

      this.source.addEventListener('suppliers:changed', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('suppliers:changed', data);
      });

      this.source.addEventListener('social:post-triggered', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('social:post-triggered', data);
      });

      this.source.addEventListener('social:approval-created', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('social:approval-created', data);
      });

      this.source.addEventListener('social:status-updated', (e) => {
        const data = e.data ? JSON.parse(e.data) : null;
        this.emit('social:status-updated', data);
      });

      this.source.onerror = () => {
        if (this.source) {
          this.source.close();
          this.source = null;
        }
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Realtime sync connection warning:', err);
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    this.connect();

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  emit(eventType, data) {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in realtime subscriber for ${eventType}:`, err);
        }
      });
    }
  }
}

export const realtimeManager = new RealtimeSyncManager();

export function useRealtimeSync(eventType, onEvent) {
  useEffect(() => {
    if (!eventType || !onEvent) return;
    const unsubscribe = realtimeManager.subscribe(eventType, onEvent);
    return () => unsubscribe();
  }, [eventType, onEvent]);
}
