<?php

use App\Http\Controllers\ZoomController;
use Illuminate\Support\Facades\Route;
use Modules\LMS\Http\Controllers\DirectionController;
use Modules\LMS\Http\Controllers\EduPlanController;
use Modules\LMS\Http\Controllers\EduPlanExamController;
use Modules\LMS\Http\Controllers\GroupController;
use Modules\LMS\Http\Controllers\LessonController;
use Modules\LMS\Http\Controllers\LessonMeetController;
use Modules\LMS\Http\Controllers\ListenerController;
use Modules\LMS\Http\Controllers\ListenerLessonController;
use Modules\LMS\Http\Controllers\LMSController;
use Modules\LMS\Http\Controllers\SpecializationController;
use Modules\LMS\Http\Controllers\SubjectController;
use Modules\LMS\Http\Controllers\TeacherController;
use Modules\LMS\Http\Controllers\TeacherLessonController;
use Modules\LMS\Http\Controllers\LmsCertificateController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/lms')
    ->group(function () {
        Route::apiResource('directions', DirectionController::class);
        Route::apiResource('subjects', SubjectController::class);
        Route::resource('specializations', SpecializationController::class);
        Route::apiResource('edu-plan', EduPlanController::class);
        Route::apiResource('teachers', TeacherController::class);
        Route::apiResource('lessons', LessonController::class);
        Route::post('generate-groups', [GroupController::class, 'generateGroups']);
        Route::post('detach-workers-in-group', [GroupController::class, 'detachWorkersInGroups']);
        Route::get('enums', [LMSController::class, 'enums']);
        Route::get('learning-centers', [LMSController::class, 'learningCenters']);
        Route::get('groups', [GroupController::class, 'groups']);
        Route::get('group-workers', [GroupController::class, 'groupWorkers']);
        Route::get('protocol', [GroupController::class, 'protocol']);
        Route::get('worker-exams', [GroupController::class, 'workerExams']);

        //CERTIFICATES
        Route::get('certificates', [LmsCertificateController::class, 'certificates']);
        Route::delete('certificates/{id}', [LmsCertificateController::class, 'destroy']);

        //LIST
        Route::get('list/directions', [LMSController::class, 'listDirections']);
        Route::get('list/specializations', [LMSController::class, 'listSpecializations']);
        Route::get('list/edu-plans', [LMSController::class, 'listEduPlans']);
        Route::get('list/groups', [LMSController::class, 'listGroups']);

        Route::get('edu-plans/{eduPlanId}/attached-workers', [EduPlanController::class, 'attachedWorkersToEduPlan']);
        Route::post('edu-plans/{eduPlanId}/detach-workers', [EduPlanController::class, 'detachWorkerInEduPlan']);

        Route::get('lessons/{lesson}/show-participants', [LessonMeetController::class, 'showParticipants']);

        //TEACHERS
        Route::get('teacher/lessons', [TeacherLessonController::class, 'index']);
        Route::get('lessons/{lesson}/create-meet', [LessonMeetController::class, 'createZoomMeeting']);
        Route::get('exams', [EduPlanExamController::class, 'exams']);
        Route::post('exams/attach', [EduPlanExamController::class, 'attachExam']);
        Route::get('exams/result', [EduPlanExamController::class, 'results']);
        Route::get('exams/detach/{examId}', [EduPlanExamController::class, 'detachExam']);

        //LISTENERS
        Route::get('listener', [ListenerController::class, 'index']);
        Route::get('listener/lessons', [ListenerLessonController::class, 'index']);
        Route::get('listener/lessons/{lessonId}', [ListenerLessonController::class, 'startLesson']);


        //PROTOCOL
        Route::post('certificate/generate', [LmsCertificateController::class, 'generateCertificate']);
});

Route::post('v1/zoom/webhook', [ZoomController::class, 'callback']);
