"""Tiny in-memory stand-in for the Supabase client used by route handlers.

Only implements the chain shapes our routes actually call:
    sb.table(name).select(cols).eq(col, val).limit(n).execute()
    sb.table(name).insert(rows).execute()
    sb.table(name).update(payload).eq(col, val).execute()
"""
import threading
from typing import Any, Dict, List


class _Result:
    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


class _Query:
    def __init__(self, table: "_Table", op: str, payload: Any = None):
        self._table = table
        self._op = op
        self._payload = payload
        self._filters: List[tuple] = []
        self._limit: int = None
        self._select_cols: str = "*"

    def select(self, cols: str = "*") -> "_Query":
        self._select_cols = cols
        return self

    def eq(self, col: str, val: Any) -> "_Query":
        self._filters.append((col, val))
        return self

    def limit(self, n: int) -> "_Query":
        self._limit = n
        return self

    def execute(self) -> _Result:
        return self._table._execute(self)


class _Table:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]], lock: threading.RLock, name: str):
        self._store = store
        self._lock = lock
        self._name = name

    def select(self, cols: str = "*") -> _Query:
        q = _Query(self, "select")
        q._select_cols = cols
        return q

    def insert(self, rows) -> _Query:
        return _Query(self, "insert", rows)

    def update(self, payload: Dict[str, Any]) -> _Query:
        return _Query(self, "update", payload)

    def _matches(self, row: Dict[str, Any], filters) -> bool:
        return all(row.get(k) == v for k, v in filters)

    def _execute(self, q: _Query) -> _Result:
        with self._lock:
            rows = self._store.setdefault(self._name, [])
            if q._op == "select":
                matched = [dict(r) for r in rows if self._matches(r, q._filters)]
                if q._limit is not None:
                    matched = matched[: q._limit]
                return _Result(matched)
            if q._op == "insert":
                payload = q._payload
                if isinstance(payload, dict):
                    payload = [payload]
                inserted = [dict(r) for r in payload]
                rows.extend(inserted)
                return _Result(inserted)
            if q._op == "update":
                changed = []
                for r in rows:
                    if self._matches(r, q._filters):
                        r.update(q._payload)
                        changed.append(dict(r))
                return _Result(changed)
            raise ValueError(f"unsupported op: {q._op}")


class FakeSupabase:
    def __init__(self):
        self._store: Dict[str, List[Dict[str, Any]]] = {}
        self._lock = threading.RLock()

    def table(self, name: str) -> _Table:
        return _Table(self._store, self._lock, name)
