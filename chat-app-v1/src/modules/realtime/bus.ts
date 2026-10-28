export type Topic = `room:${string}` | `user:${string}`;
export const roomTopic = (roomId: string): Topic => `room:${roomId}`;
export const userTopic = (userId: string): Topic => `user:${userId}`;

/** Every bus payload carries `v` so a rolling deploy can tell versions apart. */
export const BUS_VERSION = 1;
export type BusEvent = { v: number; type: string; [key: string]: unknown };
export type BusHandler = (topic: Topic, event: BusEvent) => void;

// The only cross-process broadcast. Services and the gateway never touch Redis
// Pub/Sub directly, so tests can swap in MemoryBus.
export interface MessageBus {
  publish(topic: Topic, event: { type: string; [key: string]: unknown }): Promise<void>;
  /** Ref-counted: the underlying channel is joined on 0 -> 1 only. */
  subscribe(topic: Topic): Promise<void>;
  /** Ref-counted: the underlying channel is left on 1 -> 0 only. */
  unsubscribe(topic: Topic): Promise<void>;
  /** Register the local fan-out callback. Returns a function that removes it. */
  onEvent(handler: BusHandler): () => void;
  /** Number of distinct topics this instance is subscribed to (for metrics). */
  readonly topicCount: number;
  close(): Promise<void>;
}
