<?php

namespace Modules\Exam\Services;

use App\Http\Resources\PaginateResource;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Models\WorkerExamQuestion;
use Modules\Exam\Services\Support\WorkerExamQuestionBuilderService;
use Modules\Exam\Transformers\ExamInfoResource;
use Modules\Exam\Transformers\TopicExamResource;
use Modules\Exam\Transformers\WorkerExamQuestionsResource;
use Modules\Exam\Transformers\WorkerExamResultResource;

readonly class WorkerExamService
{
    public function __construct(
        private WorkerExamQuestionBuilderService $questionBuilderService,
    )
    {
    }

    public function index($user, $filters)
    {
        $exams = Exam::query()
            ->with([
                'results' => fn($query) => $query->where('worker_id', $user->worker_id),
                'topic:id,name,type',
            ])
            ->filter($user, $filters)
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make($exams, TopicExamResource::class);
    }

    public function startExam($request, int $examId, $user): array
    {
        return DB::transaction(function () use ($request, $examId, $user) {
            $exam = Exam::query()
                ->with('exam_tests:id,exam_id,exam_category_id,count')
                ->findOrFail($examId);

            $workerStartedExams = WorkerExam::query()
                ->where('worker_id', $user->worker_id)
                ->where('exam_id', $examId)
                ->whereNotNull('created')
                ->whereNull('ended')
                ->exists();

            if ($workerStartedExams) {
                throw ExamServiceException::badRequest(trans('messages.exam.created'));
            }

            $activeToken = Str::random(60);
            $startedExam = WorkerExam::query()->create([
                'exam_id' => $examId,
                'topic_id' => $exam->topic_id,
                'user_id' => $user->id,
                'worker_id' => $user->worker_id,
                'created' => now(),
                'user_agent' => $request->header('User-Agent'),
                'ip_address' => $request->ip(),
                'active_token' => $activeToken,
            ]);

            $questions = $this->buildQuestionPayloads(
                $this->questionBuilderService->buildForExam($exam),
                $startedExam->id,
                $user->worker_id,
                $user->id,
            );

            WorkerExamQuestion::query()->insert($questions);

            return [
                'worker_exam_details' => new WorkerExamResultResource($startedExam->load('user')),
                'exam' => new ExamInfoResource($exam),
                'questions' => WorkerExamQuestionsResource::collection(
                    WorkerExamQuestion::query()
                        ->where('worker_id', $user->worker_id)
                        ->where('worker_exam_id', $startedExam->id)
                        ->get()
                ),
                'active_token' => $activeToken,
            ];
        });
    }

    public function sendResult($request, int $workerExamQuestionId)
    {
        $workerExamQuestion = WorkerExamQuestion::query()
            ->with('worker_exam.exam')
            ->findOrFail($workerExamQuestionId);

        $this->assertActiveToken($workerExamQuestion->worker_exam, $request->header('active_token'));
        $this->assertExamNotExpired($workerExamQuestion->worker_exam);

        $answer = collect(json_decode($workerExamQuestion->answers, false, 512, JSON_THROW_ON_ERROR))
            ->firstWhere('is_correct', 1);

        $workerExamQuestion->update([
            'result' => $request->result,
            'is_correct' => $request->result === $answer?->id,
        ]);
    }

    public function continueExam($request, int $workerExamId): array
    {
        $workerExam = WorkerExam::query()->with(['questions', 'exam', 'user.worker'])->findOrFail($workerExamId);
        $this->assertActiveToken($workerExam, $request->header('active_token'));

        return [
            'worker_exam_details' => new WorkerExamResultResource($workerExam),
            'exam' => new ExamInfoResource($workerExam->exam),
            'questions' => WorkerExamQuestionsResource::collection($workerExam->questions),
        ];
    }

    public function finishExam($request, int $workerExamId): WorkerExamResultResource
    {
        $workerExam = WorkerExam::query()->with('questions')->findOrFail($workerExamId);
        $this->assertActiveToken($workerExam, $request->header('active_token'));

        $result = $workerExam->questions->where('is_correct', 1)->count();
        $workerExam->update([
            'ended' => now(),
            'result' => $result,
        ]);

        return new WorkerExamResultResource($workerExam->load('user'));
    }

    public function results(int $workerExamId)
    {
        $workerExam = WorkerExam::query()->with('questions')->findOrFail($workerExamId);
        if (!$workerExam->ended) {
            throw ExamServiceException::badRequest(trans('messages.exam.exam_not_ended'));
        }

        return WorkerExamQuestionsResource::collection($workerExam->questions->where('is_correct', 0));
    }

    public function destroy(int $workerExamId): void
    {
        $workerExam = WorkerExam::query()->findOrFail($workerExamId);
        if (!$workerExam->ended) {
            throw ExamServiceException::badRequest(trans('messages.exam.exam_not_ended'));
        }

        $workerExam->delete();
    }

    private function assertActiveToken($workerExam, ?string $activeToken): void
    {
        if ($workerExam->active_token !== $activeToken) {
            throw ExamServiceException::forbidden(trans('messages.exam.access_from_another_device_is_prohibited'));
        }
    }

    private function assertExamNotExpired($workerExam): void
    {
        $created = Carbon::parse($workerExam->created)->addMinute($workerExam->exam->minute);
        if ($workerExam->ended || $created < now()) {
            throw ExamServiceException::badRequest(trans('messages.exam.this_exam_has_already_been_completed_or_expired'));
        }
    }

    private function buildQuestionPayloads(array $questions, int $workerExamId, int $workerId, int $userId): array
    {
        $now = now();

        return array_map(
            static fn($question) => [
                'worker_id' => $workerId,
                'user_id' => $userId,
                'worker_exam_id' => $workerExamId,
                'question' => $question->ques,
                'answers' => $question->options,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            $questions
        );
    }
}
