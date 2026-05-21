/**
 * Utility for triggering haptic feedback (vibrations) on mobile devices.
 */
export const haptic = {
  /**
   * Triggers a short vibration for success.
   */
  success: () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([10, 30, 10]);
    }
  },

  /**
   * Triggers a short vibration for light feedback (e.g. selection).
   */
  light: () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  },

  /**
   * Triggers a medium vibration for warnings or errors.
   */
  warning: () => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Triggers a dynamic vibration style.
   */
  impact: (style?: 'light' | 'medium' | 'heavy') => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      if (style === 'heavy') {
        window.navigator.vibrate(30);
      } else if (style === 'medium') {
        window.navigator.vibrate(20);
      } else {
        window.navigator.vibrate(10);
      }
    }
  },

  /**
   * Aliases and helper functions to prevent any undefined method errors.
   */
  selection: () => haptic.light(),
  medium: () => haptic.impact('medium'),
  heavy: () => haptic.impact('heavy')
};
