-- Migration to add soreness_data to physio_session_details
ALTER TABLE public.physio_session_details 
ADD COLUMN IF NOT EXISTS soreness_data TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.physio_session_details.soreness_data IS 'Interactive soreness map selections for the session';
