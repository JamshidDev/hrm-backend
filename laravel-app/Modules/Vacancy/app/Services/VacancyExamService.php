<?php

namespace Modules\Vacancy\Services;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Modules\Exam\Exceptions\ExamServiceException;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Models\WorkerExamQuestion;
use Modules\Exam\Services\Support\WorkerExamQuestionBuilderService;
use Modules\Exam\Transformers\ExamInfoResource;
use Modules\Exam\Transformers\WorkerExamQuestionsResource;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Models\VacancyApplicationExam;
use Modules\HR\Models\VacancyApplicationExamQuestion;
use Modules\HR\Models\VacancyApplicationStatus;
use Modules\Vacancy\Transformers\VacancyApplicationExamResource;
use Modules\Vacancy\Transformers\VacancyApplicationExamResultResource;

class VacancyExamService
{
    public function __construct(
        public WorkerExamQuestionBuilderService $questionBuilderService,
    )
    {
    }

    public function startExam($request, $applicationId, $user): array
    {
        return DB::transaction(function () use ($request, $user, $applicationId) {

            $vacancyStartedExams = VacancyApplicationExam::query()->findOrFail($request->vacancy_application_exam_id);

            if ($vacancyStartedExams->exam_type) {
                throw new ExamServiceException(trans('messages.exam.exam_type_offline'), 403);
            }

            if ($vacancyStartedExams->created) {
                throw new ExamServiceException(trans('messages.exam.started'), 403);
            }

            $exam = Exam::query()
                ->with('exam_tests:id,exam_id,exam_category_id,count')
                ->findOrFail($vacancyStartedExams->exam_id);

            $questions = $this->buildQuestionPayloads(
                $this->questionBuilderService->buildForExam($exam),
                $vacancyStartedExams->id
            );

            VacancyApplicationExamQuestion::query()->insert($questions);

            $vacancyStartedExams->update([
                'created' => now()->format("Y-m-d H:i:s"),
                'user_agent' => $request->header('User-Agent'),
                'ip_address' => $request->ip()
            ]);

            $status = VacancyApplicationStatus::query()
                ->where('vacancy_application_id', $applicationId)
                ->where('type', VacancyLevelEnum::FIVE->value)
                ->first();

            $details = $status->details;
            $exams = $details['exams'] ?? [];
            $exams['created'] = now()->format("Y-m-d H:i:s");
            $details['exams'] = $exams;
            $status->details = $details;
            $status->save();


            return [
                'vacancy_exam_details' => new VacancyApplicationExamResource($vacancyStartedExams),
                'exam' => new ExamInfoResource($exam),
                'questions' => WorkerExamQuestionsResource::collection(
                    VacancyApplicationExamQuestion::query()
                        ->where('vacancy_application_exam_id', $vacancyStartedExams->id)
                        ->get()
                )
            ];
        });
    }

    private function buildQuestionPayloads(array $questions, int $workerStartedExamId): array
    {
        $now = now();

        return array_map(
            static fn($question) => [
                'vacancy_application_exam_id' => $workerStartedExamId,
                'question' => $question->ques,
                'answers' => $question->options,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            $questions
        );
    }

    public function sendResult($request, $applicationExamQuestionId): void
    {
        $question = VacancyApplicationExamQuestion::query()
            ->with('vacancyApplication.exam')
            ->findOrFail((int)$applicationExamQuestionId);

        $this->assertExamNotExpired($question->vacancyApplication);

        $answer = collect(json_decode($question->answers, false, 512, JSON_THROW_ON_ERROR))
            ->where('is_correct', 1)->first();

        $question->update([
            'result' => $request->result,
            'is_correct' => $request->result === $answer?->id,
        ]);
    }

    private function assertExamNotExpired($applicationExam): void
    {
        $created = Carbon::parse($applicationExam->created)->addMinute($applicationExam->exam->minute);
        if ($applicationExam->ended || $created < now()) {
            throw ExamServiceException::badRequest(trans('messages.exam.this_exam_has_already_been_completed_or_expired'));
        }
    }

    public function continueExam($request, int $applicationExamId): array
    {
        $applicationExam = VacancyApplicationExam::query()->with(['questions', 'exam'])->findOrFail($applicationExamId);

        return [
            'vacancy_exam_details' => new VacancyApplicationExamResource($applicationExam),
            'exam' => new ExamInfoResource($applicationExam->exam),
            'questions' => WorkerExamQuestionsResource::collection($applicationExam->questions),
        ];
    }

    public function finishExam($request, $applicationId, int $applicationExamId): VacancyApplicationExamResource
    {
        return DB::transaction(function () use ($request, $applicationId, $applicationExamId) {
            $applicationExam = VacancyApplicationExam::query()
                ->with('questions')
                ->findOrFail($applicationExamId);

            $result = $applicationExam->questions->where('is_correct', 1)->count();
            $endTime = now()->format("Y-m-d H:i:s");
            $applicationExam->update([
                'ended' => $endTime,
                'result' => $result,
            ]);

            $status = VacancyApplicationStatus::query()
                ->where('vacancy_application_id', $applicationId)
                ->where('type', VacancyLevelEnum::FIVE->value)
                ->first();

            $details = $status->details;
            $exams = $details['exams'] ?? [];
            $exams['ended'] = $endTime;
            $exams['result'] = $result;
            $details['exams'] = $exams;
            $status->details = $details;
            $status->save();

            return new VacancyApplicationExamResource($applicationExam);
        });

    }

    public function results(int $applicationExamId): AnonymousResourceCollection
    {
        $applicationExam = VacancyApplicationExam::query()->with('questions')->findOrFail($applicationExamId);
        if (!$applicationExam->ended) {
            throw ExamServiceException::badRequest(trans('messages.exam.exam_not_ended'));
        }
        return VacancyApplicationExamResultResource::collection($applicationExam->questions->where('is_correct', 0));
    }

}
