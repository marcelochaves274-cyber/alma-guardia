
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
    // Only fetch if we have a user.
    if (!user) {
      if (!isUserLoading) {
        // If user loading is finished and there's no user, we're done.
        setIsLoadingPasses(false);
      }
      return;
    }
  
    // Reset loading state when user changes
    setIsLoadingPasses(true);

    const fetchPasses = async () => {
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setIsLoadingPasses(false);
        return;
      }
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPasses({ adminPass: data.adminPass || '', observerPass: data.observerPass || '' });
        } else {
          // If doc doesn't exist, it means no passes are set. This is a valid state for a new user.
          setPasses({ adminPass: '', observerPass: '' });
        }
      } catch (error) {
        console.error("Error fetching profile passes:", error);
        // On error, also default to no passes to avoid breaking the app.
        setPasses({ adminPass: '', observerPass: '' });
      } finally {
        setIsLoadingPasses(false);
      }
    };

    fetchPasses();
  }, [user, isUserLoading, getSettingsDocRef]);


  useEffect(() => {
    try {
      const savedProfile = sessionStorage.getItem('sgs-profile') as Profile | null;
      if (savedProfile) {
        setProfileState(savedProfile);
      }
    } catch (error) {
      console.error("Could not read profile from session storage:", error);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

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
    // If passes are still loading, validation fails.
    if (isLoadingPasses) return false;

    const correctPass = profileToValidate === 'admin' ? passes.adminPass : passes.observerPass;
    const isValid = correctPass === pass;
    
    if (isValid) {
      setProfile(profileToValidate);
    }
    
    return isValid;
  };

  const contextValue: ProfileContextType = {
    profile,
    setProfile,
    clearProfile,
    validatePass,
    isProfileLoading: isUserLoading || isProfileLoading || (!!user && isLoadingPasses),
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
