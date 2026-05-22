<?php

namespace Modules\HR\DTO;

final readonly class ContractAdditionalStoreDTO
{
    public function __construct(
        // Core business
        public int $worker_position_id,
        public int $type,
        public string $number,
        public string $contract_date,
        public int $director_id,
        public bool $command_status,
        public ?int $organization_id,

        // Template / optional logic
        public ?int              $probation,
        public ?string           $post_name,
        public null|string|int   $salary,
        public null|string|int   $vacation_main_day,
        public null|string|int   $additional_vacation_day,
        public ?int              $department_id,
        public ?string           $contract_to_date,
        public ?int              $department_position_id,
        public ?int              $position_id,
        public ?string           $command_date,
        public ?array            $confirmations,
        public ?string           $group,
        public ?string           $rank,
        public null|string|float $rate,
        public null|string|int   $position_status,
        public null|string|int   $table_number,
        public ?int              $temporary_worker_id,
        public ?int $worker_id,
    ) {}

    public static function fromRequest($request): self
    {
        return new self(
            worker_position_id: (int)$request->worker_position_id,
            type: (int) $request->type,
            number: preg_replace('/\D/', '', $request->number),
            contract_date: $request->contract_date,
            director_id: (int)$request->director_id,
            command_status: (bool) $request->command_status,
            organization_id: $request->organization_id ? (int)$request->organization_id : null,
            probation: $request->probation ? (int)$request->probation : null,
            post_name: $request->post_name,
            salary: $request->salary ? (float)$request->salary : null,
            vacation_main_day: $request->vacation_main_day ? (int)$request->vacation_main_day : null,
            additional_vacation_day: $request->additional_vacation_day ? (int)$request->additional_vacation_day : null,
            department_id: $request->department_id ? (int)$request->department_id : null,
            contract_to_date: $request->contract_to_date,
            department_position_id: $request->department_position_id ? (int)$request->department_position_id : null,
            position_id: $request->position_id ? (int)$request->position_id : null,
            command_date: $request->command_date,
            confirmations: $request->confirmations,
            group: $request->group,
            rank: $request->rank,
            rate: $request->rate ? (float)$request->rate : null,
            position_status: $request->position_status,
            table_number: $request->table_number,
            temporary_worker_id: $request->temporary_worker_id ? (int)$request->temporary_worker_id : null,
            worker_id: $request->worker_id ? (int)$request->worker_id : null,
        );
    }

    public function toArray(): array
    {
        return get_object_vars($this);
    }
}