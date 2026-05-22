<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Confirmation\Transformers\DocumentViewResource;
use Modules\Exam\Services\ExamResultService;

class DocumentViewController extends Controller
{
    public function __construct(
        private readonly ExamResultService $examResultService,
    ) {
    }
    public function show($model, $uuid): JsonResponse
    {
        if (!Str::isUuid($uuid)) {
            return Helper::response(trans('messages.not_found'), [], 400);
        }
        $model = trim($model);
        if ($model === 'worker-exams') {
            return Helper::response(true, [
                'file' => $this->examResultService->publicExamResult((string) $uuid),
            ]);
        }

        $modelType = ModelTypeEnum::tryFrom($model)->model();
        if (!$modelType) {
            return Helper::response(trans('messages.not_found'), [], 400);
        }

        $document = $modelType::whereUuid($uuid)
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->with(['files', 'confirmations'])
            ->first();

        if (!$document) {
            return Helper::response(trans('messages.not_found'), [], 400);
        }

        $document = new DocumentViewResource($document);
        return Helper::response(true, $document);
    }

}
