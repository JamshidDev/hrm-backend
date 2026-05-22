<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Requests\TopicQuestion\StoreTopicQuestionRequest;
use Modules\Exam\Http\Requests\TopicQuestion\UpdateTopicQuestionRequest;
use Modules\Exam\Services\TopicQuestionService;

class TopicQuestionController extends Controller
{
    public function __construct(
        private readonly TopicQuestionService $topicQuestionService,
    ) {
    }

    public function index($categoryId): JsonResponse
    {
        return Helper::response(true, $this->topicQuestionService->index((int) $categoryId, request('per_page', 10)));
    }

    public function show($categoryId, $questionId): JsonResponse
    {
        return Helper::response(true, $this->topicQuestionService->show((int) $questionId));
    }

    public function store($categoryId, StoreTopicQuestionRequest $request): JsonResponse
    {
        $this->topicQuestionService->store((int) $categoryId, $request->validated());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update($categoryId, UpdateTopicQuestionRequest $request, $quesId): JsonResponse
    {
        $this->topicQuestionService->update((int) $categoryId, (int) $quesId, $request->validated());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy($categoryId, $quesId): JsonResponse
    {
        $this->topicQuestionService->destroy((int) $quesId);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
