<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Exam\Http\Controllers\Concerns\HandlesExamServiceExceptions;
use Modules\Exam\Http\Requests\WorkerExam\SendResultRequest;
use Modules\Exam\Services\WorkerExamService;

class WorkerExamController extends Controller
{
    use HandlesExamServiceExceptions;

    public function __construct(
        private readonly WorkerExamService $workerExamService,
    ) {
    }

    public function index(): JsonResponse
    {
        return Helper::response(true, $this->workerExamService->index(auth()->user(), request()->all()));
    }

    public function startExam(Request $request, $examId): ?JsonResponse
    {
        return Helper::response(true, $this->workerExamService->startExam($request, (int) $examId, auth()->user()));
    }

    public function sendResult($examId, SendResultRequest $request, $workerExamQuestionId): JsonResponse
    {
        $this->workerExamService->sendResult($request, (int) $workerExamQuestionId);

        return Helper::response(trans('messages.exam.result_updated_successfully'));
    }

    public function continueExam(Request $request, $workerExamId): JsonResponse
    {
        return Helper::response(true, $this->workerExamService->continueExam($request, (int) $workerExamId));
    }

    public function finishExam(Request $request, $workerExamId): JsonResponse
    {
        return Helper::response(
            trans('messages.exam.finished'),
            $this->workerExamService->finishExam($request, (int) $workerExamId)
        );
    }

    public function results($workerExamId): JsonResponse
    {
        return Helper::response(true, $this->workerExamService->results((int) $workerExamId));
    }

    public function destroy($workerExamId): JsonResponse
    {
        $this->workerExamService->destroy((int) $workerExamId);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
