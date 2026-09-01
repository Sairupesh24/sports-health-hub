import { describe, it, expect } from 'vitest';
import { filterConsultantsByService, Service } from '@/utils/serviceMapping';

describe('Staff Override Matrix & Service Mapping', () => {
    const consultants = [
        {
            id: 'ganesh-id',
            first_name: 'Ganesh',
            last_name: 'B',
            profession: 'Nutritionist',
            role: 'nutritionist'
        },
        {
            id: 'raja-id',
            first_name: 'Raja Prasad',
            last_name: 'M',
            profession: 'Sports Scientist',
            role: 'sports_scientist'
        },
        {
            id: 'sai-id',
            first_name: 'Sai Pavan',
            last_name: 'K',
            profession: 'Physiotherapist',
            role: 'physiotherapist'
        }
    ];

    const physioService: Service = {
        id: 'physio-service-id',
        name: 'Physiotherapy',
        category: 'General',
        organization_id: 'org-1',
        is_universal: true // Notice: marked universal
    };

    const consultationService: Service = {
        id: 'consultation-service-id',
        name: 'Consultation',
        category: 'General',
        organization_id: 'org-1',
        is_universal: true
    };

    it('excludes a Nutritionist from Physiotherapy when staff overrides do not include Physiotherapy', () => {
        // Ganesh B has overrides: ONLY tagged for Consultation
        // Raja Prasad M has overrides: tagged for Physiotherapy and Consultation
        const dynamicMappings = [
            { consultant_id: 'ganesh-id', service_id: 'consultation-service-id' },
            { consultant_id: 'raja-id', service_id: 'physio-service-id' },
            { consultant_id: 'raja-id', service_id: 'consultation-service-id' }
        ];

        // Filter for Physiotherapy
        const qualifiedForPhysio = filterConsultantsByService(consultants, physioService, dynamicMappings);

        // Ganesh B must NOT appear
        expect(qualifiedForPhysio.map(c => c.id)).not.toContain('ganesh-id');
        // Raja Prasad M must appear because he is tagged with Physiotherapy
        expect(qualifiedForPhysio.map(c => c.id)).toContain('raja-id');
        // Sai Pavan K has no overrides configured, so he falls back to universal / role matching (Physiotherapist)
        expect(qualifiedForPhysio.map(c => c.id)).toContain('sai-id');
    });

    it('includes Nutritionist for Consultation when tagged for Consultation in staff overrides', () => {
        const dynamicMappings = [
            { consultant_id: 'ganesh-id', service_id: 'consultation-service-id' },
            { consultant_id: 'raja-id', service_id: 'physio-service-id' },
            { consultant_id: 'raja-id', service_id: 'consultation-service-id' }
        ];

        const qualifiedForConsultation = filterConsultantsByService(consultants, consultationService, dynamicMappings);

        expect(qualifiedForConsultation.map(c => c.id)).toContain('ganesh-id');
        expect(qualifiedForConsultation.map(c => c.id)).toContain('raja-id');
        expect(qualifiedForConsultation.map(c => c.id)).toContain('sai-id');
    });
});
