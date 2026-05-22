<?php

namespace Modules\Confirmation\Enums;

use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\Confirmation\Models\LmsCertificateConfirmation;
use Modules\Confirmation\Models\ReportConfirmation;
use Modules\Confirmation\Models\SendedWorkerConfirmation;
use Modules\Confirmation\Models\StaffingApproveConfirmation;
use Modules\Confirmation\Models\TimesheetConfirmation;
use Modules\Confirmation\Models\VacationScheduleConfirmation;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\Confirmation\Models\WorkerExamConfirmation;
use Modules\Economist\Models\StaffingApprove;
use Modules\Exam\Models\WorkerExam;
use Modules\HR\Models\Command;
use Modules\HR\Models\Contract;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Models\VacationScheduleYear;
use Modules\HR\Models\WorkerApplication;
use Modules\LMS\Models\LmsCertificate;
use Modules\Med\Models\SendedWorker;
use Modules\Structure\Models\CommandType;
use Modules\Structure\Models\ContractAdditionalType;
use Modules\Structure\Models\ContractType;
use Modules\Structure\Models\Report;
use Modules\TimeSheet\Models\TimeSheet;

enum ModelTypeEnum: string
{
    case CONTRACTS = 'contracts';
    case COMMANDS = 'commands';
    case CONTRACT_ADDITIONAL = 'contract-additional';
    case WORKER_APPLICATION = 'worker-application';
    case TIMESHEET = 'timesheet';
    case MED = 'med';
    case WORKER_EXAM = 'worker-exams';
    case VACATION_SCHEDULE = 'vacation-schedule';
    case LMS_CERTIFICATE = 'lms-certificate';
    case STAFFING_APPROVE = 'staffing-approve';
    case REPORT = 'report';

    public function label(): string
    {
        return match ($this) {
            self::CONTRACTS => __("Contracts"),
            self::COMMANDS => __("Commands"),
            self::CONTRACT_ADDITIONAL => __("Contract Additional"),
            self::WORKER_APPLICATION => __("Worker Application"),
            self::TIMESHEET => __("Timesheet"),
            self::MED => __("Med"),
            self::WORKER_EXAM => __("Worker Exams"),
            self::VACATION_SCHEDULE => __("Vacation schedule"),
            self::LMS_CERTIFICATE => __("LMS Certificate"),
            self::STAFFING_APPROVE => __("Staffing Approve"),
            self::REPORT => __("REPORT"),
        };
    }

    public function confirmationModelClass(): string
    {
        return match ($this) {
            self::CONTRACTS => ContractConfirmation::class,
            self::COMMANDS => CommandConfirmation::class,
            self::CONTRACT_ADDITIONAL => ContractAdditionalConfirmation::class,
            self::WORKER_APPLICATION => WorkerApplicationConfirmation::class,
            self::TIMESHEET => TimesheetConfirmation::class,
            self::MED => SendedWorkerConfirmation::class,
            self::WORKER_EXAM => WorkerExamConfirmation::class,
            self::VACATION_SCHEDULE => VacationScheduleConfirmation::class,
            self::LMS_CERTIFICATE => LmsCertificateConfirmation::class,
            self::STAFFING_APPROVE => StaffingApproveConfirmation::class,
            self::REPORT => ReportConfirmation::class,
        };
    }

    public function model(): ?string
    {
        return match ($this) {
            self::CONTRACTS => Contract::class,
            self::COMMANDS => Command::class,
            self::CONTRACT_ADDITIONAL => ContractAdditional::class,
            self::WORKER_APPLICATION => WorkerApplication::class,
            self::TIMESHEET => TimeSheet::class,
            self::MED => SendedWorker::class,
            self::WORKER_EXAM => WorkerExam::class,
            self::VACATION_SCHEDULE => VacationScheduleYear::class,
            self::LMS_CERTIFICATE => LmsCertificate::class,
            self::STAFFING_APPROVE => StaffingApprove::class,
            self::REPORT => Report::class,
        };
    }

    public function typeModel(): ?string
    {
        return match ($this) {
            self::CONTRACTS => ContractType::class,
            self::COMMANDS => CommandType::class,
            self::CONTRACT_ADDITIONAL => ContractAdditionalType::class,
            self::WORKER_APPLICATION => WorkerApplication::class,
            self::TIMESHEET => TimeSheet::class,
            self::MED => SendedWorker::class,
            self::WORKER_EXAM => WorkerExam::class,
            self::VACATION_SCHEDULE => VacationScheduleYear::class,
            self::LMS_CERTIFICATE => LmsCertificate::class,
            self::STAFFING_APPROVE => StaffingApprove::class,
            self::REPORT => Report::class,
        };
    }

    public function relation(): ?string
    {
        return match ($this) {
            self::CONTRACTS => 'contract',
            self::COMMANDS => 'command',
            self::CONTRACT_ADDITIONAL => 'contract_additional',
            self::WORKER_APPLICATION => 'worker_application',
            self::TIMESHEET => 'time_sheet',
            self::MED => 'sended_worker',
            self::WORKER_EXAM => 'worker_exam',
            self::VACATION_SCHEDULE => 'vacation_schedule_year',
            self::LMS_CERTIFICATE => 'lms_certificate',
            self::STAFFING_APPROVE => 'staffing_approve',
            self::REPORT => 'report',
        };
    }


    public function foreignKey(): ?string
    {
        return match ($this) {
            self::CONTRACTS => 'contract_id',
            self::COMMANDS => 'command_id',
            self::CONTRACT_ADDITIONAL => 'contract_additional_id',
            self::WORKER_APPLICATION => 'worker_application_id',
            self::TIMESHEET => 'time_sheet_id',
            self::MED => 'sended_worker_id',
            self::WORKER_EXAM => 'worker_exam_id',
            self::VACATION_SCHEDULE => 'vacation_schedule_year_id',
            self::LMS_CERTIFICATE => 'lms_certificate_id',
            self::STAFFING_APPROVE => 'staffing_approve_id',
            self::REPORT => 'report_id',
        };
    }

    public static function all(): array
    {
        return array_map(static fn($case) => $case->label(), self::cases());
    }

    public static function list(): array
    {
        return array_map(static fn($case) => ['id' => $case->value, 'name' => $case->label()], self::cases());
    }
}
