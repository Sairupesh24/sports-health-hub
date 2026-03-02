
-- Add payment_method column to bills
ALTER TABLE public.bills ADD COLUMN payment_method TEXT DEFAULT NULL;
-- Values: 'cash', 'upi', 'card', or NULL
