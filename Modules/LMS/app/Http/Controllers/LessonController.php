<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\LMS\Models\EduPlan;
use Modules\LMS\Models\Lesson;
use Modules\LMS\Transformers\EduPlanExamMinResource;
use Modules\LMS\Transformers\TeacherResource;

class LessonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'learning_center_id' => 'required',
            'start_date'         => 'required|date',
            'end_date'           => 'required|date|after_or_equal:start_date',
        ]);

        $lessons = Lesson::query()
            ->with([
                'group',
                'subject',
                'teacher.worker:id,last_name,first_name,middle_name,photo',
                'exam.exam:id,name'
            ])
            ->where('learning_center_id', $request->learning_center_id)
            ->whereBetween('lesson_date', [$request->start_date, $request->end_date])
            ->orderBy('lesson_date')
            ->orderBy('start_time')
            ->get();

        $calendarData = $lessons->groupBy('lesson_date')
            ->map(function ($dayLessons, $date) {
                return [
                    'lesson_date' => $date,
                    'lessons' => $dayLessons->map(function ($lesson) {
                        return [
                            'id' => $lesson->id,
                            'name' => $lesson->name,
                            'group' => $lesson->group?->code,
                            'subject' => $lesson->subject?->name,
                            'teacher' => new TeacherResource($lesson->teacher),
                            'start_time' => $lesson->start_time,
                            'end_time' => $lesson->end_time,
                            'exam' => $lesson->exam ? new EduPlanExamMinResource($lesson->exam) : null
                        ];
                    })->values()
                ];
            })->values();

        return Helper::response(true, $calendarData);
    }

    public function store(Request $request): ?JsonResponse
    {
        $validated = $request->validate([
            'learning_center_id' => 'required',
            'lesson_date' => 'required',
            'edu_plan_id' => 'required',
            'group_id' => 'required',
            'subject_id' => 'required',
            'teacher_id' => 'required',
            'name' => 'required|sometimes',
            'name_en' => 'required|sometimes',
            'name_ru' => 'required|sometimes',
            'start_time' => 'required',
            'end_time' => 'required'
        ]);

        $eduPlan = EduPlan::findOrFail($request->edu_plan_id);

        $duration = Carbon::parse($request->start_time)
                ->diffInMinutes(Carbon::parse($request->end_time)) / 60;

        $totalHours = Lesson::where('edu_plan_id', 1)
            ->sum(DB::raw('TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 3600'));

        if (($totalHours + $duration) > $eduPlan->hours) {
            return Helper::response(trans('messages.lms.lesson.edu_plan_hours_exceeded'), [], 422);
        }

        $existLessons = Lesson::query()
            ->whereDate('lesson_date', $validated['lesson_date'])
            ->whereTime('start_time', '<=', $validated['start_time'])
            ->whereTime('end_time', '>=', $validated['start_time'])
            ->get();

        foreach ($existLessons as $existLesson) {
            if ($existLesson->teacher_id === $validated['teacher_id']) {
                return Helper::response(trans('messages.lms.lesson.already_teacher'), [], 400);
            }
            if ($existLesson->group_id === $validated['group_id']) {
                return Helper::response(trans('messages.lms.lesson.already_group'), [], 400);
            }
        }

        Lesson::create($validated);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy(Lesson $lesson): JsonResponse
    {
        $lesson->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
