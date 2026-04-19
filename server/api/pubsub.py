"""In-process pub/sub for SSE fan-out (one process / single Cloud Run instance)."""

from __future__ import annotations

import queue
import threading
from typing import Any

_lock = threading.Lock()
_subscribers: dict[int, set[queue.Queue]] = {}


def subscribe(user_id: int) -> queue.Queue:
    q: queue.Queue = queue.Queue(maxsize=256)
    with _lock:
        _subscribers.setdefault(user_id, set()).add(q)
    return q


def unsubscribe(user_id: int, q: queue.Queue) -> None:
    with _lock:
        subs = _subscribers.get(user_id)
        if not subs:
            return
        subs.discard(q)
        if not subs:
            _subscribers.pop(user_id, None)


def publish(user_id: int, event: dict[str, Any]) -> None:
    with _lock:
        subs = list(_subscribers.get(user_id, ()))
    for q in subs:
        try:
            q.put_nowait(event)
        except queue.Full:
            # Drop if client is too slow; REST inbox remains source of truth.
            pass
