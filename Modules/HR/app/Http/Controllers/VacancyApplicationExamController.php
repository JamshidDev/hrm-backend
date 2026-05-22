<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\HR\Services\VacancyApplicationExamService;

class VacancyApplicationExamController extends Controller
{
    public function __construct(
        protected VacancyApplicationExamService $service
    )
    {
    }

    public function attachExam(Request $request, $vacancyId, $applicationId)
    {
        $request->validate([
            'exam_id' => 'required'
        ]);
        $this->service->attachExam($request, $applicationId);
        return Helper::response(trans('messages.successfully_attached'));
    }

    public function detachExam(Request $request, $vacancyId, $applicationId)
    {
        $request->validate([
            'vacancy_exam_id' => 'required'
        ]);
        $this->service->detachExam($request, $applicationId);
        return Helper::response(trans('messages.successfully_detached'));
    }

    public function updateExam(Request $request, $vacancyId, $applicationId)
    {
        if ($request->exam_type) {
            $request->validate([
                'created' => 'nullable|required',
                'ended' => 'nullable|required',
                'result' => 'nullable|required'
            ]);
        } else {
            $request->validate([
                'exam_id' => 'nullable|required',
                'status' => 'nullable|required'
            ]);
        }

        $this->service->updateExam($request, $applicationId);
        return Helper::response(trans('messages.successfully_detached'));
    }
}
