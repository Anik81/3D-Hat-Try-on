"""MediaPipe Face Detection and Landmark Extraction."""

import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Dict, List
from config import Config

class FaceDetector:
    """Face detection using MediaPipe Face Mesh."""
    
    def __init__(self):
        """Initialize MediaPipe Face Mesh."""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Initialize face mesh with configuration
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=Config.MAX_NUM_FACES,
            refine_landmarks=True,
            min_detection_confidence=Config.DETECTION_CONFIDENCE,
            min_tracking_confidence=Config.TRACKING_CONFIDENCE
        )
        
        # Define key landmark indices for hat positioning
        self.key_landmarks = {
            'forehead_center': 9,     # Center of forehead
            'forehead_left': 151,     # Left side of forehead
            'forehead_right': 377,    # Right side of forehead
            'nose_tip': 1,            # Nose tip
            'chin': 175,              # Bottom of chin
            'left_temple': 234,       # Left temple
            'right_temple': 454,      # Right temple
            'top_head': 10,           # Top of head estimation
        }
    
    def detect_face_landmarks(self, frame: np.ndarray) -> Optional[Dict]:
        """
        Detect face landmarks in the given frame.
        
        Args:
            frame: Input image as numpy array (BGR format)
            
        Returns:
            Dictionary containing landmark coordinates or None if no face detected
        """
        try:
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            height, width = frame.shape[:2]
            
            # Process the frame
            results = self.face_mesh.process(rgb_frame)
            
            if not results.multi_face_landmarks:
                return None
            
            # Get the first face (we're configured for max 1 face)
            face_landmarks = results.multi_face_landmarks[0]
            
            # Extract key landmarks
            landmarks = {}
            for name, idx in self.key_landmarks.items():
                landmark = face_landmarks.landmark[idx]
                # Convert normalized coordinates to pixel coordinates
                landmarks[name] = {
                    'x': landmark.x * width,
                    'y': landmark.y * height,
                    'z': landmark.z * width  # Depth relative to face width
                }
            
            # Calculate additional derived points
            landmarks['head_width'] = abs(
                landmarks['left_temple']['x'] - landmarks['right_temple']['x']
            )
            
            landmarks['head_height'] = abs(
                landmarks['forehead_center']['y'] - landmarks['chin']['y']
            )
            
            # Estimate head rotation (basic)
            landmarks['head_rotation'] = self._estimate_head_rotation(landmarks)
            
            return {
                'landmarks': landmarks,
                'frame_size': {'width': width, 'height': height},
                'confidence': 1.0  # MediaPipe doesn't provide per-face confidence
            }
            
        except Exception as e:
            print(f"Error in face detection: {e}")
            return None
    
    def _estimate_head_rotation(self, landmarks: Dict) -> Dict[str, float]:
        """
        Estimate head rotation angles from landmarks.
        
        Args:
            landmarks: Dictionary of facial landmarks
            
        Returns:
            Dictionary with rotation angles in radians
        """
        try:
            # Calculate yaw (left-right rotation) using temple positions
            left_temple = landmarks['left_temple']
            right_temple = landmarks['right_temple']
            
            # Simple yaw estimation based on temple asymmetry
            temple_diff = abs(left_temple['x'] - right_temple['x'])
            expected_width = landmarks['head_width']
            yaw = np.arctan2(temple_diff - expected_width, expected_width) if expected_width > 0 else 0
            
            # Calculate pitch (up-down rotation) using forehead to nose ratio
            forehead_y = landmarks['forehead_center']['y']
            nose_y = landmarks['nose_tip']['y']
            chin_y = landmarks['chin']['y']
            
            face_height = abs(forehead_y - chin_y)
            nose_offset = (nose_y - forehead_y) / face_height if face_height > 0 else 0
            pitch = np.arctan2(nose_offset - 0.3, 0.7)  # 0.3 is expected nose position ratio
            
            # Roll (tilt) using temple height difference
            temple_height_diff = left_temple['y'] - right_temple['y']
            roll = np.arctan2(temple_height_diff, landmarks['head_width']) if landmarks['head_width'] > 0 else 0
            
            return {
                'yaw': float(yaw),
                'pitch': float(pitch),
                'roll': float(roll)
            }
            
        except Exception as e:
            print(f"Error estimating head rotation: {e}")
            return {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0}
    
    def draw_landmarks(self, frame: np.ndarray, landmarks: Dict) -> np.ndarray:
        """
        Draw key landmarks on the frame for debugging.
        
        Args:
            frame: Input image
            landmarks: Facial landmarks dictionary
            
        Returns:
            Frame with landmarks drawn
        """
        try:
            frame_copy = frame.copy()
            
            # Draw key points
            for name, point in landmarks['landmarks'].items():
                if isinstance(point, dict) and 'x' in point and 'y' in point:
                    cv2.circle(
                        frame_copy,
                        (int(point['x']), int(point['y'])),
                        3,
                        (0, 255, 0),
                        -1
                    )
                    # Add label
                    cv2.putText(
                        frame_copy,
                        name,
                        (int(point['x']) + 5, int(point['y']) - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.3,
                        (0, 255, 0),
                        1
                    )
            
            return frame_copy
            
        except Exception as e:
            print(f"Error drawing landmarks: {e}")
            return frame