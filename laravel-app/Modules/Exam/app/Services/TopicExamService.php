<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Illuminate\Support\Facades\DB;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\Exam\Enums\TopicTypeEnum;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\ExamTest;
use Modules\Exam\Models\Topic;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Transformers\ExamPositionResource;
use Modules\Exam\Transformers\ExamResource;
use Modules\Exam\Transformers\ExamResultMinResource;
use Modules\Exam\Transformers\ExamWithTopicResource;
use Modules\Exam\Transformers\ExamWorkerPositionResource;
use Modules\Exam\Transformers\ExamWorkerResource;
use Modules\HR\Models\WorkerPosition;

class TopicExamService
{
    public function index(int $topicId, int $perPage)
    {
        return PaginateResource::make(
            Exam::query()->where('topic_id', $topicId)->orderByDesc('id')->paginate($perPage),
            ExamResource::class
        );
    }

    public function exams(array $topicIds, int $perPage)
    {
        return PaginateResource::make(
            Exam::query()
                ->with('topic:id,name,type')
                ->when($topicIds, function ($query) use ($topicIds) {
                    $query->whereIn('topic_id', $topicIds);
                })
                ->orderByDesc('id')
                ->paginate($perPage),
            ExamWithTopicResource::class
        );
    }

    public function solvedWorkers(int $examId, int $perPage): array
    {
        $sub = DB::table('worker_exams')
            ->select(DB::raw('MAX(id) as id'))
            ->where('exam_id', $examId)
            ->groupBy('worker_id');

        $builder = DB::table(DB::raw("({$sub->toSql()}) as sub"))
            ->mergeBindings($sub)
            ->select('id');

        $paginatedIds = $builder->paginate($perPage);
        $ids = collect($paginatedIds->items())->pluck('id');
        $examRecords = WorkerExam::query()
            ->with(['worker:id,last_name,first_name,middle_name,photo'])
            ->whereIn('id', $ids)
            ->get();
        $orderedRecords = $ids->map(fn($id) => $examRecords->firstWhere('id', $id))->filter()->values();

        return [
            'current_page' => $paginatedIds->currentPage(),
            'per_page' => $paginatedIds->perPage(),
            'total' => $paginatedIds->total(),
            'data' => ExamResultMinResource::collection($orderedRecords),
        ];
    }

    public function show(Exam $exam): ExamWorkerResource|ExamWorkerPositionResource|ExamResource|ExamPositionResource
    {
        return match ($exam->whom) {
            ExamWhomEnum::TWO->value => new ExamPositionResource($exam->load('positions')),
            ExamWhomEnum::THREE->value => new ExamWorkerPositionResource($exam->load([
                'worker_positions.worker:id,last_name,first_name,middle_name,photo',
                'worker_positions.position:id,name',
                'worker_positions.organization:id,name',
                'worker_positions.department:id,name,level',
            ])),
            ExamWhomEnum::FIVE->value => new ExamWorkerResource($exam->load('workers')),
            default => new ExamResource($exam),
        };
    }

    public function store(int $topicId, array $data, $user): void
    {
        $data['organization_id'] = $user->organization_id;
        $data['topic_id'] = $topicId;
        $data['active'] = false;
        $data['user_id'] = $user->id;

        $topic = Topic::findOrFail($topicId);
        if (in_array($topic->type, [TopicTypeEnum::TWO->value, TopicTypeEnum::THREE->value])) {
            if (!$user->hasPermissionTo('mbm-topics')) {
                throw ExamServiceException::forbidden(trans('messages.exam.permission_topic_type'));
            }
        }

        $exam = Exam::query()->create($data);
        $this->syncWhom($data['whom_ids'] ?? [], $exam, (int)$data['whom']);
    }

    public function update(int $topicId, Exam $exam, array $data, $user): void
    {
        $data['topic_id'] = $topicId;
        $targetTestsCount = (int)($data['tests_count'] ?? $exam->tests_count);

        $topic = Topic::findOrFail($topicId);
        if (in_array($topic->type, [TopicTypeEnum::TWO->value, TopicTypeEnum::THREE->value])) {
            if (!$user->hasPermissionTo('mbm-topics')) {
                throw ExamServiceException::forbidden(trans('messages.exam.permission_topic_type'));
            }
        }

        if (($data['active'] ?? false) && $targetTestsCount > (int)ExamTest::query()->where('exam_id', $exam->id)->sum('count')) {
            throw ExamServiceException::badRequest(trans('messages.exam.the_number_of_tests_is_not_equal'));
        }

        $exam->update($data);
        $this->syncWhom($data['whom_ids'] ?? [], $exam, (int)($data['whom'] ?? $exam->whom));
    }

    public function destroy(Exam $exam): void
    {
        if (WorkerExam::query()->where('exam_id', $exam->id)->exists()) {
            throw ExamServiceException::badRequest(trans('messages.exam.unable_to_delete_this_exam'));
        }

        $exam->delete();
    }

    private function syncWhom(array $ids, Exam $exam, int $whom): void
    {
        if ($whom === ExamWhomEnum::TWO->value) {
            $exam->positions()->sync($ids);
            return;
        }

        if ($whom === ExamWhomEnum::THREE->value) {
            $pivotData = WorkerPosition::query()
                ->whereIn('id', $ids)
                ->get()
                ->mapWithKeys(fn($position) => [
                    $position->worker_id => [
                        'worker_id' => $position->worker_id,
                        'worker_position_id' => $position->id,
                    ],
                ])
                ->toArray();

            $exam->workers()->sync($pivotData);
            return;
        }

        if ($whom === ExamWhomEnum::FIVE->value) {
            $exam->workers()->sync($ids);
        }
    }
}
