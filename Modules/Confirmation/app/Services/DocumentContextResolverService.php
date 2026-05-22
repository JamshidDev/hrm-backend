<?php

namespace Modules\Confirmation\Services;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Modules\Confirmation\Enums\ModelTypeEnum;

class DocumentContextResolverService
{
    public function resolveModelContext(string $model): ModelTypeEnum
    {
        $modelType = ModelTypeEnum::tryFrom($model);

        if (!$modelType) {
            throw new ModelNotFoundException(trans('messages.errors.model_not_found'));
        }

        return $modelType;
    }

    public function resolveDocument(ModelTypeEnum $modelContext, mixed $documentId, array $with = [])
    {
        return $modelContext->model()::with($with)->findOrFail($documentId);
    }

    public function resolveConfirmation(ModelTypeEnum $modelContext, mixed $confirmationId, array $with = [])
    {
        return $modelContext->confirmationModelClass()::with($with)->findOrFail($confirmationId);
    }

    public function resolveDocumentByConfirmation(ModelTypeEnum $modelContext, $confirmation, array $with = [])
    {
        $foreignKey = $modelContext->foreignKey();

        return $this->resolveDocument($modelContext, $confirmation->{$foreignKey}, $with);
    }
}
