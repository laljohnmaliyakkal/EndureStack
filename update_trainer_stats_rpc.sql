-- RPC function to get trainer stats for a gym admin
-- Returns: trainer_name, sessions_today, sessions_week, sessions_month

CREATE OR REPLACE FUNCTION get_trainer_stats(target_gym_id UUID)
RETURNS TABLE (
    trainer_name TEXT,
    sessions_today BIGINT,
    sessions_week BIGINT,
    sessions_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.full_name as trainer_name,
        -- Count Today
        COUNT(DISTINCT CASE WHEN ws.session_date = CURRENT_DATE THEN ws.id END) as sessions_today,
        -- Count Week (Last 7 days)
        COUNT(DISTINCT CASE WHEN ws.session_date >= (CURRENT_DATE - INTERVAL '7 days') THEN ws.id END) as sessions_week,
        -- Count Month (Last 30 days)
        COUNT(DISTINCT CASE WHEN ws.session_date >= (CURRENT_DATE - INTERVAL '30 days') THEN ws.id END) as sessions_month
    FROM 
        profiles p
    JOIN 
        trainer_users tu ON p.user_id = tu.trainer_id
    JOIN 
        workout_sessions ws ON tu.user_id = ws.user_id
    WHERE 
        p.gym_id = target_gym_id
        AND p.role = 'trainer'
    GROUP BY 
        p.user_id, p.full_name
    ORDER BY 
        sessions_today DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
