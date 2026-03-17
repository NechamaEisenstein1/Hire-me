from collections import defaultdict

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self.metrics = defaultdict(int)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)
        self.metrics["active_visitors"] = len(self.connections)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)
        self.metrics["active_visitors"] = len(self.connections)

    async def broadcast(self, payload: dict[str, int | str]) -> None:
        dead: list[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead.append(connection)

        for ws in dead:
            self.disconnect(ws)


manager = WebSocketManager()
