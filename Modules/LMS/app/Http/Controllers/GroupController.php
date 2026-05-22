<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Exam\Models\WorkerExam;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\EduPlanWorker;
use Modules\LMS\Models\Group;
use Modules\LMS\Models\LmsProtocol;
use Modules\LMS\Transformers\GroupListResource;
use Modules\LMS\Transformers\GroupWorkersResource;
use Modules\LMS\Transformers\ProtocolResource;
use Modules\LMS\Transformers\WorkerExamResource;

class GroupController extends Controller
{
    public function groups(Request $request): JsonResponse
    {
        $data = Group::query()
            ->where('edu_plan_id', $request->edu_plan_id)
            ->with('learning_center')
            ->withCount('workers')
            ->get();

        $data = GroupListResource::collection($data);
        return Helper::response(true, $data);
    }

    public function workerExams(): JsonResponse
    {
        $data = WorkerExam::query()
            ->where('worker_id', request('worker_id'))
            ->whereNotNull('ended')
            ->orderByDesc('id')
            ->whereHas('exam', function ($query) {
                $query->whereHas('topic');
            })
            ->with('exam.topic')
            ->paginate(request('per_page') ?? 10);

        $data = PaginateResource::make($data, WorkerExamResource::class);

        return Helper::response(true, $data);
    }

    public function groupWorkers(Request $request): JsonResponse
    {
        $data = EduPlanWorker::query()
            ->where('group_id', $request->group_id)
            ->with([
                'worker:id,last_name,first_name,middle_name,photo',
                'worker_position:id,organization_id,department_id,position_id',
                'worker_position.department:id,name,level',
                'worker_position.organization:id,name,full_name',
                'worker_position.position:id,name',
                'certificate'
            ])
            ->when(request('protocol_id'), function ($query) {
                $query->whereDoesntHave('certificate');
            })
            ->paginate($request->per_page ?? 10);

        $data = PaginateResource::make($data, GroupWorkersResource::class);
        return Helper::response(true, $data);
    }

    public function protocol(Request $request): JsonResponse
    {
        $list = LmsProtocol::query()
            ->where('group_id', $request->group_id)
            ->paginate(request('per_page') ?? 10);
        $data = PaginateResource::make($list, ProtocolResource::class);
        return Helper::response(true, $data);
    }

    public function generateGroups(Request $request): JsonResponse
    {
        $request->validate([
            'edu_plan_id' => 'required',
        ]);

        $eduPlan = EduPlan::query()->with([
            'workers', // bu aslida EduPlanWorker lar bilan relation
            'learning_center'
        ])->find($request->edu_plan_id);

        if (!$eduPlan) {
            return Helper::response(trans('messages.lms.edu_plan_not_found'), [], 400);
        }

        // Xodimlarni shuffle qilib olamiz
        $workers = $eduPlan->workers->shuffle();

        // Guruhlarni olish
        $groups = Group::query()
            ->where('edu_plan_id', $eduPlan->id)
            ->orderBy('id')
            ->get();

        if ($groups->isEmpty()) {
            // Agar guruhlar hali yaratilmagan bo‘lsa – yangi yaratamiz
            for ($i = 1; $i <= $eduPlan->count_groups; $i++) {
                $code = Group::query()
                    ->where('learning_center_id', $eduPlan->learning_center_id)
                    ->max('code');

                $groups->push(
                    Group::create([
                        'learning_center_id' => $eduPlan->learning_center_id,
                        'edu_plan_id'        => $eduPlan->id,
                        'code'               => $code + 1,
                        'name'               => 'M' . $eduPlan->learning_center?->code . " {$i}-guruh",
                    ])
                );
            }
        }

        // Allaqachon group_id olgan EduPlanWorker larni chiqarib tashlaymiz
        $alreadyAssignedIds = EduPlanWorker::query()
            ->where('edu_plan_id', $eduPlan->id)
            ->whereNotNull('group_id')
            ->pluck('worker_id')
            ->toArray();

        $workers = $workers->reject(fn($w) => in_array($w->id, $alreadyAssignedIds, true));

        // Endi bo‘sh xodimlarni guruhlarga taqsimlaymiz
        foreach ($groups as $group) {
            // Guruhda hozir nechta odam bor?
            $currentCount = EduPlanWorker::query()
                ->where('edu_plan_id', $eduPlan->id)
                ->where('group_id', $group->id)
                ->count();

            $needed = $eduPlan->count_workers - $currentCount;

            if ($needed > 0) {
                $toAssign = $workers->splice(0, $needed);

                foreach ($toAssign as $worker) {
                    EduPlanWorker::query()
                        ->where('edu_plan_id', $eduPlan->id)
                        ->where('worker_id', $worker->id)
                        ->update([
                            'group_id' => $group->id,
                        ]);
                }
            }
        }

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function detachWorkersInGroups(Request $request): JsonResponse
    {
        $request->validate([
            'group_id' => 'required',
            'worker_position_ids' => 'required|array',
        ]);

        return Helper::response(trans('messages.does_not_delete_related_item'), [], 400);

        EduPlanWorker::query()
            ->where('group_id', $request->group_id)
            ->whereIn('worker_position_id', $request->worker_position_ids)
            ->delete();

        return Helper::response(trans('messages.successfully_detached'));
    }
}
