type Handler<T = unknown> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on<T = unknown>(event: string, handler: Handler<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: Handler<T>) {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<T = unknown>(event: string, payload: T) {
    this.listeners.get(event)?.forEach(h => h(payload));
  }
}

export const eventBus = new EventBus();

export type ParameterDropEvent = {
  nodeId: string;             // cible paramètres
  capability: string;         // module
  token: string;              // token inséré
  slot?: string;              // slot spécifique (ex: condition_left, condition_right)
};
