import type { Redis } from 'ioredis';
import { BUS_VERSION, type BusHandler, type MessageBus, type Topic } from './bus';

export type RedisBusOptions = {
    prefix?: string;
    /**
     * Use sharded Pub/Sub (SPUBLISH / SSUBSCRIBE, Redis 7+). On a cluster, classic
     * PUBLISH is broadcast to *every* node, so traffic grows with cluster size;
     * a sharded channel lives on one shard, and only that shard carries it.
     */
    sharded?: boolean;
};

export class RedisBus implements MessageBus {
    private counts = new Map<Topic, number>();
    private handlers = new Set<BusHandler>();

    private pub: Redis;
    private sub: Redis;
    private prefix: string;
    private sharded: boolean;

    constructor(pub: Redis, sub: Redis, opts: RedisBusOptions | string = {}) {
        const o = typeof opts === 'string' ? { prefix: opts } : opts; // string = legacy prefix-only form
        this.pub = pub;
        this.sub = sub;
        this.prefix = o.prefix ?? 'chat:';
        this.sharded = o.sharded ?? false;

        this.sub.on(this.sharded ? 'smessage' : 'message', (channel: string, raw: string) => {
            if (!channel.startsWith(this.prefix)) return;
            const topic = channel.slice(this.prefix.length) as Topic;
            let event;
            try {
                event = JSON.parse(raw);
            } catch {
                console.error(`[RedisBus] dropped malformed payload on ${channel}`);
                return;
            }
            if (event?.v !== BUS_VERSION) return; // from an incompatible deploy
            for (const handler of this.handlers) handler(topic, event);
        });
    }

    get topicCount() { return this.counts.size; }

    onEvent(handler: BusHandler) {
        this.handlers.add(handler);
        return () => { this.handlers.delete(handler); };
    }

    async publish(topic: Topic, event: { type: string; [key: string]: unknown }) {
        const payload = JSON.stringify({ v: BUS_VERSION, ...event });
        if (this.sharded) await this.pub.spublish(this.prefix + topic, payload);
        else await this.pub.publish(this.prefix + topic, payload);
    }

    async subscribe(topic: Topic) {
        const count = this.counts.get(topic) ?? 0;
        this.counts.set(topic, count + 1);
        if (count > 0) return;
        try {
            if (this.sharded) await this.sub.ssubscribe(this.prefix + topic);
            else await this.sub.subscribe(this.prefix + topic);
        } catch (err) {
            this.counts.delete(topic);
            throw err;
        }
    }

    async unsubscribe(topic: Topic) {
        const count = this.counts.get(topic) ?? 0;
        if (count <= 0) return;
        if (count > 1) {
            this.counts.set(topic, count - 1);
            return;
        }
        this.counts.delete(topic);
        if (this.sharded) await this.sub.sunsubscribe(this.prefix + topic);
        else await this.sub.unsubscribe(this.prefix + topic);
    }

    async close() {
        this.handlers.clear();
        this.sub.disconnect();
        this.pub.disconnect();
    }
}
