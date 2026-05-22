<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Controllers\Concerns\HandlesExamServiceExceptions;
use Modules\Exam\Http\Requests\TopicExam\StoreExamRequest;
use Modules\Exam\Http\Requests\TopicExam\UpdateExamRequest;
use Modules\Exam\Models\Exam;
use Modules\Exam\Services\TopicExamService;

class TopicExamController extends Controller
{
    use HandlesExamServiceExceptions;

    public function __construct(
        private readonly TopicExamService $topicExamService,
    ) {
    }

    public function index($topicId): JsonResponse
    {
        return Helper::response(true, $this->topicExamService->index((int) $topicId, request('per_page', 10)));
    }

    public function exams(): JsonResponse
    {
        return Helper::response(true, $this->topicExamService->exams(
            array_filter(explode(',', (string) request('topics'))),
            request('per_page', 10)
        ));
    }

    public function solved_workers($examId): JsonResponse
    {
        return Helper::response(true, $this->topicExamService->solvedWorkers((int) $examId, request('per_page', 10)));
    }

    public function show($topicId, Exam $exam): JsonResponse
    {
        return Helper::response(true, $this->topicExamService->show($exam));
    }

    public function store($topicId, StoreExamRequest $request): JsonResponse
    {
        $this->topicExamService->store((int) $topicId, $request->validated(), auth()->user());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update($topicId, UpdateExamRequest $request, Exam $exam): JsonResponse
    {
        $this->topicExamService->update((int) $topicId, $exam, $request->validated(), auth()->user());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($topicId, Exam $exam): JsonResponse
    {
        $this->topicExamService->destroy($exam);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
