
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type Profile = 'admin' | 'supervisor';

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  setProfileAndRedirect: (profile: Profile, page: string) => void;
  getRedirectPage: () => string | null;
  clearProfile: () => void;
  validatePass: (profile: Profile, pass: string) => Promise<boolean>;
  isProfileLoading: boolean;
  isLoadingPasses: boolean;
  passes: { adminPass: string; supervisorPass: string };
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [passes, setPasses] = useState<{ adminPass: string; supervisorPass: string }>({ adminPass: '', supervisorPass: '' });
  const [isLoadingPasses, setIsLoadingPasses] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [redirectPage, setRedirectPage] = useState<string | null>(null);

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
        setPasses({ adminPass: '123456', supervisorPass: '123456' });
        setIsLoadingPasses(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPasses({ adminPass: data.adminPass || '123456', supervisorPass: data.supervisorPass || '123456' });
        } else {
          const defaultPasses = { adminPass: '123456', supervisorPass: '123456' };
          await setDoc(docRef, defaultPasses);
          setPasses(defaultPasses);
        }
      } catch (error: any) {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching profile passes:", error);
        }
        setPasses({ adminPass: '123456', supervisorPass: '123456' });
      } finally {
        setIsLoadingPasses(false);
      }
    };

    fetchInitialData();
  }, [user, isUserLoading, getSettingsDocRef]);

  const setProfile = (profileToSet: Profile | null) => {
    setRedirectPage(null); // Reset redirect on normal set
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

  const setProfileAndRedirect = (profileToSet: Profile, page: string) => {
    setRedirectPage(page);
    setProfileState(profileToSet);
    try {
      sessionStorage.setItem('sgs-profile', profileToSet);
    } catch (e) {}
  };
  
  const getRedirectPage = () => {
    const page = redirectPage;
    setRedirectPage(null); // Consume the redirect page
    return page;
  };

  const clearProfile = () => {
    setProfile(null);
  };

  const validatePass = async (profileToValidate: Profile, pass: string): Promise<boolean> => {
    if (isLoadingPasses) return false;

    const correctPass = profileToValidate === 'admin' ? passes.adminPass : passes.supervisorPass;
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
    setProfileAndRedirect,
    getRedirectPage,
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

    