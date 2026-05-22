CREATE OR REPLACE FUNCTION notify_new_access_log()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_event_channel', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_access_log ON access_log;

CREATE TRIGGER trigger_new_access_log
    AFTER INSERT ON access_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_access_log();
