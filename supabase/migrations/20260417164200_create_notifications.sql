-- Evolve existing notifications table
DO $$ 
BEGIN
    -- Rename message to content if it exists and content doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='content') THEN
        ALTER TABLE public.notifications RENAME COLUMN message TO content;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sender_id') THEN
        ALTER TABLE public.notifications ADD COLUMN sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'announcement';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='priority') THEN
        ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_broadcast') THEN
        ALTER TABLE public.notifications ADD COLUMN is_broadcast BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='target_user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Make legacy user_id column nullable so broadcasts can work
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Index for querying notifications
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON public.notifications(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON public.notifications(is_broadcast) WHERE is_broadcast = true;

-- Create notification_reads table for tracking unread status
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- RLS Policies
CREATE POLICY "Staff can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'sports_scientist') 
    OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (is_broadcast = true OR target_user_id = auth.uid())
);

CREATE POLICY "Users can manage their own read status" ON public.notification_reads
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
