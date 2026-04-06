-- Session Governance V2
-- 1. Block completing future sessions
-- 2. 24-hour edit lock after completion

CREATE OR REPLACE FUNCTION public.enforce_session_governance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN

        -- Rule A: Cannot reschedule planned times within 30 minutes of start
        IF OLD.scheduled_start != NEW.scheduled_start OR OLD.scheduled_end != NEW.scheduled_end THEN
            IF NOW() > (OLD.scheduled_start - interval '30 minutes') THEN
                RAISE EXCEPTION 'Cannot modify scheduled times within 30 minutes of session start. Please mark as Rescheduled and create a new session.';
            END IF;
        END IF;

        -- Rule B: Cannot mark a FUTURE session as Completed
        IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
            IF NEW.scheduled_start > NOW() THEN
                RAISE EXCEPTION 'Cannot mark a future session as Completed. The session is scheduled for %.', NEW.scheduled_start;
            END IF;
        END IF;

        -- Rule C: Completion requires actual_start and actual_end
        IF NEW.status = 'Completed' THEN
            IF NEW.actual_start IS NULL OR NEW.actual_end IS NULL THEN
                RAISE EXCEPTION 'Cannot mark session as Completed without providing actual_start and actual_end timestamps.';
            END IF;
        END IF;

        -- Rule D: 24-hour edit lock after completion
        IF OLD.status = 'Completed' AND OLD.actual_end IS NOT NULL THEN
            -- ALLOW reconciliation (clearing un-entitled flag) even after 24h
            IF OLD.is_unentitled AND NOT NEW.is_unentitled THEN
                -- Do nothing, let it pass
            ELSIF OLD.actual_end < (NOW() - interval '24 hours') THEN
                RAISE EXCEPTION 'Session cannot be edited more than 24 hours after completion. Contact an administrator.';
            END IF;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger still exists (recreate if needed)
DROP TRIGGER IF EXISTS session_governance_check ON public.sessions;
CREATE TRIGGER session_governance_check
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_governance();
