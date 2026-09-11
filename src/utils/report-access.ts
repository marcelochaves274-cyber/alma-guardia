import { collection, doc, Firestore, getDoc, query, Query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export type ReportAccess = {
  loading: boolean;
  allowedLocations: string[];
  allowedTypes: string[];
  allowedActivityNames: string[];
  filters?: Record<string, string[]>;
};

type ResolvedReportAccess = Pick<ReportAccess, 'allowedLocations' | 'allowedTypes' | 'filters'>;

export function useReportAccess(
  firestore: Firestore | null,
  userId: string | undefined,
  profile: string | null,
  menuId: string,
  subMenuId: string,
) {
  const [access, setAccess] = useState<ResolvedReportAccess | null>(null);
  const isAdmin = !profile || profile === 'admin';

  useEffect(() => {
    let active = true;
    setAccess(isAdmin ? { allowedLocations: [], allowedTypes: [], allowedActivityNames: [], filters: {} } : null);
    if (!isAdmin && firestore && userId) {
      getReportAccess(firestore, userId, profile, menuId, subMenuId).then(value => {
        if (active) setAccess(value);
      }).catch(() => {
        if (active) setAccess({ allowedLocations: [], allowedTypes: [], allowedActivityNames: [], filters: {} });
      });
    }
    return () => { active = false; };
  }, [firestore, userId, profile, menuId, subMenuId, isAdmin]);

  return { access, ready: access !== null };
}

export async function getReportAccess(
  firestore: Firestore,
  userId: string,
  profile: string | null,
  menuId: string,
  subMenuId: string,
): Promise<ResolvedReportAccess> {
  if (!profile || profile === 'admin') {
    return { allowedLocations: [], allowedTypes: [], allowedActivityNames: [], filters: {} };
  }

  const snapshot = await getDoc(doc(firestore, 'sgs_genius', userId, 'settings', 'profiles'));
  const profiles = snapshot.exists() ? snapshot.data().customProfiles || [] : [];
  const customProfile = profiles.find((item: any) => item.name === profile);
  const menuPermissions = customProfile?.permissions?.[menuId];
  const filters = (subMenuId ? menuPermissions?.subMenus?.[subMenuId] : menuPermissions)?.filters;

  return {
    allowedLocations: Array.isArray(filters?.locations) ? filters.locations : [],
    allowedTypes: Array.isArray(filters?.types) ? filters.types : [],
    allowedActivityNames: Array.isArray(filters?.activityNames) ? filters.activityNames : [],
    filters: filters || {},
  };
}

export function hasReportAccessFilter(profile: string | null, values: string[]): boolean {
  return !profile || profile === 'admin' || values.length > 0;
}

// Firestore só aceita até 10 valores em uma cláusula "in". Quando o perfil tem mais
// locais/tipos permitidos que isso, não dá para filtrar no servidor - filtramos no
// cliente (filterByReportAccess) depois de buscar os documentos.
const FIRESTORE_IN_LIMIT = 10;

export function applyReportAccessQuery(
  collectionRef: ReturnType<typeof collection>,
  profile: string | null,
  access: { allowedLocations: string[]; allowedTypes: string[] },
  locationField: string,
  typeField?: string,
): Query {
  if (!profile || profile === 'admin') return collectionRef;
  const constraints = [];
  if (access.allowedLocations.length > 0 && access.allowedLocations.length <= FIRESTORE_IN_LIMIT) {
    constraints.push(where(locationField, 'in', access.allowedLocations));
  }
  if (typeField && access.allowedTypes.length > 0 && access.allowedTypes.length <= FIRESTORE_IN_LIMIT) {
    constraints.push(where(typeField, 'in', access.allowedTypes));
  }
  if (!constraints.length) return collectionRef;
  return query(
    collectionRef,
    ...constraints,
  );
}

// Garante o filtro de acesso mesmo quando a lista de locais/tipos permitidos passou
// de 10 itens (nesse caso applyReportAccessQuery não filtrou no servidor).
export function filterByReportAccess<T extends Record<string, any>>(
  items: T[],
  profile: string | null,
  access: { allowedLocations: string[]; allowedTypes: string[] },
  locationField: keyof T,
  typeField?: keyof T,
): T[] {
  if (!profile || profile === 'admin') return items;
  return items.filter((item) => {
    const locationOk =
      access.allowedLocations.length <= FIRESTORE_IN_LIMIT || access.allowedLocations.includes(item[locationField]);
    const typeOk =
      !typeField ||
      access.allowedTypes.length <= FIRESTORE_IN_LIMIT ||
      access.allowedTypes.includes(item[typeField]);
    return locationOk && typeOk;
  });
}
