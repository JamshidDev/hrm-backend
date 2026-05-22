<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{

    public function up(): void
    {
        \Illuminate\Support\Facades\DB::statement("
            CREATE TABLE turnstile_worker_schedules (
                id BIGSERIAL,
                worker_id BIGINT NULL REFERENCES workers(id),
                worker_position_id BIGINT NULL REFERENCES worker_positions(id),
                turnstile_schedule_group_id BIGINT NULL REFERENCES turnstile_schedule_groups(id),
                date DATE NOT NULL,
                work_status SMALLINT,
                start_time TIME,
                end_time TIME,
                daily_minutes INTEGER DEFAULT 0,
                daytime INTEGER DEFAULT 0,
                evening_time INTEGER DEFAULT 0,
                fact_daily_minutes INTEGER,
                fact_daytime INTEGER,
                fact_evening_time INTEGER,
                cause SMALLINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now(),
                deleted_at TIMESTAMP,
                PRIMARY KEY(id, date)  -- Partition talabiga binoan date primary keyga qo‘shilgan
            ) PARTITION BY RANGE (date);
        ");

        DB::statement("
        CREATE OR REPLACE FUNCTION create_turnstile_worker_schedule_index(p_year INT, p_month INT)
        RETURNS void AS $$
        DECLARE
            start_date DATE := make_date(p_year, p_month, 1);
            end_date DATE := (start_date + INTERVAL '1 month')::date;
            partition_name TEXT := 'turnstile_worker_schedules_' || p_year || '_' || LPAD(p_month::text, 2, '0');
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_tables WHERE tablename = partition_name
            ) THEN
                EXECUTE format(
                    'CREATE TABLE %I PARTITION OF turnstile_worker_schedules
                     FOR VALUES FROM (%L) TO (%L)',
                    partition_name,
                    start_date,
                    end_date
                );
        
                -- UNIQUE(worker_id, worker_position_id, date)
                EXECUTE format(
                    'CREATE UNIQUE INDEX %I ON %I(worker_id, worker_position_id, date);',
                    partition_name || '_unique_wp_date',
                    partition_name
                );
        
                EXECUTE format(
                    'CREATE INDEX %I ON %I(worker_position_id, date);',
                    partition_name || '_position_date_index',
                    partition_name
                );
        
                EXECUTE format(
                    'CREATE INDEX %I ON %I(worker_id, worker_position_id, date);',
                    partition_name || '_wp_date_index',
                    partition_name
                );
            END IF;
        END;
        $$ LANGUAGE plpgsql;
        ");

    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("DROP TABLE IF EXISTS turnstile_worker_schedules CASCADE;");
    }
};
