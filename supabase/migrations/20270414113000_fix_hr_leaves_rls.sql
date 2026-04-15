-- Allow employees to view their own leaves
CREATE POLICY "Employees can view own leaves" ON public.hr_leaves 
FOR SELECT USING (employee_id = auth.uid());

-- Allow employees to insert their own leaves
CREATE POLICY "Employees can insert own leaves" ON public.hr_leaves 
FOR INSERT WITH CHECK (employee_id = auth.uid());
