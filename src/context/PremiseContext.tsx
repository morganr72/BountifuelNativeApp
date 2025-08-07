/**
 * src/context/PremiseContext.tsx
 *
 * --- FIX: Modified refetch logic to prevent full-screen reloads on user updates. ---
 */
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { fetchWithAuth } from '../api/fetchwithAuth';
import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';

export interface Premise {
  PremiseId: string;
  Controller: string;
  PremiseName: string;
  masterUserSub: string;
  associatedUserSub: string[];
}

interface PremiseContextType {
  premisesList: Premise[];
  currentPremise: Premise | null;
  setCurrentPremise: (premise: Premise | null) => void;
  isLoading: boolean;
  error: string | null;
  refetchPremises: () => Promise<void>; // Return a promise for chaining
}

const PremiseContext = createContext<PremiseContextType | undefined>(undefined);

export const PremiseProvider = ({ children }: { children: ReactNode }) => {
  const [premisesList, setPremisesList] = useState<Premise[]>([]);
  const [currentPremise, setCurrentPremise] = useState<Premise | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial app load
  const [error, setError] = useState<string | null>(null);

  // This function is for background refreshes that should NOT show a full-screen loader.
  const refetchPremisesInBackground = useCallback(async () => {
    setError(null);
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.getUserPremises);
        if (!response.ok) {
            throw new Error('Failed to refetch user premises.');
        }
        const data: Premise[] = await response.json();
        setPremisesList(data);

        // Also update the currentPremise object if it's in the new list
        if (currentPremise) {
            const updatedCurrent = data.find(p => p.PremiseId === currentPremise.PremiseId);
            if (updatedCurrent) {
                setCurrentPremise(updatedCurrent);
            }
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        // Re-throw the error so the calling component knows the refetch failed
        throw err;
    }
  }, [currentPremise]);

  // This function is for the very first data load when the app starts.
  const initialFetchPremises = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.getUserPremises);
        if (!response.ok) {
            throw new Error('Failed to fetch user premises.');
        }
        const data: Premise[] = await response.json();
        
        if (data && data.length > 0) {
            setPremisesList(data);
            // Set the first premise as the current one on initial load
            setCurrentPremise(data[0]);
        } else {
            setPremisesList([]);
            setCurrentPremise(null);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialFetchPremises();
  }, [initialFetchPremises]);

  // This full-screen loader will now ONLY show on the initial app startup.
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loadingText}>Loading Your Premises...</Text>
      </View>
    );
  }

  const value = {
    premisesList,
    currentPremise,
    setCurrentPremise,
    isLoading,
    error,
    refetchPremises: refetchPremisesInBackground, // Expose the background version
  };

  return (
    <PremiseContext.Provider value={value}>
      {children}
    </PremiseContext.Provider>
  );
};

export const usePremise = (): PremiseContextType => {
  const context = useContext(PremiseContext);
  if (context === undefined) {
    throw new Error('usePremise must be used within a PremiseProvider');
  }
  return context;
};

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 10,
        color: COLORS.text,
        fontSize: 16,
    },
});
