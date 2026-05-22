<?php

namespace Modules\Economist\Services;

use App\Helpers\EconomistHelper;
use App\Jobs\Economist\PensionPaymentUploadJob;
use App\Jobs\Economist\StatementUploadJob;
use App\Jobs\Economist\TaxFiveUploadJob;
use App\Jobs\Economist\TaxFourUploadJob;
use App\Traits\Base64FileUploadTrait;
use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Modules\Economist\Enums\UploadStatusEnum;
use Modules\Economist\Enums\UploadTypeEnum;
use Modules\Economist\Exceptions\EconomistUploadServiceException;
use Modules\Economist\Models\EconomistUpload;
use Modules\Economist\Models\PensionPayment;
use Modules\Economist\Models\Statement;
use Modules\Economist\Models\TaxFiveApplication;
use Modules\Economist\Models\TaxFourApplication;
use Modules\Structure\Models\Organization;

class EconomistUploadService
{
    use Base64FileUploadTrait;

    public function upload(array $data, UploadedFile $file, $user): void
    {
        $organizationId = $data['organization_id'] ?? $user->organization_id;
        $organization = Organization::with('uploadStatus')->findOrFail($organizationId);
        $year = $data['year'] ?? now()->year;
        $month = $data['month'] ?? now()->month;
        $deadline = EconomistHelper::getUploadDeadline($year, $month);

        if (!$organization->uploadStatus && now()->greaterThan($deadline)) {
            throw EconomistUploadServiceException::permissionDenied(trans('messages.permission_denied_upload'));
        }

        $confirmedCount = EconomistUpload::query()
            ->where('organization_id', $organizationId)
            ->where('type', $data['type'])
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->where('status', UploadStatusEnum::SUCCESS->value)
            ->count();

        if ($confirmedCount > 0) {
            throw EconomistUploadServiceException::uploadApprovedFile(trans('messages.the_file_has_already_been_approved'));
        }
        $storedFile = $this->uploadFormFile($file, 'economist-uploads', ['xlsx', 'csv']);
        EconomistUpload::query()
            ->where('organization_id', $organizationId)
            ->where('type', $data['type'])
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->update(['status' => UploadStatusEnum::RELOADED->value]);

        $uploadFile = EconomistUpload::query()->create([
            'organization_id' => $organizationId,
            'user_id' => $user->id,
            'type' => $data['type'],
            'file' => $storedFile,
            'year' => $data['year'],
            'month' => $data['month'],
            'done' => 2,
        ]);

        DB::beginTransaction();

        try {
            $this->dispatchUploadJob($data['type'], $organizationId, $data['year'], $data['month'], $uploadFile);
            DB::commit();
        } catch (Exception $exception) {
            DB::rollBack();
            $uploadFile->update(['done' => 1]);
            throw $exception;
        }
    }

    public function confirm(array $data): void
    {
        $confirmed = EconomistUpload::query()
            ->where('organization_id', $data['organization_id'])
            ->where('type', $data['type'])
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->latest('id')
            ->first();

        if (!$confirmed) {
            throw EconomistUploadServiceException::uploadedFileNotFound(trans('messages.not_found'));
        }

        $confirmed->update(['status' => UploadStatusEnum::SUCCESS->value]);
    }

    private function dispatchUploadJob(int $type, int $organizationId, int $year, int $month, EconomistUpload $uploadFile): void
    {
        switch ($type) {
            case UploadTypeEnum::ONE->value:
                Statement::query()
                    ->where('organization_id', $organizationId)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->forceDelete();
                StatementUploadJob::dispatch($uploadFile, $organizationId);
                break;

            case UploadTypeEnum::TWO->value:
                TaxFourApplication::query()
                    ->where('organization_id', $organizationId)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->forceDelete();
                TaxFourUploadJob::dispatch($uploadFile, $organizationId);
                break;

            case UploadTypeEnum::THREE->value:
                TaxFiveApplication::query()
                    ->where('organization_id', $organizationId)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->forceDelete();
                TaxFiveUploadJob::dispatch($uploadFile, $organizationId);
                break;

            case UploadTypeEnum::FOUR->value:
                PensionPayment::query()
                    ->where('organization_id', $organizationId)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->forceDelete();
                PensionPaymentUploadJob::dispatch($uploadFile, $organizationId);
                break;
        }
    }
}
