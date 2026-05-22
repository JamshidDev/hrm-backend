<?php

namespace Modules\HR\Services;

use Modules\Exam\Models\Exam;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\VacancyApplicationExam;
use Modules\HR\Models\VacancyApplicationStatus;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

class VacancyApplicationExamService
{
    public function attachExam($request, $applicationId): void
    {
        $applicationExam = VacancyApplicationExam::updateOrCreate(
            [
                'vacancy_application_id' => $applicationId,
                'exam_id' => $request->exam_id
            ]
        );
        $exam = Exam::query()->findOrFail($request->exam_id);
        $status = VacancyApplicationStatus::query()
            ->where('vacancy_application_id', $applicationId)
            ->where('type', VacancyLevelEnum::FIVE->value)
            ->first();

        if (!$status) {
            $status = VacancyApplicationStatus::create([
                'vacancy_application_id' => $applicationId,
                'type' => VacancyLevelEnum::FIVE->value,
                'status' => VacancySendStatusEnum::ONE->value
            ]);
        }

        $details = $status->details;
        $exams = $details['exams'] ?? [];
        $exams['vacancy_application_exam'] = $applicationExam->id;
        $exams['exam_name'] = $exam->name;
        $exams['exam_type'] = false;
        $exams['created'] = null;
        $exams['ended'] = null;
        $exams['result'] = null;
        $exams['status'] = false;
        $details['exams'] = $exams;
        $status->details = $details;
        $status->save();
    }

    public function detachExam($request, $applicationId): void
    {
        VacancyApplicationExam::query()->findOrFail($request->vacancy_exam_id)->delete();
        $status = VacancyApplicationStatus::query()
            ->where('vacancy_application_id', $applicationId)
            ->where('type', VacancyLevelEnum::FIVE->value)
            ->first();
        if ($status) {
            $details = $status->details;
            $details['exams'] = null;
            $status->details = $details;
            $status->save();
        }
    }

    public function updateExam($request, $applicationId): void
    {
        $status = VacancyApplicationStatus::query()
            ->where('vacancy_application_id', $applicationId)
            ->where('type', VacancyLevelEnum::FIVE->value)
            ->first();

        if (!$status) {
            $status = VacancyApplicationStatus::create([
                'vacancy_application_id' => $applicationId,
                'type' => VacancyLevelEnum::FIVE->value,
                'status' => VacancySendStatusEnum::ONE->value
            ]);
        }
        if ($request->exam_type) {
            $applicationExam = VacancyApplicationExam::updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'exam_id' => null,
                    'exam_type' => true
                ],
                [
                    'created' => $request->created,
                    'ended' => $request->ended,
                    'result' => $request->result,
                    'exam_type' => true
                ]
            );

            $details = $status->details;
            $exams = $details['exams'] ?? [];
            $exams['vacancy_application_exam'] = $applicationExam->id;
            $exams['exam_name'] = "Offlayn tarzda o'tqizildi";
            $exams['exam_type'] = true;
            $exams['created'] = $request->created;
            $exams['ended'] = $request->ended;
            $exams['result'] = $request->result;
            $details['exams'] = $exams;
            $status->details = $details;
            $status->save();
        } else {
            $applicationExam = VacancyApplicationExam::updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'exam_id' => $request->exam_id
                ]
            );
            $applicationExam->status = $request->status;
            $applicationExam->save();

            $details = $status->details;
            $exams = $details['exams'] ?? [];
            $exams['status'] = $request->status;
            $details['exams'] = $exams;
            $status->details = $details;
            $status->save();

        }
    }
}
