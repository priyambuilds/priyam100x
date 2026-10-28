import { BUS_VERSION, type BusHandler, type MessageBus, type Topic } from './bus';

// Same contract as RedisBus but in-process. Share one instance between several
// test apps to simulate "many instances, one Redis" without Redis.
export class MemoryBus implements MessageBus {
    private counts = new Map<Topic, number>();
    private handlers = new Set<BusHandler>();

    get topicCount() { return this.counts.size; }

    onEvent(handler: BusHandler) {
        this.handlers.add(handler);
        return () => { this.handlers.delete(handler); };
    }

    async publish(topic: Topic, event: { type: string; [key: string]: unknown }) {
        if (!this.counts.has(topic)) return; // nobody listening, like real Pub/Sub
        const copy = JSON.parse(JSON.stringify({ v: BUS_VERSION, ...event }));
        for (const handler of this.handlers) handler(topic, copy);
    }

    async subscribe(topic: Topic) {
        this.counts.set(topic, (this.counts.get(topic) ?? 0) + 1);
    }

    async unsubscribe(topic: Topic) {
        const count = this.counts.get(topic) ?? 0;
        if (count > 1) this.counts.set(topic, count - 1);
        else this.counts.delete(topic);
    }

    async close() { this.handlers.clear(); }
}
