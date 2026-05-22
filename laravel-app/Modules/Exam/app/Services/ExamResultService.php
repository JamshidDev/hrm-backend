<?php

namespace Modules\Exam\Services;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Http\Resources\PaginateResource;
use App\Jobs\Exam\ExamExportToExcelJob;
use App\Jobs\Exam\NotPassedExamWorkersExportToExcelJob;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\WorkerExamConfirmation;
use Modules\Confirmation\Transformers\WorkerPositionResource;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Models\WorkerExamFile;
use Modules\Exam\Models\WorkerExamQuestion;
use Modules\Exam\Services\Support\ExamResultDocumentService;
use Modules\Exam\Transformers\ExamResultResource;
use Modules\Exam\Transformers\WorkerExamQuestionsResource;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Worker\WorkerMinimalResource;

readonly class ExamResultService
{
    public function __construct(
        private ExamResultDocumentService $documentService,
    ) {
    }

    public function index($user, int $perPage)
    {
        $workerExams = WorkerExam::query()
            ->with([
                'worker:id,first_name,last_name,middle_name,photo,pin',
                'exam',
                'topic',
                'worker.position:id,worker_id,organization_id',
            ])
            ->select('worker_exams.*')
            ->join('workers', 'workers.id', '=', 'worker_exams.worker_id')
            ->join('topics', 'topics.id', '=', 'worker_exams.topic_id')
            ->when(request('search'), function ($q) {
                $search = request('search');
                $q->whereRaw("CONCAT(workers.last_name,' ',workers.first_name,' ',workers.middle_name) ILIKE ?", ["%$search%"]);
            })
            ->when(request('topics'), fn($query) => $query->whereIn('worker_exams.topic_id', explode(',', request('topics'))))
            ->when(request('exams'), fn($query) => $query->whereIn('exam_id', explode(',', request('exams'))))
            ->orderByDesc('id');

        if ($user->hasPermissionTo('hr-workers')) {
            $workerExams->join('worker_positions', function ($join) use ($user) {
                $join->on('worker_positions.worker_id', '=', 'workers.id')
                    ->where('worker_positions.status', PositionStatusEnum::ACTIVE->value)
                    ->when(request('organizations'), fn($query) => $query->whereIn('worker_positions.organization_id', explode(',', request('organizations'))));
            });

            if ($user->allowedOrganizations()) {
                $workerExams->whereIn('worker_positions.organization_id', $user->allowedOrganizations());
            }
        } else {
            $workerExams->where('topics.user_id', $user->id);
        }

        if (!request()->has('deleted_at')) {
            $workerExams->whereNotNull('worker_exams.deleted_at')->withTrashed();
        }

        return PaginateResource::make($workerExams->paginate($perPage), ExamResultResource::class);
    }

    public function checkEndedResults(): void
    {
        $data = WorkerExam::query()
            ->whereNull('ended')
            ->with(['exam:id,minute', 'questions'])
            ->get();

        foreach ($data as $item) {
            if (!$item->exam) {
                continue;
            }
            $created = Carbon::parse($item->created)->addMinute($item->exam->minute);
            if ($created < now()) {
                $item->ended = $created;
                $item->result = $item->questions->where('is_correct', 1)->count();
                $item->save();
            }
        }
    }

    public function queueResultsExport(array $query, $user, int $type): void
    {
        $task = UserExportTask::create([
            'user_id' => $user->id,
            'type' => $type,
        ]);

        if ($type === ExportTaskEnum::EXAM_RESULTS->value) {
            ExamExportToExcelJob::dispatch($task, $query, $user);
            return;
        }

        NotPassedExamWorkersExportToExcelJob::dispatch($task, $query, $user);
    }

    public function sendToConfirmations(int $workerExamId, array $confirmationIds, int $directorId): void
    {
        $workerExam = WorkerExam::query()->findOrFail($workerExamId);
        $confirmations = WorkerPosition::query()
            ->whereIn('id', array_merge($confirmationIds, [$directorId]))
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->with(['department:id,name', 'position:id,name'])
            ->get();

        foreach ($confirmations as $item) {
            WorkerExamConfirmation::query()->updateOrCreate(
                [
                    'worker_exam_id' => $workerExam->id,
                    'worker_id' => $item->worker_id,
                ],
                [
                    'position' => PositionHelper::getShortPosition($item),
                    'type' => $item->id === $directorId ? 'd' : 's',
                ]
            );
        }
    }

    public function showConfirmations(int $workerExamId): Collection|\Illuminate\Support\Collection
    {
        return WorkerExamConfirmation::query()
            ->where('worker_exam_id', $workerExamId)
            ->with([
                'worker_position.department:id,name',
                'worker_position.position:id,name',
                'worker:id,first_name,last_name,middle_name,photo',
            ])
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'worker' => new WorkerMinimalResource($item->worker),
                'worker_position' => new WorkerPositionResource($item->worker_position),
            ]);
    }

    public function downloadResult(int $workerExamId, $type): string
    {
        return DB::transaction(function () use ($workerExamId, $type) {
            $workerExam = WorkerExam::query()
                ->with([
                    'worker',
                    'worker.position:id,organization_id,department_id,position_id,worker_id,position_date',
                    'worker.position.department:id,name,level',
                    'worker.position.position:id,name',
                    'worker.position.organization:id,name,name_en,name_ru,group,full_name,code',
                    'worker.universities.university:id,name',
                    'worker.universities.speciality:id,name',
                ])
                ->findOrFail($workerExamId);

            if (!$workerExam->ended || !$workerExam->created) {
                throw ExamServiceException::badRequest(trans('messages.exam.this_exam_has_not_yet_been_completed'));
            }

            return $this->documentService->createOrGetDocument($workerExam, $type);
        });
    }

    public function publicExamResult(string $uuid): string
    {
        return Helper::fileUrl($this->resolveResultFileByUuid($uuid)->confirmation_file);
    }

    public function showExamResults(string $uuid): AnonymousResourceCollection
    {
        return WorkerExamQuestionsResource::collection(
            WorkerExamQuestion::query()->where('worker_exam_id', $this->resolveResultFileByUuid($uuid)->worker_exam_id)->get()
        );
    }

    private function resolveResultFileByUuid(string $uuid): WorkerExamFile
    {
        if (!Str::isUuid($uuid)) {
            throw ExamServiceException::notFound(trans('messages.not_found'));
        }

        $doc = WorkerExamFile::query()->whereUuid($uuid)->first();
        if (!$doc) {
            throw ExamServiceException::notFound(trans('messages.not_found'));
        }

        return $doc;
    }
}
