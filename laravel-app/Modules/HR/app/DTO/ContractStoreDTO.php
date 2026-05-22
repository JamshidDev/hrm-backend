<?php

namespace Modules\HR\DTO;

final readonly class ContractStoreDTO
{
    public function __construct(

        // Core
        public string $number,
        public string $contract_date,
        public int $organization_id,
        public int $type,
        public string $position_date,
        public int $schedule_id,
        public int $worker_id,
        public int $director_id,
        public bool $command_status,
        public ?int $command_type,

        // Optional / template
        public ?int $probation,
        public string|null $post_name,
        public float|null $salary,
        public int|null $vacation_main_day,
        public ?int $additional_vacation_day,
        public int $department_id,
        public ?string $contract_to_date,
        public ?int $department_position_id,
        public ?int $position_id,
        public ?string $command_date,
        public ?array $confirmations,
        public ?string $group,
        public ?string $rank,
        public ?float $rate,
        public ?string $position_status,
        public ?string $table_number,
        public ?int $temporary_worker_id,
    ) {}

    public static function fromRequest($request): self
    {
        return new self(

            number: preg_replace('/\D/', '', $request->number),
            contract_date: $request->contract_date,
            organization_id: (int)$request->organization_id,
            type: (int)$request->type,
            position_date: $request->position_date,
            schedule_id: (int)$request->schedule_id,
            worker_id: (int)$request->worker_id,
            director_id: (int)$request->director_id,
            command_status: (bool)$request->command_status,
            command_type:$request->command_type ?? null,

            probation: $request->probation !== null
                ? (int)$request->probation
                : null,

            post_name: $request->post_name,
            salary: (float)$request->salary,
            vacation_main_day: (int)$request->vacation_main_day,
            additional_vacation_day: $request->additional_vacation_day !== null
                ? (int)$request->additional_vacation_day
                : null,

            department_id: (int)$request->department_id,
            contract_to_date: $request->contract_to_date,
            department_position_id: $request->department_position_id !== null
                ? (int)$request->department_position_id
                : null,

            position_id: $request->position_id !== null
                ? (int)$request->position_id
                : null,

            command_date: $request->command_date,
            confirmations: $request->confirmations,
            group: $request->group,
            rank: $request->rank,
            rate: $request->rate !== null ? (float)$request->rate : null,
            position_status: $request->position_status,
            table_number: $request->table_number,
            temporary_worker_id: $request->temporary_worker_id !== null
                ? (int)$request->temporary_worker_id
                : null,
        );
    }

    public function toArray(): array
    {
        return get_object_vars($this);
    }
}