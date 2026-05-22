<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Requests\Topic\StoreTopicRequest;
use Modules\Exam\Http\Requests\Topic\UpdateTopicRequest;
use Modules\Exam\Models\Topic;
use Modules\Exam\Services\TopicService;

class TopicController extends Controller
{
    public function __construct(
        private readonly TopicService $topicService,
    ) {
    }

    public function index(): JsonResponse
    {
        return Helper::response(true, $this->topicService->index(auth()->user(), request('per_page', 10)));
    }

    public function topics(): JsonResponse
    {
        return Helper::response(true, $this->topicService->topics(auth()->user(), request('per_page', 10)));
    }

    public function show(Topic $topic): JsonResponse
    {
        return Helper::response(true, $this->topicService->show($topic));
    }

    public function store(StoreTopicRequest $request): JsonResponse
    {
        $this->topicService->store($request->validated(), auth()->user());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(UpdateTopicRequest $request, Topic $topic): JsonResponse
    {
        $this->topicService->update($topic, $request->validated(), auth()->user());

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy(Topic $topic): JsonResponse
    {
        if (!$this->topicService->canDelete($topic)) {
            return Helper::response(false, trans('messages.exam.unable_to_delete_this_topic'));
        }

        $this->topicService->destroy($topic);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
