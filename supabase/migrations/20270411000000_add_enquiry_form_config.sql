-- Migration: 20270411000000_add_enquiry_form_config.sql
-- Goal: Add enquiry form configuration to organizations

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS enquiry_form_config JSONB DEFAULT '{
    "tagline": "How can we help?",
    "fields": {
        "work_place": { "required": true, "visible": true },
        "looking_for": { "required": true, "visible": true, "options": [
            "Physiotherapy",
            "Strength & Conditioning",
            "Sports Consultation",
            "Injury Rehabilitation",
            "Performance Training",
            "Diet & Nutrition",
            "Other"
        ]},
        "referral_source": { "required": true, "visible": true },
        "preferred_call_time": { "required": false, "visible": true },
        "notes": { "required": false, "visible": true }
    },
    "custom_questions": []
}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.organizations.enquiry_form_config IS 'Stores dynamic enquiry form configuration including field visibility, mandatory status, and custom text questions.';
