import { useProfile } from '@/context/profile-context';
import { getMenuPermissionsForProfile, restrictOptions } from '@/utils/profile-filters';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

// Dentro do seu componente (ex: MapReport):
const { profile } = useProfile();
const { user } = useUser();
const firestore = useFirestore();

const [customProfiles, setCustomProfiles] = useState<CustomProfile[]>([]);
const [allowedLocations, setAllowedLocations] = useState<string[]>([]);

// 1. Carrega os perfis salvos do Firestore para ler os filtros do admin
useEffect(() => {
  if (user && firestore) {
    const docRef = doc(firestore, 'sgs_genius', user.uid, 'settings', 'profiles');
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomProfiles(data.customProfiles || []);
      }
    });
  }
}, [user, firestore]);

// 2. Extrai os filtros restritos para este menu específico (ex: 'map-report')
useEffect(() => {
  if (customProfiles.length > 0) {
    const { filters } = getMenuPermissionsForProfile(
      profile,
      customProfiles,
      'acidentes', // Menu principal
      'map-report' // Submenu atual
    );

    // Se houver locais restritos salvos (ex: ['Tirolesa - Mega Revoada']), guardamos
    if (filters.locations) {
      setAllowedLocations(filters.locations);
    }
  }
}, [profile, customProfiles]);

// 3. Na hora de popular o select/gaveta de locais na tela:
// Suponha que 'allSystemLocations' seja a lista completa vinda do banco:
const filteredLocationsForUser = restrictOptions(allSystemLocations, allowedLocations);