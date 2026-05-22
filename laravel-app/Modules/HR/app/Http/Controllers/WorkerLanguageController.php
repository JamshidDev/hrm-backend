<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\WorkerLanguage\WorkerLanguageStoreRequest;
use Modules\HR\Http\Requests\WorkerLanguage\WorkerLanguageUpdateRequest;
use Modules\HR\Models\WorkerLanguage;
use Modules\HR\Services\WorkerLanguageService;
use Modules\HR\Transformers\Worker\WorkerLanguagesResource;

class WorkerLanguageController extends Controller
{
    public function __construct(
        private readonly WorkerLanguageService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $languages = WorkerLanguage::query()
            ->filter()
            ->get();
        $languages = WorkerLanguagesResource::collection($languages);
        return Helper::response(true, $languages);
    }

    public function store(WorkerLanguageStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(WorkerLanguageUpdateRequest $request, $workerLanguageId): JsonResponse
    {
        $workerLanguage = WorkerLanguage::query()->findOrFail($workerLanguageId);
        $this->service->update(
            $workerLanguage,
            $request->toDto($workerLanguage->worker_id)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($workerLanguageId): JsonResponse
    {
        $workerLanguage = WorkerLanguage::query()->findOrFail($workerLanguageId);
        $this->service->delete($workerLanguage);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
