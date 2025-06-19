import { Platform } from 'react-native';

// Animation configuration optimized for web compatibility
export const getAnimationConfig = (duration = 1000) => ({
  duration,
  useNativeDriver: false, // Always false for web compatibility
});

// Simplified timing function for web
export const createTimingAnimation = (animatedValue, toValue, duration = 1000) => {
  return Animated.timing(animatedValue, {
    toValue,
    ...getAnimationConfig(duration),
  });
};

// Parallel animation helper
export const createParallelAnimation = (animations) => {
  return Animated.parallel(animations);
};

export default {
  getAnimationConfig,
  createTimingAnimation,
  createParallelAnimation,
};
