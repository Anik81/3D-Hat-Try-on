"""Utility functions for the Virtual Hat Try-On backend."""

import cv2
import numpy as np
from typing import Tuple, Dict, Any
import base64
from io import BytesIO
from PIL import Image

def resize_frame_for_processing(frame: np.ndarray, target_width: int = 320) -> np.ndarray:
    """
    Resize frame for efficient processing while maintaining aspect ratio.
    
    Args:
        frame: Input frame
        target_width: Target width for processing
        
    Returns:
        Resized frame
    """
    height, width = frame.shape[:2]
    if width <= target_width:
        return frame
    
    scale = target_width / width
    new_width = target_width
    new_height = int(height * scale)
    
    return cv2.resize(frame, (new_width, new_height))

def bytes_to_opencv_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert bytes to OpenCV image format.
    
    Args:
        image_bytes: Image data as bytes
        
    Returns:
        OpenCV image (BGR format)
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def opencv_image_to_bytes(image: np.ndarray, format: str = '.jpg') -> bytes:
    """
    Convert OpenCV image to bytes.
    
    Args:
        image: OpenCV image (BGR format)
        format: Image format ('.jpg', '.png', etc.)
        
    Returns:
        Image data as bytes
    """
    _, buffer = cv2.imencode(format, image)
    return buffer.tobytes()

def base64_to_opencv_image(base64_string: str) -> np.ndarray:
    """
    Convert base64 string to OpenCV image.
    
    Args:
        base64_string: Base64 encoded image
        
    Returns:
        OpenCV image (BGR format)
    """
    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64
    image_bytes = base64.b64decode(base64_string)
    return bytes_to_opencv_image(image_bytes)

def opencv_image_to_base64(image: np.ndarray, format: str = '.jpg') -> str:
    """
    Convert OpenCV image to base64 string.
    
    Args:
        image: OpenCV image (BGR format)  
        format: Image format ('.jpg', '.png', etc.)
        
    Returns:
        Base64 encoded image string
    """
    image_bytes = opencv_image_to_bytes(image, format)
    return base64.b64encode(image_bytes).decode('utf-8')

def normalize_coordinates(x: float, y: float, width: int, height: int) -> Tuple[float, float]:
    """
    Normalize pixel coordinates to 0-1 range.
    
    Args:
        x, y: Pixel coordinates
        width, height: Frame dimensions
        
    Returns:
        Normalized coordinates (0-1 range)
    """
    norm_x = x / width if width > 0 else 0.0
    norm_y = y / height if height > 0 else 0.0
    
    return np.clip(norm_x, 0.0, 1.0), np.clip(norm_y, 0.0, 1.0)

def denormalize_coordinates(norm_x: float, norm_y: float, width: int, height: int) -> Tuple[int, int]:
    """
    Convert normalized coordinates back to pixel coordinates.
    
    Args:
        norm_x, norm_y: Normalized coordinates (0-1 range)
        width, height: Frame dimensions
        
    Returns:
        Pixel coordinates
    """
    x = int(norm_x * width)
    y = int(norm_y * height)
    
    return x, y

def calculate_distance_3d(point1: Dict[str, float], point2: Dict[str, float]) -> float:
    """
    Calculate 3D Euclidean distance between two points.
    
    Args:
        point1, point2: Points with 'x', 'y', 'z' keys
        
    Returns:
        Distance between points
    """
    dx = point1['x'] - point2['x']
    dy = point1['y'] - point2['y']
    dz = point1.get('z', 0) - point2.get('z', 0)
    
    return np.sqrt(dx*dx + dy*dy + dz*dz)

def smooth_value(current: float, previous: float, alpha: float = 0.3) -> float:
    """
    Apply exponential smoothing to a value.
    
    Args:
        current: Current value
        previous: Previous smoothed value
        alpha: Smoothing factor (0 = no smoothing, 1 = no change)
        
    Returns:
        Smoothed value
    """
    return alpha * previous + (1 - alpha) * current

def clamp(value: float, min_val: float, max_val: float) -> float:
    """
    Clamp a value to a specified range.
    
    Args:
        value: Value to clamp
        min_val, max_val: Range limits
        
    Returns:
        Clamped value
    """
    return max(min_val, min(value, max_val))

def angle_difference(angle1: float, angle2: float) -> float:
    """
    Calculate the shortest angular difference between two angles.
    
    Args:
        angle1, angle2: Angles in radians
        
    Returns:
        Angular difference (-π to π)
    """
    diff = angle2 - angle1
    while diff > np.pi:
        diff -= 2 * np.pi
    while diff < -np.pi:
        diff += 2 * np.pi
    return diff

def create_rotation_matrix(yaw: float, pitch: float, roll: float) -> np.ndarray:
    """
    Create a 3D rotation matrix from Euler angles.
    
    Args:
        yaw, pitch, roll: Rotation angles in radians
        
    Returns:
        3x3 rotation matrix
    """
    # Rotation around Z axis (yaw)
    Rz = np.array([
        [np.cos(yaw), -np.sin(yaw), 0],
        [np.sin(yaw), np.cos(yaw), 0],
        [0, 0, 1]
    ])
    
    # Rotation around Y axis (pitch)
    Ry = np.array([
        [np.cos(pitch), 0, np.sin(pitch)],
        [0, 1, 0],
        [-np.sin(pitch), 0, np.cos(pitch)]
    ])
    
    # Rotation around X axis (roll)
    Rx = np.array([
        [1, 0, 0],
        [0, np.cos(roll), -np.sin(roll)],
        [0, np.sin(roll), np.cos(roll)]
    ])
    
    # Combined rotation (order: Z, Y, X)
    return Rz @ Ry @ Rx

def log_performance(func_name: str, execution_time: float, frame_rate: float = None):
    """
    Log performance metrics for debugging.
    
    Args:
        func_name: Name of the function
        execution_time: Execution time in seconds
        frame_rate: Optional frame rate in FPS
    """
    if frame_rate:
        print(f"{func_name}: {execution_time:.3f}s ({frame_rate:.1f} FPS)")
    else:
        print(f"{func_name}: {execution_time:.3f}s")