<?php

namespace Modules\Confirmation\Services;

use App\Helpers\DocumentHelper;
use App\Helpers\Helper;
use App\Http\Resources\User\UserInfoResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Exceptions\DocumentServiceException;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Transformers\ConfirmationWorkersResource;
use Modules\Confirmation\Transformers\DocumentHistoryResource;

readonly class DocumentQueryService
{
    public function __construct(
        private DocumentContextResolverService $resolver,
    )
    {
    }

    public function show($request, $user): array
    {
        $modelContext = $this->resolver->resolveModelContext($request->model);
        $document = DocumentHelper::checkModel($request);

        if (!$document->file) {
            throw DocumentServiceException::documentNotFound(trans('messages.document.not_found'));
        }

        $types = ['s', 'w', 'd'];
        $confirmations = $document->confirmations
            ->sortBy('order')
            ->sortBy(fn($item) => array_search($item->type, $types, true));

        $confirmationResources = ConfirmationWorkersResource::collection($confirmations);
        $currentUserConfirmation = $confirmations->firstWhere('worker_id', $user->worker_id);
        $createdUser = $document->load('user.worker')->user;
        $url = Helper::fileUrl($document->confirmation_file);

        if ($currentUserConfirmation && $currentUserConfirmation->status === ConfirmationStatusEnum::PROCESS->value) {
            $currentUserConfirmation->status = ConfirmationStatusEnum::READ->value;
            $currentUserConfirmation->save();
        }

        return [
            'document' => [
                'file_name' => $document->uuid . '.pdf',
                'url' => $url,
                'doc_url' => Helper::documentSignedUrl($document->uuid, $request->model),
                'created' => $document->created_at,
                'generate' => $document->generate,
                'organization_id' => $document->organization_id,
                'user' => new UserInfoResource($createdUser),
                'confirmation' => [
                    'id' => $document->confirmation,
                    'name' => ConfirmationStatusEnum::tryFrom($document->confirmation)?->label(),
                ],
            ],
            'user' => new UserInfoResource($user),
            'signature' => [
                'current_user' => $currentUserConfirmation ? new ConfirmationWorkersResource($currentUserConfirmation) : null,
                'signature' => $currentUserConfirmation && $currentUserConfirmation->status !== ConfirmationStatusEnum::SUCCESS->value,
            ],
            'model' => [
                'id' => $request->model,
                'name' => $modelContext->label(),
            ],
            'histories' => $document->histories_count,
            'chats' => $document->chats_count,
            'files' => $document->files_count,
            'confirmations' => $confirmationResources,
        ];
    }

    public function history(string $model, mixed $documentId): AnonymousResourceCollection
    {
        $modelType = $this->resolver->resolveModelContext($model)->model();

        $histories = DocumentHistory::query()
            ->where('model_id', $documentId)
            ->where('model_type', $modelType)
            ->with(['user.worker:id,last_name,first_name,middle_name,photo'])
            ->get();

        return DocumentHistoryResource::collection($histories);
    }

    public function documentBase64(string $model, mixed $documentId): string
    {
        $modelContext = $this->resolver->resolveModelContext($model);
        $document = $this->resolver->resolveDocument($modelContext, $documentId);
        $file = Storage::disk('minio')->get($document->confirmation_file);

        if (!$file) {
            throw DocumentServiceException::documentNotFound(trans('messages.errors.document_file_not_found'));
        }

        return base64_encode($file);
    }
}
