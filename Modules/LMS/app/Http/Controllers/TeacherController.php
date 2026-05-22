<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\LearningCenterUser;
use Modules\LMS\Models\Teacher;
use Modules\LMS\Transformers\TeacherListResource;

class TeacherController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Teacher::query()
            ->whereHas('subjects', function ($query) {
                $learningCenterIds = LearningCenterUser::query()
                    ->where('user_id', auth()->id())
                    ->pluck('learning_center_id');

                $query->whereIn('teacher_subjects.learning_center_id', $learningCenterIds);
            })
            ->with(['worker', 'subjects', 'learning_center'])
            ->paginate($per_page);

        $data = PaginateResource::make($data, TeacherListResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'worker_id' => 'required',
            'learning_center_id' => 'required',
        ]);

        $teacher = Teacher::query()
            ->updateOrCreate([
                'learning_center_id' => $validated['learning_center_id'],
                'worker_id' => $validated['worker_id']
            ]);

        if ($request->subjects) {
            $learningCenterId = $request->learning_center_id;
            $syncData = collect($request->subjects)
                ->mapWithKeys(function ($subjectId) use ($learningCenterId) {
                    return [
                        $subjectId => ['learning_center_id' => $learningCenterId]
                    ];
                })->toArray();

            $teacher->subjects()->sync($syncData);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy(Teacher $teacher): JsonResponse
    {
        $teacher->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
