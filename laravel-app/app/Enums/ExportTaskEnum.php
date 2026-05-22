<?php

namespace App\Enums;

enum ExportTaskEnum: int
{
    case WORKERS = 1;
    case LATE_COMERS = 2;
    case WORKERS_RESUMES = 3;
    case EXAM_RESULTS = 4;
    case NOT_PASSED_EXAM_WORKERS = 5;
    case TURNSTILE_ABSENT_WORKERS = 6;
    case TURNSTILE_LATE_WORKERS = 7;
    case TURNSTILE_EARLY_LEAVE_WORKERS = 8;
    case TURNSTILE_WORK_DURATIONS = 9;
    case PENSIONERS = 10;
    case RELATIVES = 11;
    case STATEMENT_WITH_CODES_BY_ORGANIZATION = 12;
    case STATEMENT_WITH_CODES_BY_WORKERS = 13;
    case STATEMENT_MULTIPLE_WORKERS = 14;
    case STATEMENTS_WITH_CODES = 15;
    case STATEMENTS_WITH_ORGANIZATIONS = 16;
    case DEVICES = 17;
    case ONLINE_DEVICES = 18;
    case OFFLINE_DEVICES = 19;
    case LAST_SYNC_DEVICES = 20;
    case TURNSTILE_CURRENT_IN_WORKERS = 21;
    case TURNSTILE_CURRENT_OUT_WORKERS = 22;
    case TURNSTILE_DAILY_ATTENDANCE = 23;
    case TURNSTILE_COME = 24;
    case TURNSTILE_NOT_COME = 25;
    case VACATION_WORKERS = 26;
    case STATEMENTS_BY_POSITIONS = 27;

    case INCENTIVE = 28;
    case DISCIPLINARY = 29;
    case REPORT_EXPORT_BY_EDUCATION = 30;
    case NOT_INCLUDE_SCHEDULE_WORKERS = 31;
    case TIMESHEET_TURNSTILE_SCHEDULE = 32;
    case STATEMENT_WITH_CODES_BY_YEAR = 33;

    public static function all(): array
    {
        return [
            self::WORKERS->value   => trans('messages.export.types.workers'),
            self::LATE_COMERS->value   => trans('messages.export.types.late_come'),
            self::WORKERS_RESUMES->value   => trans('messages.export.types.zip'),
            self::EXAM_RESULTS->value   => trans('messages.export.types.exam_results'),
            self::NOT_PASSED_EXAM_WORKERS->value   => trans('messages.export.types.exam_not_passed_workers'),
            self::TURNSTILE_ABSENT_WORKERS->value   => trans('messages.export.types.turnstile_absent_workers'),
            self::TURNSTILE_LATE_WORKERS->value   => trans('messages.export.types.turnstile_late_workers'),
            self::TURNSTILE_EARLY_LEAVE_WORKERS->value   => trans('messages.export.types.turnstile_early_leave_workers'),
            self::TURNSTILE_WORK_DURATIONS->value   => trans('messages.export.types.turnstile_work_durations'),
            self::PENSIONERS->value   => trans('messages.export.types.pensioners'),
            self::RELATIVES->value   => trans('messages.export.types.relatives'),
            self::STATEMENT_WITH_CODES_BY_ORGANIZATION->value   => trans('messages.export.types.statement_with_codes_by_organizations'),
            self::STATEMENT_WITH_CODES_BY_WORKERS->value   => trans('messages.export.types.statement_with_codes_by_workers'),
            self::STATEMENT_MULTIPLE_WORKERS->value   => trans('messages.export.types.statement_multiple_workers'),
            self::STATEMENTS_WITH_CODES->value   => trans('messages.export.types.statement_with_codes'),
            self::STATEMENTS_WITH_ORGANIZATIONS->value   => trans('messages.export.types.statement_with_organizations'),
            self::DEVICES->value   => trans('messages.export.types.devices'),
            self::ONLINE_DEVICES->value   => trans('messages.export.types.online_devices'),
            self::OFFLINE_DEVICES->value   => trans('messages.export.types.offline_devices'),
            self::LAST_SYNC_DEVICES->value   => trans('messages.export.types.last_sync_devices'),
            self::TURNSTILE_CURRENT_IN_WORKERS->value   => trans('messages.export.types.current_in_workers'),
            self::TURNSTILE_CURRENT_OUT_WORKERS->value   => trans('messages.export.types.current_out_workers'),
            self::TURNSTILE_DAILY_ATTENDANCE->value   => trans('messages.export.types.daily_attendance'),
            self::TURNSTILE_COME->value   => trans('messages.export.types.turnstile_come'),
            self::TURNSTILE_NOT_COME->value   => trans('messages.export.types.turnstile_not_come'),
            self::VACATION_WORKERS->value   => trans('messages.export.types.vacation_workers'),
            self::STATEMENTS_BY_POSITIONS->value   => trans('messages.export.types.statements_by_positions'),
            self::INCENTIVE->value   => trans('messages.export.types.incentive'),
            self::DISCIPLINARY->value   => trans('messages.export.types.disciplinary'),
            self::REPORT_EXPORT_BY_EDUCATION->value   => trans('messages.export.types.report_export_by_education'),
            self::NOT_INCLUDE_SCHEDULE_WORKERS->value   => trans('messages.export.types.notIncludedScheduleWorkers'),
            self::TIMESHEET_TURNSTILE_SCHEDULE->value   => trans('messages.export.types.turnstile_schedule_timesheet'),
            self::STATEMENT_WITH_CODES_BY_YEAR->value   => trans('messages.export.types.statement_with_codes_by_year'),
        ];
    }

    public static function get(int $key): string
    {
        return self::all()[$key] ?? "";
    }

    public static function list(): array
    {
        return array_map(
            static fn($id, $name) => ['id' => $id, 'name' => $name],
            array_keys(self::all()),
            self::all()
        );
    }
}
