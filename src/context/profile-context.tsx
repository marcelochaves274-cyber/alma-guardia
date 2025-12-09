
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
      return; 
    }
  
    if (!user) {
      setProfileState(null);
      sessionStorage.removeItem('sgs-profile');
      setIsProfileLoading(false);
      setIsLoadingPasses(false);
      return;
    }
  
    setIsProfileLoading(true);
    setIsLoadingPasses(true);

    const fetchInitialData = async () => {
      try {
        const savedProfile = sessionStorage.getItem('sgs-profile') as Profile | null;
        setProfileState(savedProfile);
      } catch (error) {
        console.error("Could not read profile from session storage:", error);
        setProfileState(null);
      }

      const docRef = getSettingsDocRef();
      if (!docRef) {
        setPasses({ adminPass: '123456', observerPass: '123456' });
        setIsLoadingPasses(false);
        setIsProfileLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPasses({ adminPass: data.adminPass || '123456', observerPass: data.observerPass || '123456' });
        } else {
          // If doc doesn't exist, create it with default passes
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
