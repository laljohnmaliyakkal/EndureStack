-- Add platform_fee column to gyms
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;

-- Add payment_status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Create platform_fees table
CREATE TABLE IF NOT EXISTS public.platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- Admins can view platform_fees for their gym
CREATE POLICY "Admins can view platform_fees" ON public.platform_fees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin' 
            AND profiles.gym_id = platform_fees.gym_id
        )
    );

-- Admins can insert platform_fees for their gym
CREATE POLICY "Admins can insert platform_fees" ON public.platform_fees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin' 
            AND profiles.gym_id = platform_fees.gym_id
        )
    );

-- Function to bulk insert payments and update profiles securely
CREATE OR REPLACE FUNCTION public.process_platform_fee_payments(
    p_client_ids UUID[],
    p_gym_id UUID,
    p_amount NUMERIC,
    p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_client_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if caller is admin of the gym
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = v_admin_id AND role = 'admin' AND gym_id = p_gym_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Not authorized to process payments for this gym';
    END IF;

    -- Process each client
    FOREACH v_client_id IN ARRAY p_client_ids
    LOOP
        -- Insert payment record
        INSERT INTO public.platform_fees (user_id, gym_id, amount, notes, created_by)
        VALUES (v_client_id, p_gym_id, p_amount, p_notes, v_admin_id);

        -- Update profile status
        UPDATE public.profiles
        SET payment_status = 'paid'
        WHERE user_id = v_client_id AND gym_id = p_gym_id;
    END LOOP;

    RETURN TRUE;
END;
$$;
