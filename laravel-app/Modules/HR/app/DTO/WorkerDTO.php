<?php

namespace Modules\HR\DTO;

final readonly class WorkerDTO
{
    public function __construct(
        public readonly array $workerData,
        public readonly ?array $phones,
        public readonly ?array $photos,
        public readonly ?string $userPhone,
        public readonly bool $updatePassword = false,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            workerData: $data,
            phones: $data['phones'] ?? null,
            photos: $data['photos'] ?? null,
            userPhone: $data['user_phone'] ?? null,
            updatePassword: (bool)($data['update_password'] ?? false),
        );
    }
}