// Web Vibration API helper for tactile feedback
const HAPTIC_STORAGE_KEY = 'grimorio_haptic_feedback_enabled';

export function isHapticsEnabled() {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(HAPTIC_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function setHapticsEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HAPTIC_STORAGE_KEY, enabled ? 'true' : 'false');
}

function vibrate(pattern) {
  if (typeof window === 'undefined' || !navigator.vibrate) return;
  if (isHapticsEnabled()) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptic vibration failed:", e);
    }
  }
}

// Single short click vibration (e.g. navigation, selection)
export function vibrateTouch() {
  vibrate(10);
}

// Success double pulse vibration
export function vibrateSuccess() {
  vibrate([20, 40, 20]);
}

// Warning/Error distinct vibration
export function vibrateWarning() {
  vibrate([40, 60, 40]);
}
