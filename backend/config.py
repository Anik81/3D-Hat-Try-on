"""Configuration settings for the Virtual Hat Try-On application."""

import os

class Config:
    # Server settings
    HOST = "localhost"
    PORT = 8000
    
    # Face detection settings
    DETECTION_CONFIDENCE = 0.5
    TRACKING_CONFIDENCE = 0.5
    MAX_NUM_FACES = 1
    
    # Performance settings
    TARGET_FPS = 20
    FRAME_WIDTH = 640
    FRAME_HEIGHT = 480
    DETECTION_WIDTH = 320  # Smaller size for face detection
    DETECTION_HEIGHT = 240
    
    # Hat positioning settings
    HAT_SCALE_FACTOR = 1.3  # Fine-tuned for optimal size
    HAT_OFFSET_Y = -0.6   # Positioned properly on top of head
    HAT_OFFSET_Z = 0.05   # Move hat forward
    
    # Model-specific scaling presets (inspired by MindAR methodology)
    HAT_MODEL_PRESETS = {
        'default': {'scale_multiplier': 1.0, 'y_offset': -0.8},
        'large_hat': {'scale_multiplier': 0.35, 'y_offset': -1.0},  # Like MindAR hat1
        'small_hat': {'scale_multiplier': 0.008, 'y_offset': -0.2}, # Like MindAR hat2
        'cowboy_hat': {'scale_multiplier': 0.8, 'y_offset': -0.9},
        'baseball_cap': {'scale_multiplier': 0.6, 'y_offset': -0.6}
    }
    
    # Smoothing settings
    SMOOTHING_FACTOR = 0.3  # For moving average (0 = no smoothing, 1 = max smoothing)
    
    # WebSocket settings
    MAX_MESSAGE_SIZE = 1024 * 1024 * 5  # 5MB max message size