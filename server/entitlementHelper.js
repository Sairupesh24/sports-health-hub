import { db } from './db.js';

/**
 * Classifies a session into a canonical category based on:
 * 1. Device Assessment check (in either console, device assessments count as device assessments)
 * 2. Sports Science console check (counts as Sports Science unless session type is Physiotherapy)
 * 3. Clinical / Physiotherapist / Sports Physician console check (counts as Physiotherapy)
 * 4. Nutrition / Active Recovery / General fallbacks
 *
 * @param {Object} session
 * @param {Object} context
 * @returns {'device_assessment' | 'sports_science' | 'physiotherapy' | 'nutrition' | 'active_recovery' | 'other'}
 */
export function classifySessionCategory(session, context = {}) {
    const serviceType = (session.service_type || '').toLowerCase().trim();
    const serviceName = (session.service_name || '').toLowerCase().trim();
    const serviceCategory = (session.service_category || '').toLowerCase().trim();
    const sourceConsole = (session.source_console || context.sourceConsole || '').toLowerCase().trim();

    // Context / Profile information
    const user = context.user || {};
    const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
    const userProfession = (user.profession || '').toLowerCase().trim();
    const providerProfession = (context.providerProfession || '').toLowerCase().trim();

    // 1. Device Assessment Check:
    // "In either console, if the type of session is device assessment, then it should be counted as device assessments."
    if (
        serviceType.includes('device assessment') ||
        serviceName.includes('device assessment') ||
        serviceType.includes('device testing') ||
        serviceName.includes('device testing') ||
        serviceType.includes('assessment') ||
        serviceName.includes('assessment') ||
        serviceCategory === 'diagnostics'
    ) {
        return 'device_assessment';
    }

    // Determine console origin
    const isFromSportsScienceConsole = 
        sourceConsole === 'sports_science' ||
        sourceConsole === 'ams' ||
        (!session.therapist_id && !!session.scientist_id) ||
        userRoles.includes('sports_scientist') ||
        userProfession.includes('sports scientist') ||
        userProfession.includes('scientist');

    const isFromClinicalConsole = 
        sourceConsole === 'clinical' ||
        sourceConsole === 'consultant' ||
        (!session.scientist_id && !!session.therapist_id) ||
        userRoles.some(r => ['sports_physician', 'physiotherapist', 'consultant'].includes(r)) ||
        userProfession.includes('physio') ||
        userProfession.includes('physician') ||
        providerProfession.includes('physio') ||
        providerProfession.includes('physician');

    // 2. Sports Science Console Rule:
    // "If any session is entered from Sports Science console, it should be counted towards Sports science session unless the session type is 'Physiotherapy'."
    if (isFromSportsScienceConsole) {
        if (serviceType.includes('physio') || serviceName.includes('physio')) {
            return 'physiotherapy';
        }
        return 'sports_science';
    }

    // 3. Clinical / Physiotherapist / Sports Physician Console Rule:
    // "Any session recorded from the physiotherapist or Sports physician console should be counted towards physiotherapy."
    if (isFromClinicalConsole) {
        return 'physiotherapy';
    }

    // 4. Fallbacks for Admin, FOE, or general scheduling:
    if (serviceType.includes('nutrition') || serviceType.includes('diet') || serviceName.includes('nutrition')) {
        return 'nutrition';
    }
    if (serviceType.includes('active recovery') || serviceName.includes('active recovery')) {
        return 'active_recovery';
    }
    if (serviceType.includes('physio') || serviceType.includes('consultation') || serviceType.includes('doctor')) {
        return 'physiotherapy';
    }
    if (
        serviceType.includes('strength') ||
        serviceType.includes('conditioning') ||
        serviceType.includes('training') ||
        serviceType.includes('sports science')
    ) {
        return 'sports_science';
    }

    return 'other';
}

/**
 * Returns true if a session category is exempt from fixed entitlement counting.
 * Per requirement: "The entitlements should be counted for only Physiotherapy, Device Assessments,
 * Nutrition, Active recovery training and any other but not towards Sports Science sessions.
 * Their sessions cannot have a fixed count. So sessions deduction for sports science entitlements is not necessary."
 *
 * @param {string} category
 * @returns {boolean}
 */
export function isEntitlementExempt(category) {
    return category === 'sports_science';
}

