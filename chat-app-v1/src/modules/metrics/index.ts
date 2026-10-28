// Per-instance counters. Cheap, in-memory, exposed at GET /metrics.
export class Metrics {
  readonly counters = {
    messagesSent: 0,
    messagesDelivered: 0, // bus events fanned out to local sockets
    syncRequests: 0,      // a spike means the live path is losing messages
    rateLimited: 0,
    backpressureCloses: 0,
    publishFailures: 0,
  };
  inc(name: keyof Metrics['counters'], by = 1) { this.counters[name] += by; }
}
