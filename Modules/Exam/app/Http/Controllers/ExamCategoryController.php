<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Requests\ExamCategory\StoreExamCategoryRequest;
use Modules\Exam\Http\Requests\ExamCategory\UpdateExamCategoryRequest;
use Modules\Exam\Services\ExamCategoryService;

class ExamCategoryController extends Controller
{
    public function __construct(
        private readonly ExamCategoryService $examCategoryService,
    ) {
    }

    public function index(): JsonResponse
    {
        return Helper::response(true, $this->examCategoryService->index(auth()->user(), request()->all()));
    }

    public function store(StoreExamCategoryRequest $request): JsonResponse
    {
        $this->examCategoryService->store($request->validated(), auth()->user());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(UpdateExamCategoryRequest $request, $examCategory): JsonResponse
    {
        $this->examCategoryService->update((int) $examCategory, $request->validated());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($examCategory): JsonResponse
    {
        $this->examCategoryService->destroy((int) $examCategory);

        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function clear($examCategory): JsonResponse
    {
        $this->examCategoryService->clear((int) $examCategory);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
