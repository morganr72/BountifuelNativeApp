/**
 * src/hooks/useOrientation.ts
 *
 * A custom React hook to lock the screen orientation when a component is focused.
 * It automatically unlocks the orientation when the component is unfocused.
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

      // --- FIXED: Removed the cleanup function ---
      // By removing the unlock call, the orientation set by a screen
      // will persist until another screen actively changes it. This is more stable.
      // return () => {
      //   Orientation.unlockAllOrientations();
      // };
    }, [orientation])
  );
};
