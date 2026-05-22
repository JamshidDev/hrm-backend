<?php

namespace Modules\HR\DTO;

final readonly class DepartmentDTO
{
    public function __construct(
        public string $name,
        public ?string $nameRu,
        public ?string $nameEn,
        public ?string $comment,
        public int $level,
        public int $organizationId,
        public ?int $parentId,
    )
    {
    }
}