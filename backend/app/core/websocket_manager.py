import asyncio
from collections import defaultdict

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self.metrics: dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections.add(websocket)
            self.metrics["active_visitors"] = len(self.connections)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(websocket)
            self.metrics["active_visitors"] = len(self.connections)

    async def broadcast(self, payload: dict[str, int | str]) -> None:
        # Snapshot the connections to avoid RuntimeError: Set changed size during iteration
        async with self._lock:
            connections_snapshot = list(self.connections)

        dead: list[WebSocket] = []
        for connection in connections_snapshot:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)

        for ws in dead:
            await self.disconnect(ws)


manager = WebSocketManager()
