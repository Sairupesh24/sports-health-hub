
export type ProfileRole = 
  | 'admin' 
  | 'consultant' 
  | 'client' 
  | 'front_office' 
  | 'Physiotherapist' 
  | 'Sports Scientist' 
  | 'Nutritionist' 
  | 'Sports Physician' 
  | 'Massage therapist';

// Mapping between consultant roles and service categories
export const ROLE_SERVICE_CATEGORY_MAP: Record<string, string[]> = {
  'Physiotherapist': ['Physiotherapy', 'Assessment', 'Therapy', 'Rehab'],
  'Sports Scientist': ['S&C', 'Strength & Conditioning', 'Testing', 'Training', 'Performance'],
  'Nutritionist': ['Nutrition', 'Dietary'],
  'Sports Physician': ['Medical', 'Consultation', 'Doctor'],
  'Massage therapist': ['Massage', 'Recovery', 'Manual Therapy'],
  'admin': [], // Admins can see all (handled in filtering logic)
  'front_office': [], // FOE can see all
};

export interface Service {
  id: string;
  name: string;
  category: string | null;
  organization_id: string;
}

/**
 * Filters a list of services based on the consultant's profession and system role.
 */
export function filterServicesByRole(
  services: Service[], 
  profession: string | null | undefined,
  role: string | undefined
): Service[] {
  // Admins and FOE see everything
  if (role === 'admin' || role === 'front_office' || role === 'clinic_admin' || role === 'foe') {
    return services;
  }

  // Use profession for granular filtering, fall back to role if profession is missing
  const effectiveCategoryKey = profession || role;
  if (!effectiveCategoryKey) return services;

  const allowedCategories = ROLE_SERVICE_CATEGORY_MAP[effectiveCategoryKey] || [];
  
  // If no categories mapped for this profession/role, return all as fallback
  if (allowedCategories.length === 0) return services;

  return services.filter(service => {
    if (!service.category) return true; 
    return allowedCategories.some(cat => 
        service.category?.toLowerCase().includes(cat.toLowerCase()) || 
        service.name.toLowerCase().includes(cat.toLowerCase())
    );
  });
}

/**
 * Robustly matches a service name or role to a service in the list.
 * Mimics the backend logic in complete_session.
 */
export function resolveServiceId(
  services: Service[], 
  serviceType: string | null, 
  profession: string | null | undefined,
  role: string | undefined
): string | null {
  if (!services.length) return null;

  // 1. Exact match by name
  if (serviceType) {
    const match = services.find(s => s.name.toLowerCase().trim() === serviceType.toLowerCase().trim());
    if (match) return match.id;
  }

  // 2. Profession-based fallback
  const effectiveProfession = profession || (role === 'sports_scientist' ? 'Sports Scientist' : null);
  
  if (effectiveProfession === 'Sports Scientist') {
    const match = services.find(s => 
      ['strength & conditioning', 'strength and conditioning', 's&c', 'snc', 'performance']
      .includes(s.name.toLowerCase().trim())
    );
    if (match) return match.id;
  }
  
  if (effectiveProfession === 'Physiotherapist') {
      const match = services.find(s => 
        ['physiotherapy', 'physio', 'rehab', 'therapy']
        .includes(s.name.toLowerCase().trim())
      );
      if (match) return match.id;
  }

  if (effectiveProfession === 'Nutritionist') {
    const match = services.find(s => 
      ['nutrition', 'nutritionist', 'dietary']
      .includes(s.name.toLowerCase().trim())
    );
    if (match) return match.id;
  }

  return null;
}
