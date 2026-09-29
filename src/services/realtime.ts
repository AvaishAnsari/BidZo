// src/services/realtime.ts
type WebSocketCallback = (data: any) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  private isConnecting = false;
  private url: string = '';

  connect(auctionId?: string) {
    if (this.socket || this.isConnecting) return;

    // Use ws:// for HTTP and wss:// for HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If backend is running on a different host, use VITE_API_BASE_URL to extract host.
    // For now, assume it's running on localhost:8000 for development.
    const host = import.meta.env.VITE_API_BASE_URL
      ? new URL(import.meta.env.VITE_API_BASE_URL).host
      : 'localhost:8000';

    this.url = auctionId ? `${protocol}//${host}/ws/auctions/${auctionId}/` : `${protocol}//${host}/ws/auctions/`;

    this.isConnecting = true;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log(`[Realtime] Connected to ${this.url}`);
      this.isConnecting = false;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type;

        if (eventType && this.callbacks.has(eventType)) {
          this.callbacks.get(eventType)!.forEach(cb => cb(data));
        }
      } catch (err) {
        console.error('[Realtime] Message parse error:', err);
      }
    };

    this.socket.onclose = () => {
      console.log(`[Realtime] Disconnected from ${this.url}`);
      this.socket = null;
      this.isConnecting = false;
      // Simple reconnect logic
      setTimeout(() => this.connect(auctionId), 3000);
    };

    this.socket.onerror = (err) => {
      console.error(`[Realtime] WebSocket error:`, err);
    };
  }

  subscribe(eventType: string, callback: WebSocketCallback) {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set());
    }
    this.callbacks.get(eventType)!.add(callback);

    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType: string, callback: WebSocketCallback) {
    if (this.callbacks.has(eventType)) {
      this.callbacks.get(eventType)!.delete(callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.onclose = null; // Disable auto-reconnect
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
    this.callbacks.clear();
  }
}

export const realtime = new RealtimeService();
