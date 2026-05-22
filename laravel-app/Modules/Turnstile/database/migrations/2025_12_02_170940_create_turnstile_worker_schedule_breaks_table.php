<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
          CREATE TABLE turnstile_worker_schedule_breaks (
                id BIGSERIAL,
                turnstile_worker_schedule_id BIGINT NOT NULL,
                schedule_date DATE NOT NULL,
                FOREIGN KEY (turnstile_worker_schedule_id, schedule_date)
                    REFERENCES turnstile_worker_schedules(id, date) ON DELETE CASCADE,
                worker_id BIGINT NOT NULL,
                worker_position_id BIGINT,
                date DATE NOT NULL,
                break_start TIME NOT NULL,
                break_end TIME NOT NULL,
                break_minutes INT GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (break_end - break_start)) / 60)::int) STORED,
                planned_break_start TIME,
                planned_break_end TIME,
                is_late_start BOOLEAN GENERATED ALWAYS AS (break_start > planned_break_start) STORED,
                is_early_start BOOLEAN GENERATED ALWAYS AS (break_start < planned_break_start) STORED,
                is_late_end BOOLEAN GENERATED ALWAYS AS (break_end > planned_break_end) STORED,
                is_early_end BOOLEAN GENERATED ALWAYS AS (break_end < planned_break_end) STORED,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY(id, date)
                ) PARTITION BY RANGE (date);
        ");

        DB::statement("
            CREATE OR REPLACE FUNCTION create_turnstile_worker_schedule_breaks_partition(p_year INT, p_month INT)
        RETURNS void AS
    $$
    DECLARE
        start_date     DATE := make_date(p_year, p_month, 1);
        end_date       DATE := (start_date + INTERVAL '1 month')::date;
        partition_name TEXT := 'turnstile_worker_schedule_breaks_' || p_year || '_' || LPAD(p_month::text, 2, '0');
    BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_tables
                   WHERE tablename = partition_name) THEN
        EXECUTE format(
                'CREATE TABLE %I PARTITION OF turnstile_worker_schedule_breaks
                FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                start_date,
                end_date
                );


        -- Indexes
        EXECUTE format(
                'CREATE INDEX %I ON %I(date);',
                partition_name || '_date_index',
                partition_name
                );


        EXECUTE format(
                'CREATE INDEX %I ON %I(worker_id, date);',
                partition_name || '_worker_date_index',
                partition_name
                );


        EXECUTE format(
                'CREATE INDEX %I ON %I(is_late_start);',
                partition_name || '_late_start_index',
                partition_name
                );


        EXECUTE format(
                'CREATE INDEX %I ON %I(is_late_end);',
                partition_name || '_late_end_index',
                partition_name
                );
        END IF;
    END;
    $$ LANGUAGE plpgsql;
        ");
    }


    public function down(): void
    {
        DB::statement("DROP FUNCTION IF EXISTS create_turnstile_worker_schedule_breaks_partition(INT, INT);");
        DB::statement("DROP TABLE IF EXISTS turnstile_worker_schedule_breaks CASCADE;");
    }
};
