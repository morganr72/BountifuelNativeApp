/**
 * src/context/UserContext.tsx
 *
 * This new context checks if a user has completed the initial setup
 * by looking for a custom attribute in Cognito.
 * --- FIX: Corrected the Hub listener cleanup logic. ---
 */
import React from 'react';
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface UserContextType {
  isSetupComplete: boolean;
  isLoading: boolean;
  refetchUserStatus: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSetupStatus = async () => {
    setIsLoading(true);
    try {
      const attributes = await fetchUserAttributes();
      // Check for the custom attribute. If it's 'true', setup is complete.
      if (attributes['custom:setupComplete'] === 'true') {
        setIsSetupComplete(true);
      } else {
        setIsSetupComplete(false);
      }
    } catch (e) {
      // If attributes can't be fetched (e.g., user not logged in),
      // assume setup is not complete.
      setIsSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check status when the provider first mounts
    checkSetupStatus();

    // Listen for Amplify Hub events. When a user signs in,
    // re-check their setup status.
    const hubListener = (data: any) => {
      if (data.payload.event === 'signedIn') {
        checkSetupStatus();
      }
    };

    // Hub.listen returns a function that unsubscribes the listener.
    const unsubscribe = Hub.listen('auth', hubListener);

    // Clean up the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    isSetupComplete,
    isLoading,
    refetchUserStatus: checkSetupStatus,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
