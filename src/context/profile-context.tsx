'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [passes, setPasses] = useState<{ adminPass: string; observerPass: string }>({ adminPass: '', observerPass: '' });
  const [isLoadingPasses, setIsLoadingPasses] = useState(true);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
  }, [firestore, user]);

  useEffect(() => {
    // We can't do anything until the user's auth state is resolved.
    if (isUserLoading) {
      setIsLoadingPasses(true);
      return;
    }
    
    // If there is no user, clear everything and stop.
    if (!user) {
      setProfileState(null);
      try {
        sessionStorage.removeItem('sgs-profile');
      } catch (e) {
        // ignore session storage errors
      }
      setIsLoadingPasses(false);
      return;
    }
  
    // If we have a user, proceed to load their passes and check sessionStorage.
    const fetchInitialData = async () => {
      // We start by assuming no profile is selected.
      setProfileState(null);
      
      const docRef = getSettingsDocRef();
      if (!docRef) {
        setPasses({ adminPass: '123456', observerPass: '123456' });
        setIsLoadingPasses(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPasses({ adminPass: data.adminPass || '123456', observerPass: data.observerPass || '123456' });
        } else {
          // If the document doesn't exist, create it with default passes
          const defaultPasses = { adminPass: '123456', observerPass: '123456' };
          await setDoc(docRef, defaultPasses);
          setPasses(defaultPasses);
        }
      } catch (error: any) {
        // In case of a permissions error or other issue, use default passes.
        // This is a failsafe to ensure the app is still usable.
        if (error.code !== 'permission-denied') {
          console.error("Error fetching profile passes:", error);
        }
        setPasses({ adminPass: '123456', observerPass: '123456' });
      } finally {
        setIsLoadingPasses(false);
      }
    };

    fetchInitialData();
  }, [user, isUserLoading, getSettingsDocRef]);

  const setProfile = (profile: Profile | null) => {
    setProfileState(profile);
    if (profile) {
      try {
        sessionStorage.setItem('sgs-profile', profile);
      } catch (e) {
        // ignore session storage errors
      }
    } else {
      try {
        sessionStorage.removeItem('sgs-profile');
      } catch (e) {
        // ignore session storage errors
      }
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

  // The profile is considered "loading" if the user is loading OR we are still fetching the passes.
  const contextValue: ProfileContextType = {
    profile,
    setProfile,
    clearProfile,
    validatePass,
    isProfileLoading: isUserLoading || isLoadingPasses,
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
