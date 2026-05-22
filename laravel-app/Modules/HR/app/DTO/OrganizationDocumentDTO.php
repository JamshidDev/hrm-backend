<?php

namespace Modules\HR\DTO;

use Illuminate\Http\UploadedFile;

final readonly class OrganizationDocumentDTO
{
    public function __construct(
        public readonly string $title,
        public readonly ?string $description,
        public readonly ?string $documentDate,
        public readonly string $type,
        public readonly string $visibilityType,
        public readonly ?UploadedFile $file = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            title: $data['title'],
            description: $data['description'] ?? null,
            documentDate: $data['document_date'] ?? null,
            type: $data['type'] ?? '',
            visibilityType: $data['visibility_type'],
            file: $data['file'] ?? null
        );
    }
}