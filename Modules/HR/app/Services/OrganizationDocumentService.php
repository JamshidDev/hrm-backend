<?php

namespace Modules\HR\Services;

use App\Helpers\Helper;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\HR\DTO\OrganizationDocumentDTO;
use Modules\HR\Models\OrganizationDocument;

class OrganizationDocumentService
{
    use Base64FileUploadTrait;

    public function store(OrganizationDocumentDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $user = auth()->user();

            $filePath = $this->uploadFormFile(
                $dto->file,
                'organization-documents',
                Helper::getFileTypes('document')
            );

            OrganizationDocument::create([
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'title' => $dto->title,
                'description' => $dto->description,
                'file' => $filePath,
                'document_date' => $dto->documentDate,
                'type' => $dto->type,
                'visibility_type' => $dto->visibilityType,
            ]);
        });
    }

    public function update(
        OrganizationDocument $document,
        OrganizationDocumentDTO $dto
    ): void {
        DB::transaction(function () use ($document, $dto) {
            $data = [
                'title' => $dto->title,
                'description' => $dto->description,
                'document_date' => $dto->documentDate,
                'visibility_type' => $dto->visibilityType,
            ];

            if ($dto->file) {
                Storage::disk(config('filesystems.default'))
                    ->delete($document->file);

                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'organization-documents',
                    Helper::getFileTypes('document')
                );
            }

            $document->update($data);
        });
    }

    public function delete(OrganizationDocument $document): void
    {
        Storage::disk(config('filesystems.default'))
            ->delete($document->file);

        $document->delete();
    }
}
