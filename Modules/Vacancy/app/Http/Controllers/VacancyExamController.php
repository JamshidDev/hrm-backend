<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vacancy\Services\VacancyExamService;

class VacancyExamController extends Controller
{
    public function __construct(
        public VacancyExamService $service
    )
    {
    }

    public function start(Request $request, $applicationId)
    {
        $request->validate([
            'vacancy_application_exam_id' => 'required'
        ]);
        return Helper::response(true, $this->service->startExam($request, $applicationId, $request->user()));
    }

    public function sendResult(Request $request, $applicationId, $applicationExamId, $questionId)
    {
        $this->service->sendResult($request, $questionId);
        return Helper::response(trans('messages.exam.result_updated_successfully'));
    }

    public function continue(Request $request, $applicationId, $applicationExamId): JsonResponse
    {
        return Helper::response(true, $this->service->continueExam($request, (int)$applicationExamId));
    }

    public function finish(Request $request, $applicationId, $applicationExamId): JsonResponse
    {
        return Helper::response(
            trans('messages.exam.finished'),
            $this->service->finishExam($request, $applicationId, (int)$applicationExamId)
        );
    }

    public function results($applicationId, $applicationExamId): JsonResponse
    {
        return Helper::response(true, $this->service->results((int)$applicationExamId));
    }
}
