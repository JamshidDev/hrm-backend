<?php

namespace Modules\Confirmation\Services;

use App\Helpers\ConvertHelper;
use App\Jobs\User\DocumentCountJob;
use App\Services\DocumentHistoryService;
use App\Services\SignatureService;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Confirmation\Enums\DocumentHistoryStatusEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;

readonly class DocumentConfirmationFlowService
{
    public function __construct(
        private SignatureService        $signatureService,
        private DocumentFinalizeService $documentFinalizeService,
    )
    {
    }

    public function reject($user, ModelTypeEnum $modelContext, $document, $confirmation, ?string $comment = null): void
    {
        defer(static fn() => DocumentHistoryService::store(
            $user,
            $modelContext->value,
            null,
            $modelContext->model(),
            $document,
            DocumentHistoryStatusEnum::REJECTED->value,
            $comment
        ));

        $confirmation->update(['status' => ConfirmationStatusEnum::REJECTED->value]);
        $document->update(['confirmation' => ConfirmationStatusEnum::REJECTED->value]);
    }

    public function approve($request, $user, ModelTypeEnum $modelContext, $document, $confirmation): array
    {
        $signature = $this->signatureService->signature(
            $request,
            $confirmation,
            $user,
            $modelContext->confirmationModelClass()
        );

        if (!($signature['success'] ?? false)) {
            return [
                'success' => false,
                'message' => $signature['message'] ?? trans('messages.server_error'),
            ];
        }

        DB::transaction(function () use ($request, $confirmation, $document, $user) {
            $confirmation->status = ConfirmationStatusEnum::SUCCESS->value;
            $confirmation->confirmation_type = $request->confirmation_type ?? ConfirmationTypeEnum::DIGITAL->value;
            $confirmation->save();

            $notConfirmed = $document
                ->confirmations
                ->where('id', '!=', $confirmation->id)
                ->where('status', '!=', ConfirmationStatusEnum::SUCCESS->value)
                ->count();

            if ($notConfirmed === 0) {
                $this->documentFinalizeService->confirmDocument(
                    $document,
                    $request->model,
                    $request->confirmation_id
                );
                DocumentCountJob::dispatch($user, $request->model)->afterCommit();
            }

            if ($notConfirmed && $request->model === ModelTypeEnum::WORKER_APPLICATION->value) {
                $this->documentFinalizeService->replaceDocumentSignature($document, $request->model, $confirmation->id);
            }
        });

        return [
            'success' => true,
            'message' => trans('messages.document.signed_successfully'),
        ];
    }
}
