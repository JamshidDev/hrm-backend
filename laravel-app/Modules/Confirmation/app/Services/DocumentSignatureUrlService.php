<?php

namespace Modules\Confirmation\Services;

use App\Helpers\Helper;
use App\Models\SignatureUrl;
use Illuminate\Support\Str;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\HR\Transformers\Worker\WorkerInfoResource;

readonly class DocumentSignatureUrlService
{
    public function __construct(
        private DocumentContextResolverService $resolver,
        private DocumentFinalizeService        $documentFinalizeService,
    )
    {
    }

    public function generate(string $model, mixed $confirmationId): array
    {
        $modelContext = $this->resolver->resolveModelContext($model);
        $relationKey = $modelContext->relation();
        $confirmation = $this->resolver->resolveConfirmation($modelContext, $confirmationId, [$relationKey]);

        $token = Str::random(64);
        SignatureUrl::query()->updateOrCreate([
            'model' => $model,
            'confirmation_id' => $confirmationId,
        ], [
            'token' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(60 * 24),
        ]);

        return [
            'url' => config('app.url') . '/api/v1/document/signature?token=' . $token,
            'file' => Helper::fileUrl($confirmation->{$relationKey}->file),
        ];
    }

    public function signWithToken($data): array
    {
        $token = hash('sha256', (string)$data['token']);
        $record = SignatureUrl::query()
            ->where('token', $token)
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            return [
                'success' => false,
                'status' => 403,
                'message' => trans('messages.token_is_expired'),
            ];
        }

        $modelContext = $this->resolver->resolveModelContext($record->model);
        $relationKey = $modelContext->relation();
        $foreignKey = $modelContext->foreignKey();
        $confirmation = $this->resolver->resolveConfirmation($modelContext, $record->confirmation_id, [$relationKey, 'worker']);

        if (array_key_exists('status', $data) && $data['status'] === 'check') {
            return [
                'success' => true,
                'status' => 200,
                'data' => [
                    'url' => Helper::fileUrl($confirmation->{$relationKey}->confirmation_file),
                    'worker' => new WorkerInfoResource($confirmation->worker),
                    'position' => $confirmation->position,
                    'status' => $confirmation->status,
                ],
            ];
        }

        if ($confirmation->status === ConfirmationStatusEnum::SUCCESS->value) {
            return [
                'success' => false,
                'status' => 403,
                'message' => trans('messages.document.already_signed'),
            ];
        }

        $confirmation->confirmation_type = ConfirmationTypeEnum::BIOMETRIC->value;
        $confirmation->signature = $data['key'] ?? null;
        $confirmation->status = ConfirmationStatusEnum::SUCCESS->value;
        $confirmation->save();

        $notConfirmed = $modelContext->confirmationModelClass()::query()
            ->where($foreignKey, $confirmation->{$foreignKey})
            ->where('status', '!=', ConfirmationStatusEnum::SUCCESS->value)
            ->count();

        if ($notConfirmed === 0) {
            $this->documentFinalizeService->confirmDocument(
                $confirmation->{$relationKey},
                $record->model,
                $confirmation->id
            );
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => trans('messages.document.signed_successfully'),
        ];
    }
}
