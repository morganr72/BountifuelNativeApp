/**
 * src/hooks/useOrientation.ts
 *
 * A custom React hook to lock the screen orientation when a component is focused.
 *
 * --- FIX: Removed the cleanup function to prevent a race condition. ---
 * The cleanup (unlocking) is now handled manually by screens that need it
 * to avoid the new screen's lock being cancelled by the old screen's unlock.
 */
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';

type OrientationType = 'PORTRAIT' | 'LANDSCAPE' | 'UNKNOWN';

export const useOrientation = (orientation: OrientationType) => {
  useFocusEffect(
    useCallback(() => {
      // Lock orientation when the screen comes into focus
      if (orientation === 'LANDSCAPE') {
        Orientation.lockToLandscape();
      } else {
        Orientation.lockToPortrait();
      }
      // NOTE: The cleanup function is intentionally removed.
      // return () => { Orientation.unlockAllOrientations(); };
    }, [orientation])
  );
};
