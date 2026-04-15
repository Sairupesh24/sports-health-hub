
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

// Mapping between professional specialist roles and service categories
export const ROLE_SERVICE_CATEGORY_MAP: Record<string, string[]> = {
  'Physiotherapist': ['Physiotherapy', 'Assessment', 'Therapy', 'Rehab'],
  'Sports Scientist': ['S&C', 'Strength & Conditioning', 'Testing', 'Training', 'Performance'],
  'Nutritionist': ['Nutrition', 'Dietary', 'Consultation', 'Nutritionist Consultation'],
  'Sports Physician': ['Medical', 'Consultation', 'Doctor', 'Physician Consultation', 'Sports Medicine', 'Clinic'],
  'Massage therapist': ['Massage', 'Recovery', 'Manual Therapy', 'Massage Consultation'],
};

export interface Service {
  id: string;
  name: string;
  category: string | null;
  organization_id: string;
}

/**
 * Filters a list of services based on the specialist's profession and system role.
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

  // Sports Physician should see ALL services per user request
  const prof = profession?.toLowerCase().trim();
  const r = role?.toLowerCase().trim();
  if (prof === 'sports physician' || r === 'sports physician' || prof === 'sports_physician' || r === 'sports_physician') {
    return services;
  }

  // Use profession for granular filtering, fall back to role if profession is missing
  const effectiveCategoryKey = profession || role;
  if (!effectiveCategoryKey) return services;

  // Normalize effectiveCategoryKey for better matching (lowercase, replace underscores with spaces)
  const normalizedKey = effectiveCategoryKey.toLowerCase().replace(/_/g, ' ').trim();
  
  // Find matching categories with robust key lookup
  const matchingKey = Object.keys(ROLE_SERVICE_CATEGORY_MAP).find(k => 
    k.toLowerCase().trim() === normalizedKey
  );
  const allowedCategories = matchingKey ? ROLE_SERVICE_CATEGORY_MAP[matchingKey] : [];
  
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
 * Pairs a specialist with a service by checking if their profession matches 
 * any categories allowed for that service.
 */
export function filterConsultantsByService(
    consultants: any[],
    service: Service | null | undefined
): any[] {
    if (!service) return consultants;

    const sName = (service.name || "").toLowerCase().trim();
    const sCat = (service.category || "").toLowerCase().trim();

    return consultants.filter(c => {
        const rawProf = c.profession || c.role || "";
        const role = (c.role || "").toLowerCase();

        // STRICT EXCLUSION: Admins and FOE are not specialists
        const adminRoles = ['admin', 'clinic_admin', 'foe', 'front_office'];
        if (adminRoles.includes(role)) {
            // Only allow if they have an EXPLICIT clinical profession assigned
            if (!c.profession || c.profession === 'none' || adminRoles.includes(c.profession.toLowerCase())) {
                return false;
            }
        }
        
        // Find matching category list with robust key matching
        let allowedCats: string[] = [];
        const exactMatch = ROLE_SERVICE_CATEGORY_MAP[rawProf];
        
        if (exactMatch) {
            allowedCats = exactMatch;
        } else {
            // Case-insensitive and snake_case vs Space normalization
            const normalizedRaw = rawProf.toLowerCase().replace(/_/g, ' ').trim();
            const matchingKey = Object.keys(ROLE_SERVICE_CATEGORY_MAP).find(k => 
                k.toLowerCase().trim() === normalizedRaw
            );
            if (matchingKey) allowedCats = ROLE_SERVICE_CATEGORY_MAP[matchingKey];
        }

        // If no clinical mapping exists for this role/profession, exclude them from "Qualified Specialists"
        if (!allowedCats || allowedCats.length === 0) return false;

        return allowedCats.some(cat => {
            const lowCat = cat.toLowerCase().trim();
            if (!lowCat) return false;
            // bidirectional inclusive matching
            return sName.includes(lowCat) || sCat.includes(lowCat) || lowCat.includes(sName) || (sCat && lowCat.includes(sCat));
        });
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

  if (effectiveProfession === 'Sports Physician') {
    const match = services.find(s => 
      ['medical', 'consultation', 'doctor', 'physician', 'sports medicine', 'clinic']
      .some(keyword => s.name.toLowerCase().includes(keyword))
    );
    if (match) return match.id;
  }

  return null;
}
