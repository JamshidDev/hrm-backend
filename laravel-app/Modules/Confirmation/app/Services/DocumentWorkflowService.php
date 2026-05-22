<?php

namespace Modules\Confirmation\Services;

use App\Helpers\PositionHelper;
use App\Jobs\User\DocumentCountJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Exceptions\DocumentServiceException;
use Modules\HR\Models\WorkerPosition;

readonly class DocumentWorkflowService
{
    public function __construct(
        private DocumentContextResolverService $resolver,
        private DocumentFinalizeService        $documentFinalizeService,
    )
    {
    }

    public function updateDocument($request, $user): void
    {
        $modelContext = $this->resolver->resolveModelContext($request->model);
        $document = $this->resolver->resolveDocument($modelContext, $request->document_id, ['confirmations']);

        if ($document->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            throw DocumentServiceException::badRequest(trans('messages.document.already_signed'));
        }

        $document->confirmation = ConfirmationStatusEnum::SUCCESS->value;
        $workerIds = $document->confirmations->pluck('worker_id')->toArray();
        $model = $request->model;

        DB::transaction(function () use ($request, $document, $workerIds, $user, $model) {
            $this->documentFinalizeService->applyModelConfirmation($model, $document);

            if ($request->hasFile('file')) {
                $document->confirmation_file = Storage::disk(config('filesystems.default'))
                    ->put('documents/' . $model . '/' . $document->uuid . '.pdf', $request->file('file'));
            }

            $document->save();
            DocumentCountJob::dispatch($user, $model, $workerIds)->afterCommit();
        });
    }

    public function forwardConfirmation($request): void
    {
        $modelContext = $this->resolver->resolveModelContext($request->model);
        $confirmation = $this->resolver->resolveConfirmation($modelContext, $request->confirmation_id);

        if ($confirmation->type !== 'd') {
            throw DocumentServiceException::documentNotFound(trans('messages.document.not_found'));
        }

        $newType = $request->type === 'd' ? 'd' : 's';
        if ($request->type === 'd') {
            $confirmation->type = 's';
        }

        $newWorkerPosition = WorkerPosition::query()
            ->with(['department:id,name,level', 'position:id,name'])
            ->findOrFail($request->new_confirmation_id);

        $modelContext->confirmationModelClass()::create([
            'type' => $newType,
            $modelContext->foreignKey() => $confirmation->document_id,
            'worker_id' => $confirmation->worker_id,
            'position' => PositionHelper::getShortPosition($newWorkerPosition),
            'order' => $confirmation->order + 1,
        ]);

        if ($newType === 'd') {
            $relation = $modelContext->relation();
            $document = $confirmation->load($relation)->{$relation};
            $document->director_id = $request->new_confirmation_id;
            $document->save();
        }

        $confirmation->save();
    }
}
