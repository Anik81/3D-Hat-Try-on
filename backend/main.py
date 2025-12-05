"""FastAPI main application with WebSocket support for Virtual Hat Try-On."""

import asyncio
import json
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import Config
from face_detector import FaceDetector
from pose_calculator import PoseCalculator

app = FastAPI(title="Virtual Hat Try-On Backend", version="1.0.0")

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize face detection and pose calculation
face_detector = FaceDetector()
pose_calculator = PoseCalculator()

class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"Client disconnected. Active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending message: {e}")

manager = ConnectionManager()

def process_frame(frame_bytes: bytes) -> dict:
    """Process a single frame and return hat positioning data."""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"face_detected": False, "error": "Invalid frame"}
        
        # Resize frame for processing if needed
        height, width = frame.shape[:2]
        if width > Config.DETECTION_WIDTH:
            scale = Config.DETECTION_WIDTH / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            frame = cv2.resize(frame, (new_width, new_height))
        
        # Detect face landmarks
        landmarks = face_detector.detect_face_landmarks(frame)
        
        if landmarks is None:
            return {"face_detected": False}
        
        # Calculate hat position
        hat_pose = pose_calculator.calculate_hat_pose(landmarks, frame.shape)
        
        return {
            "face_detected": True,
            "hat": {
                "position": hat_pose["position"],
                "rotation": hat_pose["rotation"],
                "scale": hat_pose["scale"]
            },
            "frame_size": {"width": frame.shape[1], "height": frame.shape[0]}
        }
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        return {"face_detected": False, "error": str(e)}

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Virtual Hat Try-On Backend is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check with system information."""
    return {
        "status": "healthy",
        "face_detector": "initialized",
        "pose_calculator": "initialized",
        "config": {
            "detection_confidence": Config.DETECTION_CONFIDENCE,
            "target_fps": Config.TARGET_FPS,
            "max_faces": Config.MAX_NUM_FACES
        }
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time frame processing."""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive frame data as bytes
            data = await websocket.receive_bytes()
            
            # Process the frame
            result = process_frame(data)
            
            # Send result back to client
            await manager.send_personal_message(result, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected normally")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    print(f"Starting Virtual Hat Try-On Backend on {Config.HOST}:{Config.PORT}")
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True,
        log_level="info"
    )