
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type Profile = 'admin' | 'observer';

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  clearProfile: () => void;
  validatePass: (profile: Profile, pass: string) => Promise<boolean>;
  isProfileLoading: boolean;
  isLoadingPasses: boolean;
  passes: { adminPass: string; observerPass: string };
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [passes, setPasses] = useState<{ adminPass: string; observerPass: string }>({ adminPass: '', observerPass: '' });
  const [isLoadingPasses, setIsLoadingPasses] = useState(true);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
  }, [firestore, user]);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait for the user object to be available.
    }
  
    // If there's no user, we clear profile data and stop loading.
    if (!user) {
      setProfileState(null);
      sessionStorage.removeItem('sgs-profile');
      setIsProfileLoading(false);
      setIsLoadingPasses(false);
      return;
    }
  
    // Reset loading state when user changes
    setIsProfileLoading(true);
    setIsLoadingPasses(true);

    const fetchInitialData = async () => {
      // 1. Fetch profile from session storage
      try {
        const savedProfile = sessionStorage.getItem('sgs-profile') as Profile | null;
        setProfileState(savedProfile);
      } catch (error) {
        console.error("Could not read profile from session storage:", error);
        setProfileState(null); // Ensure a clean state on error
      }

      // 2. Fetch passes from Firestore
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setPasses({ adminPass: '', observerPass: '' });
        setIsLoadingPasses(false);
        setIsProfileLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPasses({ adminPass: data.adminPass || '', observerPass: data.observerPass || '' });
        } else {
          // Explicitly handle the case for a new user where the doc doesn't exist yet.
          setPasses({ adminPass: '', observerPass: '' });
        }
      } catch (error: any) {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching profile passes:", error);
        }
        // Ensure a clean state on error
        setPasses({ adminPass: '', observerPass: '' });
      } finally {
        // Mark both as finished loading
        setIsLoadingPasses(false);
        setIsProfileLoading(false);
      }
    };

    fetchInitialData();
  }, [user, isUserLoading, getSettingsDocRef]);

  const setProfile = (profile: Profile | null) => {
    setProfileState(profile);
    if (profile) {
      sessionStorage.setItem('sgs-profile', profile);
    } else {
      sessionStorage.removeItem('sgs-profile');
    }
  };

  const clearProfile = () => {
    setProfile(null);
  };

  const validatePass = async (profileToValidate: Profile, pass: string): Promise<boolean> => {
    if (isLoadingPasses) return false;

    const correctPass = profileToValidate === 'admin' ? passes.adminPass : passes.observerPass;
    const isValid = correctPass === pass;
    
    if (isValid) {
      setProfile(profileToValidate);
    }
    
    return isValid;
  };

  // The overall loading state is true if any of the critical async operations are running.
  const isOverallLoading = isUserLoading || isProfileLoading || isLoadingPasses;

  const contextValue: ProfileContextType = {
    profile,
    setProfile,
    clearProfile,
    validatePass,
    isProfileLoading: isOverallLoading,
    isLoadingPasses,
    passes,
  };

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
