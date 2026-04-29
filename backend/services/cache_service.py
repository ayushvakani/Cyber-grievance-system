"""
Day 90: Response Caching Service

Thread-safe in-memory cache for CRAG pipeline results, keyed by complaint_id.
Supports TTL expiry, manual invalidation, and hit/miss statistics.

Design: uses dict + threading.Lock for safety without Redis dependency.
Drop-in Redis upgrade: replace _store with redis.Redis and _lock with noop.
"""
import time
import threading
import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Default TTL: 4 hours. CRAG results are deterministic per complaint — safe to cache long.
DEFAULT_TTL_SECONDS = 4 * 60 * 60


class CRAGCache:
    """
    Thread-safe TTL cache for CRAG pipeline results.

    Entry format in _store: {complaint_id: (payload, expiry_timestamp)}
    """

    def __init__(self, ttl_seconds: int = DEFAULT_TTL_SECONDS):
        self._store: Dict[str, Tuple[Dict[str, Any], float]] = {}
        self._lock = threading.Lock()
        self._ttl = ttl_seconds

        # Stats
        self._hits = 0
        self._misses = 0

    # ──────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────

    def get(self, complaint_id: str) -> Optional[Dict[str, Any]]:
        """Return cached result or None if missing/expired."""
        with self._lock:
            entry = self._store.get(complaint_id)
            if entry is None:
                self._misses += 1
                return None

            payload, expiry = entry
            if time.time() > expiry:
                # Expired — evict
                del self._store[complaint_id]
                self._misses += 1
                logger.debug(f"[Cache] EXPIRED: {complaint_id}")
                return None

            self._hits += 1
            logger.info(f"[Cache] HIT: {complaint_id}")
            return payload

    def set(self, complaint_id: str, payload: Dict[str, Any]) -> None:
        """Store result with TTL."""
        with self._lock:
            expiry = time.time() + self._ttl
            self._store[complaint_id] = (payload, expiry)
        logger.info(f"[Cache] SET: {complaint_id} (TTL {self._ttl}s)")

    def invalidate(self, complaint_id: str) -> bool:
        """Remove a specific entry. Returns True if it existed."""
        with self._lock:
            existed = complaint_id in self._store
            self._store.pop(complaint_id, None)
        if existed:
            logger.info(f"[Cache] INVALIDATED: {complaint_id}")
        return existed

    def clear(self) -> int:
        """Wipe the entire cache. Returns number of entries removed."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
        logger.warning(f"[Cache] CLEARED all {count} entries")
        return count

    def evict_expired(self) -> int:
        """Proactively remove all expired entries. Returns count removed."""
        now = time.time()
        with self._lock:
            expired_keys = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in expired_keys:
                del self._store[k]
        if expired_keys:
            logger.info(f"[Cache] Evicted {len(expired_keys)} expired entries")
        return len(expired_keys)

    def stats(self) -> Dict[str, Any]:
        """Return cache health snapshot."""
        with self._lock:
            total = self._hits + self._misses
            return {
                "entries": len(self._store),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total, 3) if total > 0 else 0.0,
                "ttl_seconds": self._ttl,
            }


# ── Singleton instance used across all routers ──
crag_cache = CRAGCache()
