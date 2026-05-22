<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Requests\TopicExamQuestion\AttachQuestionsRequest;
use Modules\Exam\Http\Requests\TopicExamQuestion\ImportQuestionsRequest;
use Modules\Exam\Http\Requests\TopicExamQuestion\PreviewQuestionsRequest;
use Modules\Exam\Services\TopicExamQuestionService;

class TopicExamQuestionController extends Controller
{
    public function __construct(
        private readonly TopicExamQuestionService $topicExamQuestionService,
    ) {
    }

    public function attachQuestion($topicId, $examId, AttachQuestionsRequest $request): ?JsonResponse
    {
        $this->topicExamQuestionService->attachQuestions((int) $examId, $request->validated('questions'));

        return Helper::response(trans('messages.successfully_attached'));
    }

    public function questions($topicId, $examId): ?JsonResponse
    {
        return Helper::response(true, $this->topicExamQuestionService->questions((int) $examId));
    }

    public function detachQuestion($topicId, $examId, $questionId): ?JsonResponse
    {
        $this->topicExamQuestionService->detachQuestion((int) $questionId);

        return Helper::response(trans('messages.successfully_detached'));
    }

    public function preview($categoryId, PreviewQuestionsRequest $request): JsonResponse
    {
        return response()->json($this->topicExamQuestionService->preview($request->file('file')));
    }

    public function import($categoryId, ImportQuestionsRequest $request): ?JsonResponse
    {
        $this->topicExamQuestionService->import(
            (int) $categoryId,
            $request->file('file'),
            json_decode($request->input('mapping'), true, 512, JSON_THROW_ON_ERROR),
            (int) $request->input('startRow', 1),
        );

        return Helper::response(trans('messages.successfully_exported'));
    }
}
