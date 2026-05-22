<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\Lesson;
use Modules\LMS\Transformers\EduPlanExamMinResource;
use Modules\LMS\Transformers\LessonStartResource;

class ListenerLessonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start_date'         => 'required|date',
            'end_date'           => 'required|date|after_or_equal:start_date',
        ]);

        $user = auth()->user();
        $lessons = Lesson::query()
            ->with([
                'group',
                'subject',
                'exam.exam:id,name'
            ])
            ->whereHas('group.workers', fn($query) => $query->where('worker_id', $user->id))
            ->whereBetween('lesson_date', [$request->start_date, $request->end_date])
            ->orderBy('lesson_date')
            ->orderBy('start_time')
            ->get();

        // kalendar uchun formatlash
        $calendarData = $lessons
            ->groupBy('lesson_date')
            ->map(function ($dayLessons, $date) {
                return [
                    'lesson_date' => $date,
                    'lessons' => $dayLessons->map(function ($lesson) {
                        return [
                            'id' => $lesson->id,
                            'name' => $lesson->name,
                            'group' => $lesson->group?->code,
                            'subject' => $lesson->subject?->name,
                            'start_time' => $lesson->start_time,
                            'end_time' => $lesson->end_time,
                            'exam' => $lesson->exam ? new EduPlanExamMinResource($lesson->exam) : null
                        ];
                    })->values()
                ];
        })->values();

        return Helper::response(true, $calendarData);
    }

    public function startLesson(Request $request, $lessonId): JsonResponse
    {
        $lesson = Lesson::findOrFail($lessonId);
        $lesson = new LessonStartResource($lesson);
        return Helper::response(true, $lesson);
    }
}
