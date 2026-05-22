<?php

use Illuminate\Support\Facades\Route;
use Modules\TimeSheet\Http\Controllers\TimeSheetController;
use Modules\TimeSheet\Http\Controllers\TimeSheetWorkerDepartmentController;
use Modules\TimeSheet\Http\Controllers\TimeSheetWorkerController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/timesheet')
    ->name('timesheet.')
    ->group(function () {
        Route::get('worker-departments', [TimeSheetWorkerDepartmentController::class, 'index']);
        Route::post('worker-departments/attach', [TimeSheetWorkerDepartmentController::class, 'attach']);
        Route::post('worker-departments/detach', [TimeSheetWorkerDepartmentController::class, 'detach']);

        Route::get('', [TimeSheetController::class, 'index']);
        Route::post('', [TimeSheetController::class, 'store']);
        Route::put('{timesheetId}', [TimeSheetController::class, 'update']);
        Route::delete('{timesheetId}', [TimeSheetController::class, 'store']);
        Route::post('{timesheetId}/accept', [TimeSheetController::class, 'accept']);

        Route::get('check-worker', [TimeSheetWorkerController::class, 'checkWorker']);

        Route::get('{timesheetId}/workers', [TimeSheetWorkerController::class, 'index']);
        Route::post('{timesheetId}/workers', [TimeSheetWorkerController::class, 'store']);
        Route::get('{timesheetId}/day-in-month', [TimeSheetWorkerController::class, 'dayInMonth']);

        Route::get('enums', [TimeSheetController::class, 'enums']);
        Route::get('departments', [TimeSheetController::class, 'departments']);

        Route::post('{timesheetId}/confirmations', [TimeSheetController::class, 'attachConfirmations']);
        Route::get('{timesheetId}/confirmations', [TimeSheetController::class, 'getConfirmations']);
        Route::delete('{timesheetId}/confirmations/{confirmationId}', [TimeSheetController::class, 'reattach']);
    });
