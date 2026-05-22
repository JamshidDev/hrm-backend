<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\LMS\Enums\EduPlanTypeEnum;
use Modules\LMS\Enums\ExamTypeEnum;
use Modules\LMS\Enums\SerialTypeEnum;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\Group;
use Modules\LMS\Models\LearningCenterUser;
use Modules\LMS\Models\Specialization;
use Modules\LMS\Transformers\EduPlanListResource;
use Modules\LMS\Transformers\EduPlanMinimalResource;
use Modules\LMS\Transformers\GroupListResource;
use Modules\LMS\Transformers\SpecializationListResource;

class LMSController extends Controller
{
    public function enums(): JsonResponse
    {
        return Helper::response(true, [
            'edu_plan_types' => EduPlanTypeEnum::list(),
            'exam_types' => ExamTypeEnum::list(),
            'serials' => SerialTypeEnum::list(),
            'lesson_exam_types' => [
                [
                    'id' => ExamTypeEnum::THREE->value,
                    'name' => ExamTypeEnum::THREE->name,
                ]
            ],
        ]);
    }

    public function learningCenters(): JsonResponse
    {
        $learningCenters = LearningCenterUser::query()
            ->where('user_id', auth()->id())
            ->with(['learning_center'])->get()
            ->map(function ($learningCenter) {
                $learning_center = $learningCenter->learning_center;
                return [
                    'id' => $learning_center->id,
                    'name' => $learning_center->name,
                ];
            });

        return Helper::response(true, $learningCenters);
    }

    public function listDirections(): JsonResponse
    {
        return new DirectionController()->index();
    }

    public function listSpecializations(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Specialization::query()
            ->search()
            ->with('direction')
            ->paginate($per_page);

        $data = PaginateResource::make($data, SpecializationListResource::class);

        return Helper::response(true, $data);
    }

    public function listEduPlans(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $data = EduPlan::query()
            ->filter($user, request()->all())
            ->paginate($per_page);

        $data = PaginateResource::make($data, EduPlanMinimalResource::class);

        return Helper::response(true, $data);
    }

    public function listGroups(): JsonResponse
    {
        $data = Group::query()
            ->with('learning_center')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, GroupListResource::class);
        return Helper::response(true, $data);
    }
}
