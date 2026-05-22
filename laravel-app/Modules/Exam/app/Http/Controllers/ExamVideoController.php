<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Requests\ExamVideo\FinishExamVideoRequest;
use Modules\Exam\Http\Requests\ExamVideo\StartExamVideoRequest;
use Modules\Exam\Services\ExamVideoService;

class ExamVideoController extends Controller
{
    public function __construct(
        private readonly ExamVideoService $examVideoService,
    ) {
    }

    public function start(StartExamVideoRequest $request): JsonResponse
    {
        return Helper::response('Session started', $this->examVideoService->start((int) $request->worker_exam_id));
    }

    public function finish(FinishExamVideoRequest $request): JsonResponse
    {
        $this->examVideoService->finish((int) $request->worker_exam_id);

        return Helper::response('Merging started');
    }

    public function show($workerExamId): JsonResponse
    {
        return Helper::response(true, $this->examVideoService->show((int) $workerExamId));
    }
}
