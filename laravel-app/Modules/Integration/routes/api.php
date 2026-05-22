<?php

use Illuminate\Support\Facades\Route;
use Modules\HR\Http\Controllers\DepartmentController;
use Modules\HR\Http\Controllers\FilterController;
use Modules\HR\Http\Controllers\MedController;
use Modules\Integration\Http\Controllers\IntegrationController;
use Modules\Integration\Http\Controllers\KPIController;
use Modules\Integration\Http\Controllers\MobileFaceController;
use Modules\Integration\Http\Controllers\StationController;
use Modules\Integration\Http\Controllers\WorkerController;
use Modules\Structure\Http\Controllers\PositionController;
use Modules\Structure\Http\Controllers\StructureController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/integration')
    ->group(function () {
        Route::group([
            'middleware' => ['permission:integration', 'integration.log']
        ], function () {
            Route::get('workers', [IntegrationController::class, 'workers']);
            Route::post('workers/by-pins', [WorkerController::class, 'workers']);

            Route::get('dashboard', [IntegrationController::class, 'dashboard']);

            Route::get('structure', [StructureController::class, 'index']);
            Route::get('structure/{organizationId}/leaders', [StructureController::class, 'leaders']);
            Route::get('departments', [DepartmentController::class, 'departments']);
            Route::get('positions', [IntegrationController::class, 'positions']);
            Route::get('get-departments', [IntegrationController::class, 'getDepartmentsAll']);
            Route::get('get-positions', [FilterController::class, 'positions']);
            Route::get('enums', [IntegrationController::class, 'enums']);
            Route::get('kpi/report', [KPIController::class, 'report']);

            Route::get('meds', [MedController::class, 'index']);
            Route::get('workers/{id}/meds', [IntegrationController::class, 'meds']);
            Route::get('contracts', [IntegrationController::class, 'contracts']);
            Route::get('classifications/positions', [PositionController::class, 'index']);

            //STATION CODES
            Route::get('stations/{code}/workers', [StationController::class, 'index']);
            Route::get('stations/{code}/workers/{workerId}', [StationController::class, 'show']);
            Route::get('stations/{code}/workers/{workerId}/resume', [StationController::class, 'resume']);
            Route::get('stations/{code}/stats', [StationController::class, 'stats']);

            //TODO
            Route::get('worker-by-pin', [IntegrationController::class, 'workerByPin']);
            Route::get('worker/show/{workerUuid}', [IntegrationController::class, 'showWorker']);
            Route::get('worker/turnstile-events-month/{workerUuid}', [IntegrationController::class, 'showWorkerTurnstileEventsByMonth']);
            Route::get('worker/turnstile-events-day/{workerUuid}', [IntegrationController::class, 'showWorkerTurnstileEventsByDay']);

            Route::middleware('permission:integration-worker-salary')
                ->prefix('worker')
                ->group(function () {
                    Route::post('salary', [WorkerController::class, 'getStatements']);
                    Route::post('get-salary-months', [WorkerController::class, 'getStatementMonths']);
                });

            Route::middleware('permission:integration-worker-info')
                ->prefix('worker')
                ->group(function () {
                    Route::post('check', [WorkerController::class, 'checkWorker']);
                });
        });
    });

Route::middleware(['hmac.auth', 'integration.log'])
    ->prefix('v1/integration/mobile-face')
    ->group(function () {
        Route::post('send-event', [MobileFaceController::class, 'sendEvent']);
        Route::post('check-worker', [MobileFaceController::class, 'checkWorker']);
        Route::post('schedules', [MobileFaceController::class, 'schedules']);
    });

