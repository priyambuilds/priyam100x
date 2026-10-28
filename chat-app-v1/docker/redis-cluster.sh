#!/bin/sh
# Three Redis Cluster masters in ONE container, announced as 127.0.0.1, so both
# the nodes (gossip inside the container) and host clients (mapped ports 7001-7003)
# can reach each other without docker networking tricks.
set -e
for port in 7001 7002 7003; do
  mkdir -p /data/$port
  redis-server --port $port --cluster-enabled yes --cluster-config-file /data/$port/nodes.conf \
    --cluster-node-timeout 5000 --cluster-announce-ip 127.0.0.1 --appendonly no \
    --dir /data/$port --daemonize yes
done
sleep 1
# Idempotent: on a container restart the nodes reload their saved slots, so don't re-create.
if redis-cli -p 7001 cluster info | grep -q "cluster_slots_assigned:16384"; then
  echo "cluster already formed"
else
  redis-cli -p 7001 --cluster create 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 --cluster-replicas 0 --cluster-yes
fi
echo "cluster ready"
tail -f /dev/null
