<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\Exam\Enums\ResultDownloadTypeEnum;
use Modules\Exam\Enums\TopicFileEnum;
use Modules\Exam\Enums\TopicTypeEnum;
use Modules\Exam\Models\Topic;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionResource;
use Modules\Structure\Models\Position;
use Modules\Structure\Transformers\Position\PositionMinimalResource;

class ExamService
{
    public function enums($user): array
    {
        return [
            'topic_types' => $user->hasPermissionTo('mbm-topics') ? TopicTypeEnum::list() : TopicTypeEnum::listForExamination(),
            'topic_whom' => ExamWhomEnum::list(),
            'topic_file_types' => TopicFileEnum::list(),
            'result_types' => ResultDownloadTypeEnum::list(),
        ];
    }

    public function positions(int $topicId)
    {
        $positionIds = WorkerPosition::query()
            ->whereIn('organization_id', $this->organizationIdsForTopic($topicId))
            ->distinct()
            ->select('position_id');

        return PositionMinimalResource::collection(
            Position::query()->whereIn('id', $positionIds)->get()
        );
    }

    public function workers(int $topicId, int $perPage)
    {
        $data = WorkerPosition::query()
            ->whereIn('organization_id', $this->organizationIdsForTopic($topicId))
            ->select(
                'id',
                'uuid',
                'position_id',
                'position_date',
                'worker_id',
                'organization_id',
                'department_id',
                'group',
                'rate',
                'rank',
                'type',
                'salary'
            )
            ->search()
            ->with([
                'department:id,name,level',
                'organization:id,name,name_en,name_ru,group',
                'position:id,name',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo',
            ])
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->paginate($perPage);

        return PaginateResource::make($data, WorkerPositionResource::class);
    }

    private function organizationIdsForTopic(int $topicId): array
    {
        return Topic::query()
            ->findOrFail($topicId)
            ->organizations()
            ->pluck('organizations.id')
            ->all();
    }
}
