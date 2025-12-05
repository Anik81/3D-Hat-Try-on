"""Hat positioning calculation based on facial landmarks."""

import numpy as np
from typing import Dict, Tuple, List
from config import Config

class PoseCalculator:
    """Calculate 3D hat positioning based on facial landmarks."""
    
    def __init__(self):
        """Initialize pose calculator with smoothing filter."""
        self.previous_pose = None
        self.smoothing_factor = Config.SMOOTHING_FACTOR
    
    def calculate_hat_pose(self, landmarks_data: Dict, frame_shape: Tuple[int, int]) -> Dict:
        """
        Calculate hat position, rotation, and scale based on facial landmarks.
        
        Args:
            landmarks_data: Dictionary containing facial landmarks
            frame_shape: (height, width) of the input frame
            
        Returns:
            Dictionary with hat pose information
        """
        try:
            landmarks = landmarks_data['landmarks']
            frame_height, frame_width = frame_shape[:2]
            
            # Calculate hat position (center above forehead)
            position = self._calculate_hat_position(landmarks, frame_width, frame_height)
            
            # Calculate hat rotation based on head orientation
            rotation = self._calculate_hat_rotation(landmarks)
            
            # Calculate hat scale based on head size
            scale = self._calculate_hat_scale(landmarks)
            
            # Create pose dictionary
            pose = {
                'position': position,
                'rotation': rotation,
                'scale': scale
            }
            
            # Apply smoothing if we have previous pose data
            if self.previous_pose is not None:
                pose = self._apply_smoothing(pose, self.previous_pose)
            
            self.previous_pose = pose.copy()
            
            return pose
            
        except Exception as e:
            print(f"Error calculating hat pose: {e}")
            return self._get_default_pose()
    
    def _calculate_hat_position(self, landmarks: Dict, frame_width: int, frame_height: int) -> Dict[str, float]:
        """Calculate hat position in normalized coordinates (0-1 range)."""
        try:
            # Get forehead center as the base position
            forehead = landmarks['forehead_center']
            head_height = landmarks['head_height']
            
            # Calculate position on top of head (not above forehead)
            # Use a percentage of head height to position hat correctly on the crown
            hat_x = forehead['x'] / frame_width
            
            # Position hat on top of head: move up by a fraction of head height from forehead
            crown_offset = head_height * 0.4  # 40% of head height up from forehead to crown
            hat_y = (forehead['y'] - crown_offset) / frame_height
            hat_z = Config.HAT_OFFSET_Z  # Fixed depth offset
            
            # Clamp values to reasonable ranges
            hat_x = np.clip(hat_x, 0.0, 1.0)
            hat_y = np.clip(hat_y, 0.0, 1.0)
            
            return {
                'x': float(hat_x),
                'y': float(hat_y), 
                'z': float(hat_z)
            }
            
        except Exception as e:
            print(f"Error calculating hat position: {e}")
            return {'x': 0.5, 'y': 0.3, 'z': 0.0}
    
    def _calculate_hat_rotation(self, landmarks: Dict) -> Dict[str, float]:
        """Calculate hat rotation to match head orientation."""
        try:
            head_rotation = landmarks['head_rotation']
            
            # Hat should follow head rotation
            # Apply some damping to make it look more natural
            rotation = {
                'x': float(head_rotation['pitch'] * 0.8),  # Slightly less pitch
                'y': float(head_rotation['yaw'] * 0.9),    # Follow yaw closely
                'z': float(head_rotation['roll'] * 0.7)    # Less roll for stability
            }
            
            return rotation
            
        except Exception as e:
            print(f"Error calculating hat rotation: {e}")
            return {'x': 0.0, 'y': 0.0, 'z': 0.0}
    
    def _calculate_hat_scale(self, landmarks: Dict) -> float:
        """Calculate hat scale based on head size."""
        try:
            # Base scale on head width
            head_width = landmarks['head_width']
            
            # Balanced reference width for modern webcam resolutions
            reference_width = 120.0  # Balanced value between 100 and 150
            scale = (head_width / reference_width) * Config.HAT_SCALE_FACTOR
            
            # Expanded scale range for better flexibility
            scale = np.clip(scale, 0.5, 4.0)  # Increased max from 2.0 to 4.0
            
            return float(scale)
            
        except Exception as e:
            print(f"Error calculating hat scale: {e}")
            return 1.5  # Increased default from 1.0
    
    def _apply_smoothing(self, current_pose: Dict, previous_pose: Dict) -> Dict:
        """Apply temporal smoothing to reduce jitter."""
        try:
            smoothed_pose = {}
            
            # Smooth position
            smoothed_pose['position'] = {}
            for axis in ['x', 'y', 'z']:
                current_val = current_pose['position'][axis]
                previous_val = previous_pose['position'][axis]
                smoothed_val = (self.smoothing_factor * previous_val + 
                              (1 - self.smoothing_factor) * current_val)
                smoothed_pose['position'][axis] = smoothed_val
            
            # Smooth rotation
            smoothed_pose['rotation'] = {}
            for axis in ['x', 'y', 'z']:
                current_val = current_pose['rotation'][axis]
                previous_val = previous_pose['rotation'][axis]
                smoothed_val = (self.smoothing_factor * previous_val + 
                              (1 - self.smoothing_factor) * current_val)
                smoothed_pose['rotation'][axis] = smoothed_val
            
            # Smooth scale
            current_scale = current_pose['scale']
            previous_scale = previous_pose['scale']
            smoothed_pose['scale'] = (self.smoothing_factor * previous_scale + 
                                    (1 - self.smoothing_factor) * current_scale)
            
            return smoothed_pose
            
        except Exception as e:
            print(f"Error applying smoothing: {e}")
            return current_pose
    
    def _get_default_pose(self) -> Dict:
        """Return default hat pose when calculation fails."""
        return {
            'position': {'x': 0.5, 'y': 0.3, 'z': 0.0},
            'rotation': {'x': 0.0, 'y': 0.0, 'z': 0.0},
            'scale': 1.0
        }
    
    def reset_smoothing(self):
        """Reset smoothing filter (useful when face tracking is lost and regained)."""
        self.previous_pose = None
    
    def get_bounding_box(self, landmarks: Dict) -> Dict[str, float]:
        """
        Calculate face bounding box for additional calculations.
        
        Args:
            landmarks: Facial landmarks dictionary
            
        Returns:
            Bounding box coordinates
        """
        try:
            # Get extreme points
            left = landmarks['left_temple']['x']
            right = landmarks['right_temple']['x']
            top = landmarks['forehead_center']['y']
            bottom = landmarks['chin']['y']
            
            return {
                'left': float(left),
                'right': float(right),
                'top': float(top),
                'bottom': float(bottom),
                'width': float(right - left),
                'height': float(bottom - top)
            }
            
        except Exception as e:
            print(f"Error calculating bounding box: {e}")
            return {'left': 0, 'right': 100, 'top': 0, 'bottom': 100, 'width': 100, 'height': 100}