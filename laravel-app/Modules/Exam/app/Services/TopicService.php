<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Modules\Exam\Enums\TopicTypeEnum;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\Topic;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Transformers\TopicMinResource;
use Modules\Exam\Transformers\TopicOrganizationResource;
use Modules\Exam\Transformers\TopicResource;

class TopicService
{
    public function index($user, int $perPage, $filters = [])
    {
        return PaginateResource::make(
            Topic::query()
            ->filter($user)
                ->search()
                ->with(['organization'])
                ->withCount('exams')
                ->paginate($perPage),
            TopicResource::class
        );
    }

    public function topics($user, int $perPage)
    {
        return PaginateResource::make(
            Topic::query()
                ->search()
                ->whereHas('hasOrganizations', function ($query) use ($user) {
                    $query->where('organization_id', $user->organization_id);
                })
                ->paginate($perPage),
            TopicMinResource::class
        );
    }

    public function show(Topic $topic)
    {
        return new TopicOrganizationResource($topic->load('organizations'));
    }

    public function store(array $data, $user): void
    {
        $organizations = $data['organizations'];
        unset($data['organizations']);

        $data['organization_id'] = $user->organization_id;
        $data['user_id'] = $user->id;

        if (in_array($data['type'], [TopicTypeEnum::TWO->value, TopicTypeEnum::THREE->value])) {
            if (!$user->hasPermissionTo('mbm-topics')) {
                throw ExamServiceException::forbidden(trans('messages.exam.permission_topic_type'));
            }
        }

        $topic = Topic::query()->create($data);
        $topic->organizations()->sync($organizations);
    }

    public function update(Topic $topic, array $data, $user): void
    {
        $organizations = $data['organizations'];
        unset($data['organizations']);

        if (in_array($data['type'], [TopicTypeEnum::TWO->value, TopicTypeEnum::THREE->value])) {
            if (!$user->hasPermissionTo('mbm-topics')) {
                throw ExamServiceException::forbidden(trans('messages.exam.permission_topic_type'));
            }
        }

        $topic->update($data);
        $topic->organizations()->sync($organizations);
    }

    public function canDelete(Topic $topic): bool
    {
        if ($topic->exams()->exists()) {
            return false;
        }

        return !WorkerExam::query()->where('topic_id', $topic->id)->exists();
    }

    public function destroy(Topic $topic): void
    {
        $topic->delete();
    }
}
