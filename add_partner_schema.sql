-- Add partner_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES auth.users(id);

-- Create secure policy so users can view their partner's profile information
CREATE POLICY "Users can view partner profile" ON public.profiles
    FOR SELECT USING (
        user_id = (SELECT partner_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Function to securely link a partner by email
CREATE OR REPLACE FUNCTION public.link_partner_by_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID;
    v_caller_id UUID := auth.uid();
BEGIN
    -- Ensure caller is authenticated
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find partner user id by email from auth.users
    SELECT id INTO v_partner_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF v_partner_id IS NULL THEN
        RAISE EXCEPTION 'User with this email not found';
    END IF;

    IF v_partner_id = v_caller_id THEN
        RAISE EXCEPTION 'Cannot partner with yourself';
    END IF;

    -- Update both profiles to point to each other
    UPDATE public.profiles SET partner_id = v_partner_id WHERE user_id = v_caller_id;
    UPDATE public.profiles SET partner_id = v_caller_id WHERE user_id = v_partner_id;

    RETURN TRUE;
END;
$$;

-- Function to unlink a partner
CREATE OR REPLACE FUNCTION public.unlink_partner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID;
    v_caller_id UUID := auth.uid();
BEGIN
    -- Ensure caller is authenticated
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get current partner_id
    SELECT partner_id INTO v_partner_id FROM public.profiles WHERE user_id = v_caller_id;

    IF v_partner_id IS NOT NULL THEN
        -- Remove from caller
        UPDATE public.profiles SET partner_id = NULL WHERE user_id = v_caller_id;
        -- Remove from partner if they point back (just in case they were mutually linked)
        UPDATE public.profiles SET partner_id = NULL WHERE user_id = v_partner_id AND partner_id = v_caller_id;
    END IF;

    RETURN TRUE;
END;
$$;
