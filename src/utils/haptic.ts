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
  }
};
