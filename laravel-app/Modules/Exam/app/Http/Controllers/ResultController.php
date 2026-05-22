<?php

namespace Modules\Exam\Http\Controllers;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Exam\Http\Controllers\Concerns\HandlesExamServiceExceptions;
use Modules\Exam\Http\Requests\Result\DownloadResultRequest;
use Modules\Exam\Http\Requests\Result\SendToConfirmationsRequest;
use Modules\Exam\Services\ExamResultService;

class ResultController extends Controller
{
    use HandlesExamServiceExceptions;

    public function __construct(
        private readonly ExamResultService $examResultService,
    ) {
    }

    public function index(): JsonResponse
    {
        return Helper::response(true, $this->examResultService->index(
            auth()->user()->load('roles.permissions'),
            request('per_page', 10)
        ));
    }

    public function checkEndedResults(): JsonResponse
    {
        $this->examResultService->checkEndedResults();
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function downloadResults(Request $request): JsonResponse
    {
        $this->examResultService->queueResultsExport($request->all(), auth()->user(), ExportTaskEnum::EXAM_RESULTS->value);
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function downloadNotPassedWorkers(Request $request): JsonResponse
    {
        $this->examResultService->queueResultsExport($request->all(), auth()->user(), ExportTaskEnum::NOT_PASSED_EXAM_WORKERS->value);
        return Helper::response(trans('messages.successfully_exported'));
    }

    public function sendToConfirmations(SendToConfirmationsRequest $request, $workerExamId): JsonResponse
    {
        $this->examResultService->sendToConfirmations((int) $workerExamId, $request->confirmations, (int) $request->director);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function showConfirmations($workerExamId): JsonResponse
    {
        return Helper::response(true, $this->examResultService->showConfirmations((int) $workerExamId));
    }

    public function downloadResult($workerExamId, DownloadResultRequest $request): JsonResponse
    {
        return Helper::response(true, [
            'file' => $this->examResultService->downloadResult((int) $workerExamId, $request->type),
        ]);
    }

    public function publicExamResult($uuid): JsonResponse
    {
        return Helper::response(true, [
            'file' => $this->examResultService->publicExamResult((string) $uuid),
        ]);
    }

    public function showExamResults($uuid): JsonResponse
    {
        return Helper::response(true, $this->examResultService->showExamResults((string) $uuid));
    }
}
