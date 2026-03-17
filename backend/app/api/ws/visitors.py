from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws/visitors")
async def visitors_socket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    await manager.broadcast({"active_visitors": manager.metrics["active_visitors"]})

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
        await manager.broadcast({"active_visitors": manager.metrics["active_visitors"]})