/**
 * Finds an active matching entitlement for a session from the client's purchased packages.
 *
 * @param {Object} queryClient - pg client or db pool
 * @param {Object} session
 * @param {Object} context
 * @returns {Promise<Object|null>}
 */
export async function findMatchingEntitlement(queryClient, session, context = {}) {
    const category = classifySessionCategory(session, context);

    // Sports Science sessions do NOT deduct entitlements
    if (isEntitlementExempt(category)) {
        return null;
    }

    const client_id = session.client_id;
    const organization_id = session.organization_id;
    if (!client_id) return null;

    // Fetch all active entitlements for this client
    let query = `
        SELECT * FROM cliententitlements 
        WHERE client_id = $1 
          AND ($2::uuid IS NULL OR organization_id = $2)
          AND status = 'active' 
          AND (granted_sessions - sessions_used) > 0
        ORDER BY created_at ASC
    `;
    const params = [client_id, organization_id || null];
    const res = await queryClient.query(query, params);
    const entitlements = res.rows || [];

    if (entitlements.length === 0) return null;

    const sessionServiceType = (session.service_type || '').toLowerCase().trim();
    const sessionServiceId = session.service_id;

    // 1. Exact match (by service_id or exact service_type)
    if (sessionServiceId) {
        const exactIdMatch = entitlements.find(e => e.service_id === sessionServiceId);
        if (exactIdMatch) return exactIdMatch;
    }
    if (sessionServiceType) {
        const exactTypeMatch = entitlements.find(e => (e.service_type || '').toLowerCase().trim() === sessionServiceType);
        if (exactTypeMatch) return exactTypeMatch;
    }

    // 2. Category-based matching
    if (category === 'device_assessment') {
        const assessMatch = entitlements.find(e => {
            const st = (e.service_type || '').toLowerCase();
            return st.includes('assessment') || st.includes('device');
        });
        if (assessMatch) return assessMatch;
    } else if (category === 'physiotherapy') {
        const physioMatch = entitlements.find(e => {
            const st = (e.service_type || '').toLowerCase();
            return st.includes('physio') || st.includes('consultation') || st.includes('doctor');
        });
        if (physioMatch) return physioMatch;
    } else if (category === 'nutrition') {
        const nutrMatch = entitlements.find(e => {
            const st = (e.service_type || '').toLowerCase();
            return st.includes('nutrition') || st.includes('diet');
        });
        if (nutrMatch) return nutrMatch;
    } else if (category === 'active_recovery') {
        const recoveryMatch = entitlements.find(e => {
            const st = (e.service_type || '').toLowerCase();
            return st.includes('active recovery') || st.includes('recovery');
        });
        if (recoveryMatch) return recoveryMatch;
    }

    return null;
}

/**
 * Deducts entitlement for a completed session if applicable.
 * If category is Sports Science, marks is_unentitled = false without deduction.
 * If category requires entitlement, matches active entitlement and increments sessions_used.
 *
 * @param {Object} queryClient - pg client or db pool
 * @param {Object} session
 * @param {Object} context
 * @returns {Promise<{ entitlementId: string|null, isUnentitled: boolean, category: string, isExempt: boolean }>}
 */
export async function deductEntitlementForSession(queryClient, session, context = {}) {
    const category = classifySessionCategory(session, context);

    if (isEntitlementExempt(category)) {
        return {
            entitlementId: null,
            isUnentitled: false,
            category,
            isExempt: true
        };
    }

    // If session already has an entitlement_id linked and not un-entitled
    if (session.entitlement_id && !session.is_unentitled) {
        await queryClient.query(
            'UPDATE cliententitlements SET sessions_used = sessions_used + 1, updated_at = NOW() WHERE id = $1',
            [session.entitlement_id]
        );
        return {
            entitlementId: session.entitlement_id,
            isUnentitled: false,
            category,
            isExempt: false
        };
    }

    // Find matching active entitlement
    const matchedEnt = await findMatchingEntitlement(queryClient, session, context);

    if (matchedEnt) {
        await queryClient.query(
            'UPDATE cliententitlements SET sessions_used = sessions_used + 1, updated_at = NOW() WHERE id = $1',
            [matchedEnt.id]
        );
        return {
            entitlementId: matchedEnt.id,
            isUnentitled: false,
            category,
            isExempt: false
        };
    } else {
        return {
            entitlementId: null,
            isUnentitled: true,
            category,
            isExempt: false
        };
    }
}
