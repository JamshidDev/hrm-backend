<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserWorkerResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Transformers\WorkerPosition\WorkerPositionMinResource;
use Modules\LMS\Models\EduPlanWorker;
use Modules\LMS\Models\Lesson;
use Modules\LMS\Transformers\EduPlanWorkerResource;
use Modules\LMS\Transformers\GroupListResource;

class ListenerController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user()
            ->load([
                'worker:id,last_name,first_name,middle_name,photo',
                'worker.positions:id,organization_id,position_id,department_id,position_date',
                'worker.positions.department:id,name,level',
                'worker.positions.organization:id,name,full_name,code',
                'worker.positions.position:id,name',
            ]);
        $eduPlans = EduPlanWorker::query()
            ->where('worker_id', $user->worker_id)
            ->with([
                'learning_center',
                'edu_plan',
                'group:id,code',
            ])
            ->get();

        $lessons = Lesson::query()
            ->with([
                'group.learning_center',
                'subject'
            ])
            ->whereHas('group.workers', fn($query) => $query->where('worker_id', $user->id))
            ->orderBy('lesson_date')
            ->orderBy('start_time')
            ->limit(3)
            ->get()->map(function ($lesson) {
                return [
                    'id' => $lesson->id,
                    'name' => $lesson->name,
                    'group' => new GroupListResource($lesson->group),
                    'subject' => $lesson->subject?->name,
                    'start_time' => $lesson->start_time,
                    'end_time' => $lesson->end_time,
                ];
            });

        return Helper::response(true, [
            'edu_plans' => EduPlanWorkerResource::collection($eduPlans),
            'lessons' => $lessons,
            'user' => new UserWorkerResource($user),
            'positions' => WorkerPositionMinResource::collection($user->worker->positions),
        ]);
    }

}
