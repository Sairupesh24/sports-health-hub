-- Migration to relax hr_leaves to reference profiles directly, aligning with attendance

ALTER TABLE public.hr_leaves 
DROP CONSTRAINT hr_leaves_employee_id_fkey,
ADD CONSTRAINT hr_leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop previous bad policies from the previous migration
DROP POLICY IF EXISTS "Employees can view own leaves" ON public.hr_leaves;
DROP POLICY IF EXISTS "Employees can insert own leaves" ON public.hr_leaves;

-- Create correct policies that use auth.uid() directly against employee_id (which now represents profile_id)
CREATE POLICY "Employees can view own leaves" ON public.hr_leaves 
FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own leaves" ON public.hr_leaves 
FOR INSERT WITH CHECK (employee_id = auth.uid());

-- Also add an update policy so employees can cancel draft leaves (optional, but good practice)
CREATE POLICY "Employees can update own leaves" ON public.hr_leaves 
FOR UPDATE USING (employee_id = auth.uid());
