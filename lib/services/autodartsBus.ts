// lib/services/autodartsBus.ts
import { AutodartsEvent, AutodartsBridgeState } from '@/types/autodarts';

type EventListener = (event: AutodartsEvent) => void;

class AutodartsEventBus {
  private listeners: Set<EventListener> = new Set();
  private lastEvent: AutodartsEvent | null = null;
  private lastHeartbeat: number = 0;
  private boardId: string = 'pi-board-1';

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispatch(event: AutodartsEvent, boardId?: string) {
    this.lastEvent = event;
    this.lastHeartbeat = Date.now();
    if (boardId) this.boardId = boardId;

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error dispatching Autodarts event to listener:', err);
      }
    });
  }

  public getStatus(): AutodartsBridgeState {
    const isConnected = Date.now() - this.lastHeartbeat < 60000; // Connected if activity in last 60s
    return {
      isConnected,
      lastEventTime: this.lastHeartbeat || null,
      boardId: this.boardId,
      currentTurnDarts: [],
      lastDartCoords: this.lastEvent?.type === 'THROW' ? this.lastEvent.coords || null : null,
    };
  }

  public getLastEvent(): AutodartsEvent | null {
    return this.lastEvent;
  }
}

// Global singleton across hot-reloads and API invocations
declare global {
  var __autodartsBus: AutodartsEventBus | undefined;
}

export const autodartsBus: AutodartsEventBus =
  globalThis.__autodartsBus ?? (globalThis.__autodartsBus = new AutodartsEventBus());
