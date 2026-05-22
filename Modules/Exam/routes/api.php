<?php

use Illuminate\Support\Facades\Route;
use Modules\Exam\Http\Controllers\DashboardController;
use Modules\Exam\Http\Controllers\ExamCategoryController;
use Modules\Exam\Http\Controllers\ExamController;
use Modules\Exam\Http\Controllers\ExamVideoController;
use Modules\Exam\Http\Controllers\ResultController;
use Modules\Exam\Http\Controllers\TopicController;
use Modules\Exam\Http\Controllers\TopicExamController;
use Modules\Exam\Http\Controllers\TopicExamQuestionController;
use Modules\Exam\Http\Controllers\TopicFileController;
use Modules\Exam\Http\Controllers\TopicQuestionController;
use Modules\Exam\Http\Controllers\WorkerExamController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/exam')
    ->name('exam.')
    ->group(function () {
        $resources = [
            'topics' => TopicController::class,
            'topics/{topicId}/files' => TopicFileController::class,
            'categories' => ExamCategoryController::class,
            'topics/{topicId}/exams' => TopicExamController::class
        ];

        foreach ($resources as $resource => $controller) {
            Route::apiResource($resource, $controller);
        }

        Route::get('filter/exams', [TopicExamController::class, 'exams']);
        Route::get('filter/topics', [TopicController::class, 'topics']);
        Route::get('topics/{topicId}/exams/{examId}/solved-workers', [TopicExamController::class, 'solved_workers']);

        Route::post('topics/{topicId}/exams/{examId}/attach-question', [TopicExamQuestionController::class, 'attachQuestion']);
        Route::get('topics/{topicId}/exams/{examId}/attach-question', [TopicExamQuestionController::class, 'questions']);

        Route::resource('categories/{categoryId}/questions', TopicQuestionController::class);

        Route::post('categories/{categoryId}/excel-header', [TopicExamQuestionController::class, 'preview']);
        Route::post('categories/{categoryId}/import', [TopicExamQuestionController::class, 'import']);
        Route::get('categories/{categoryId}/clear', [ExamCategoryController::class, 'clear']);

        Route::get('topics/{topicId}/positions', [ExamController::class, 'positions']);
        Route::get('topics/{topicId}/workers', [ExamController::class, 'workers']);

        Route::get('worker-exams', [WorkerExamController::class, 'index']);
        Route::get('worker-exams/statistics', [DashboardController::class, 'workerStatistics']);
        Route::post('worker-exams/{examId}/start', [WorkerExamController::class, 'startExam']);
        Route::get('worker-exams/{examId}/continue', [WorkerExamController::class, 'continueExam']);
        Route::get('worker-exams/{examId}/finished', [WorkerExamController::class, 'finishExam']);
        Route::get('worker-exams/{examId}/result', [WorkerExamController::class, 'results']);
        Route::delete('worker-exams/{examId}', [WorkerExamController::class, 'destroy']);
        Route::post('worker-exams/{examId}/send-result/{questionId}', [WorkerExamController::class, 'sendResult']);

        Route::get('worker-exams-download/{workerExamId}', [ResultController::class, 'downloadResult']);
        Route::get('worker-exams-results/{uuid}', [ResultController::class, 'showExamResults'])->middleware('permission:document-view-exam-results');

        Route::post('worker-exams/start-video', [ExamVideoController::class, 'start']);
        Route::put('worker-exams/finish-video', [ExamVideoController::class, 'finish']);

        Route::get('results', [ResultController::class, 'index']);
        Route::post('results/send-confirmations/{workerExamId}', [ResultController::class, 'sendToConfirmations']);
        Route::get('results/send-confirmations/{workerExamId}', [ResultController::class, 'showConfirmations']);
        Route::get('results/worker-exam-videos/{workerExamId}', [ExamVideoController::class, 'show']);

        Route::get('results/export', [ResultController::class, 'downloadResults']);
        Route::get('not-passed-workers', [ResultController::class, 'downloadNotPassedWorkers']);
        Route::get('check-ended-results', [ResultController::class, 'checkEndedResults']);
        Route::get('enums', [ExamController::class, 'enums']);
    });


Route::get('v1/documents/exams/{uuid}', [ResultController::class, 'publicExamResult']);


