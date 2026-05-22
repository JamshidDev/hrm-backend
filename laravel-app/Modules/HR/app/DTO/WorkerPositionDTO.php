<?php

namespace Modules\HR\DTO;

final readonly class WorkerPositionDTO
{
    public function __construct(
        public readonly array $positionData,
        public readonly string $contractNumber,
        public readonly string $contractDate,
        public readonly string $type,
        public readonly ?int $departmentPositionId,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            positionData: $data,
            contractNumber: $data['contract_number'],
            contractDate: $data['contract_date'],
            type: $data['type'],
            departmentPositionId: $data['department_position_id'] ?? null,
        );
    }
}