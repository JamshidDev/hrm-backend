<?php

namespace Modules\Exam\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Exam\Http\Controllers\Concerns\HandlesExamServiceExceptions;
use Modules\Exam\Http\Requests\TopicFile\StoreTopicFileRequest;
use Modules\Exam\Http\Requests\TopicFile\UpdateTopicFileRequest;
use Modules\Exam\Services\TopicFileService;

class TopicFileController extends Controller
{
    use HandlesExamServiceExceptions;

    public function __construct(
        private readonly TopicFileService $topicFileService,
    ) {
    }

    public function index($topicId): JsonResponse
    {
        return Helper::response(true, $this->topicFileService->index((int) $topicId));
    }

    public function store($topicId, StoreTopicFileRequest $request): JsonResponse
    {
        $this->topicFileService->store((int) $topicId, $request->file('file'), $request->active);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update($topicId, UpdateTopicFileRequest $request, $topicFile): JsonResponse
    {
        $this->topicFileService->update(
            (int) $topicId,
            (int) $topicFile,
            $request->active,
            $request->file('file')
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($topicId, $topicFileId): JsonResponse
    {
        $this->topicFileService->destroy((int) $topicFileId);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
