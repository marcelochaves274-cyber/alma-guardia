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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const getSettingsDocRef = useCallback(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
  }, [firestore, user]);
  
  // This effect runs once on mount to get the profile from sessionStorage
  useEffect(() => {
    try {
        const storedProfile = sessionStorage.getItem('sgs-profile') as Profile | null;
        if (storedProfile) {
            setProfileState(storedProfile);
        }
    } catch (e) {
        // sessionStorage is not available
    }
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (isUserLoading) {
      setIsLoadingPasses(true);
      return;
    }
    
    if (!user) {
      setProfileState(null);
      try {
        sessionStorage.removeItem('sgs-profile');
      } catch (e) {}
      setIsLoadingPasses(false);
      return;
    }
  
    const fetchInitialData = async () => {
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
          const defaultPasses = { adminPass: '123456', observerPass: '123456' };
          await setDoc(docRef, defaultPasses);
          setPasses(defaultPasses);
        }
      } catch (error: any) {
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

  const setProfile = (profileToSet: Profile | null) => {
    setProfileState(profileToSet);
    try {
        if (profileToSet) {
            sessionStorage.setItem('sgs-profile', profileToSet);
        } else {
            sessionStorage.removeItem('sgs-profile');
        }
    } catch(e) {
        // sessionStorage not available
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

  const isProfileLoading = isUserLoading || isLoadingPasses || isInitialLoad;

  const contextValue: ProfileContextType = {
    profile,
    setProfile,
    clearProfile,
    validatePass,
    isProfileLoading,
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
