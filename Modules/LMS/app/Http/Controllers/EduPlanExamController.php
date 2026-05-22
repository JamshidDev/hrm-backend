<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Exam\Enums\ExamWhomEnum;
use Modules\Exam\Models\Exam;
use Modules\Exam\Models\WorkerExam;
use Modules\Exam\Transformers\ExamResultResource;
use Modules\LMS\Models\EduPlanExam;
use Modules\LMS\Models\EduPlanWorker;
use Modules\LMS\Models\Lesson;
use Modules\LMS\Transformers\ExamResource;

class EduPlanExamController extends Controller
{
    public function exams(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $exams = Exam::query()
            ->with([
                'topic:id,name,type'
            ])
            ->where('whom', ExamWhomEnum::FOUR->value)
            ->whereHas('topic', function ($query) use ($user) {
                $query->where('organization_id', $user->organization_id);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $exams = PaginateResource::make($exams, ExamResource::class);

        return Helper::response(true, $exams);
    }

    public function attachExam(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required',
            'exam_id' => 'required',
        ]);

        $data = $request->all();

        if (!$request->lesson_id && !$request->edu_plan_id) {
            return Helper::response(false, trans('messages.lms.edu_plan_or_lesson_is_required'));
        }

        if ($request->lesson_id) {
            $eduPlanId = Lesson::findOrFail($request->lesson_id)->edu_plan_id;
        } else {
            $eduPlanId = $request->edu_plan_id;
        }
        $data['edu_plan_id'] = $eduPlanId;
        $attachedExams = EduPlanExam::query()
            ->where('edu_plan_id', $eduPlanId)
            ->where('type', $request->type)
            ->where('exam_id', $request->exam_id)
            ->when(request('lesson_id'), function ($query, $lessonId) {
                $query->where('lesson_id', $lessonId);
            })
            ->count();

        if ($attachedExams) {
            return Helper::response(false, trans('messages.lms.exam_already_attached'));
        }

        EduPlanExam::create($data);

        return Helper::response(true, trans('messages.successfully_attached'));
    }

    public function detachExam(Request $request, $eduPlanExamId): JsonResponse
    {
        EduPlanExam::findOrFail($eduPlanExamId)->delete();

        return Helper::response(true, trans('messages.successfully_detached'));
    }

    public function results(Request $request): JsonResponse
    {
        $per_page = request('per_page', 10);

        $workerExams = WorkerExam::query()
            ->with([
                'worker:id,first_name,last_name,middle_name,photo,pin',
                'exam',
                'topic',
                'worker.position:id,worker_id,organization_id'
            ])
            ->select('worker_exams.*')
            ->join('workers', 'workers.id', '=', 'worker_exams.worker_id')
            ->join('topics', 'topics.id', '=', 'worker_exams.topic_id')
            ->when(request('search'), function ($q) {
                $search = request('search');
                $q->whereRaw("CONCAT(workers.last_name,' ',workers.first_name,' ',workers.middle_name) ILIKE ?", ["%$search%"]);
            })
            ->when(request('topics'), function ($query) {
                $query->whereIn('worker_exams.topic_id', explode(',', request('topics')));
            })
            ->when(request('exams'), function ($query) {
                $query->whereIn('exam_id', explode(',', request('exams')));
            })
            ->orderByDesc('id');

        $data = PaginateResource::make($workerExams->paginate($per_page), ExamResultResource::class);

        return Helper::response(true, $data);
    }


}
