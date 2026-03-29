-- Function for a trainer to securely link two of their clients
CREATE OR REPLACE FUNCTION public.trainer_link_clients(client_a UUID, client_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trainer_id UUID := auth.uid();
BEGIN
    -- Ensure caller is authenticated
    IF v_trainer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify trainer has client_a
    IF NOT EXISTS (SELECT 1 FROM trainer_users WHERE trainer_id = v_trainer_id AND user_id = client_a) THEN
        RAISE EXCEPTION 'Not authorized for client A';
    END IF;
    
    -- Verify trainer has client_b
    IF NOT EXISTS (SELECT 1 FROM trainer_users WHERE trainer_id = v_trainer_id AND user_id = client_b) THEN
        RAISE EXCEPTION 'Not authorized for client B';
    END IF;

    IF client_a = client_b THEN
        RAISE EXCEPTION 'Cannot pair a client with themselves';
    END IF;

    -- Update both profiles to point to each other
    UPDATE public.profiles SET partner_id = client_b WHERE user_id = client_a;
    UPDATE public.profiles SET partner_id = client_a WHERE user_id = client_b;

    RETURN TRUE;
END;
$$;

-- Function for a trainer to securely unlink a client
CREATE OR REPLACE FUNCTION public.trainer_unlink_client(client_a UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trainer_id UUID := auth.uid();
    v_partner_id UUID;
BEGIN
    -- Ensure caller is authenticated
    IF v_trainer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify trainer has client_a
    IF NOT EXISTS (SELECT 1 FROM trainer_users WHERE trainer_id = v_trainer_id AND user_id = client_a) THEN
        RAISE EXCEPTION 'Not authorized for this client';
    END IF;

    -- Get current partner_id
    SELECT partner_id INTO v_partner_id FROM public.profiles WHERE user_id = client_a;

    IF v_partner_id IS NOT NULL THEN
        -- Remove from client_a
        UPDATE public.profiles SET partner_id = NULL WHERE user_id = client_a;
        -- Remove from partner if they point back
        UPDATE public.profiles SET partner_id = NULL WHERE user_id = v_partner_id AND partner_id = client_a;
    END IF;

    RETURN TRUE;
END;
$$;
