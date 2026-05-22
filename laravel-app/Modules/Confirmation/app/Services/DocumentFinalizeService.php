<?php

namespace Modules\Confirmation\Services;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Services\CommandConfirmationService;
use App\Services\ContractConfirmationService;
use App\Services\SignatureService;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\HR\Enums\ContractCommandStatusEnum;
use PhpOffice\PhpWord\TemplateProcessor;
use RuntimeException;

readonly class DocumentFinalizeService
{
    public function __construct(
        private CommandConfirmationService  $commandConfirmation,
        private ContractConfirmationService $contractConfirmationService,
        private SignatureService            $signatureService,
    ) {
    }

    public function confirmDocument($document, string $model, mixed $confirmationId): void
    {
        $document->confirmation = ConfirmationStatusEnum::SUCCESS->value;
        $document->save();

        $this->applyModelConfirmation($model, $document);
        $this->replaceDocumentSignature($document, $model, $confirmationId);
    }

    public function applyModelConfirmation(string $model, $document): void
    {
        if ($model === ModelTypeEnum::COMMANDS->value) {
            $this->commandConfirmation->confirmation($document);
        }

        if ($model === ModelTypeEnum::CONTRACTS->value
            && $document->command_status === ContractCommandStatusEnum::NOT_MANDATORY->value) {
            $this->contractConfirmationService->confirmation($document);
        }

        if ($model === ModelTypeEnum::CONTRACT_ADDITIONAL->value
            && $document->command_status === ContractCommandStatusEnum::NOT_MANDATORY->value) {
            $this->contractConfirmationService->updateContract($document);
        }
    }

    public function replaceDocumentSignature($document, string $model, mixed $confirmationId): void
    {
        $temp = new TemplateProcessor(Helper::fileUrl($document->file));
        $signatureUser = $document->confirmations->where('id', $confirmationId)->first();

        if (!$signatureUser) {
            throw new RuntimeException(trans('messages.document.not_found'));
        }

        if ($signatureUser->confirmation_type === ConfirmationTypeEnum::DIGITAL->value) {
            $image = $this->signatureService->signatureToImageDigital($model, $document->uuid);
        } else {
            $image = $this->signatureService->signatureToImageBio($signatureUser, $document->uuid);
        }

        $key = $signatureUser->type === 'w'
            && in_array($model, ['contracts', 'contract-additional', 'worker-application'], true)
            ? 'signature_worker'
            : 'signature_director';

        $temp->setImageValue($key, [
            'path' => $image,
            'width' => 120,
            'height' => 160,
        ]);

        $fileName = basename($document->file);
        $tempDir = storage_path('app/temp');
        if (!file_exists($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
            throw new RuntimeException(sprintf('Directory "%s" was not created', $tempDir));
        }

        $newFilePath = $tempDir . '/' . basename($document->file);
        $temp->saveAs($newFilePath);

        Storage::disk(config('filesystems.default'))->put($model . '/' . $fileName, file_get_contents($newFilePath));
        @unlink($newFilePath);

        $convert = ConvertHelper::docxToPdf($document->file, 'documents/' . $model, 'minio');
        if (!($convert['status'] ?? false)) {
            throw new RuntimeException($convert['msg'] ?? trans('messages.server_error'));
        }
    }
}
