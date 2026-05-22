<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            CREATE TABLE IF NOT EXISTS terminal_events_partitioned (
                id BIGSERIAL,
                worker_id BIGINT,
                worker_position_id BIGINT,
                hik_central_access_level_id BIGINT,
                event_date_and_time TIMESTAMP(0) NOT NULL,
                auth_type VARCHAR(60),
                device_name VARCHAR(255),
                device_serial VARCHAR(50),
                resource_name VARCHAR(255),
                last_name VARCHAR(255),
                first_name VARCHAR(255),
                middle_name VARCHAR(255),
                direction BOOLEAN,
                temperature DOUBLE PRECISION,
                mask_status SMALLINT,
                created_at TIMESTAMP(0) DEFAULT NOW(),
                updated_at TIMESTAMP(0) DEFAULT NOW(),
                deleted_at TIMESTAMP(0)
            )
            PARTITION BY RANGE (event_date_and_time);
        ");

        DB::statement("
            CREATE OR REPLACE FUNCTION create_terminal_events_indexes(partition_name TEXT)
            RETURNS void AS $$
            DECLARE
                unique_name TEXT := format('unique_worker_events_%s', partition_name);
                pk_name TEXT := format('pk_%s', partition_name);
            BEGIN

                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_worker_date_%I
                    ON %I (worker_id, event_date_and_time DESC) WHERE deleted_at IS NULL;
                ', partition_name, partition_name);

                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_access_level_date_%I
                    ON %I (hik_central_access_level_id, event_date_and_time DESC)
                    WHERE deleted_at IS NULL;
                ', partition_name, partition_name);

                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_direction_in_%I
                    ON %I (worker_id, event_date_and_time ASC)
                    WHERE direction IS TRUE AND deleted_at IS NULL;
                ', partition_name, partition_name);

                EXECUTE format('
                    CREATE INDEX IF NOT EXISTS idx_direction_out_%I
                    ON %I (worker_id, event_date_and_time DESC)
                    WHERE direction IS FALSE AND deleted_at IS NULL;
                ', partition_name, partition_name);

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = unique_name
                ) THEN
                    EXECUTE format('
                        ALTER TABLE %I
                        ADD CONSTRAINT %I UNIQUE (worker_id, event_date_and_time, direction);
                    ', partition_name, unique_name);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = pk_name
                ) THEN
                    EXECUTE format('
                        ALTER TABLE %I
                        ADD CONSTRAINT %I PRIMARY KEY (id);
                    ', partition_name, pk_name);
                END IF;

                EXECUTE format('ANALYZE %I;', partition_name);
            END;
            $$ LANGUAGE plpgsql;
        ");
    }

    public function down(): void
    {
        DB::statement("DROP TABLE IF EXISTS terminal_events_partitioned CASCADE;");
    }
};
