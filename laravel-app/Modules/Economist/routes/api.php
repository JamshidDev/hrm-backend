<?php

use Illuminate\Support\Facades\Route;
use Modules\Economist\Http\Controllers\DashboardController;
use Modules\Economist\Http\Controllers\EconomistController;
use Modules\Economist\Http\Controllers\EconomistUploadController;
use Modules\Economist\Http\Controllers\PensionPaymentController;
use Modules\Economist\Http\Controllers\StaffingApproveController;
use Modules\Economist\Http\Controllers\StatementController;
use Modules\Economist\Http\Controllers\TaxFiveApplicationController;
use Modules\Economist\Http\Controllers\TaxFourApplicationController;
use Modules\Economist\Http\Controllers\TelegramController;
use Modules\Economist\Http\Controllers\WorkerCategoryController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/economist')
    ->middleware('permission:economist')
    ->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index']);
        Route::get('refresh-worker-pins', [EconomistController::class, 'refreshWorkersPins']);
        Route::post('upload', [EconomistUploadController::class, 'upload']);
        Route::get('upload-histories', [EconomistController::class, 'uploadHistories']);
        Route::post('upload-statuses', [EconomistController::class, 'updateUploadStatus']);
        Route::post('upload-histories/confirm', [EconomistUploadController::class, 'confirmed']);
        Route::get('enums', [EconomistController::class, 'enums']);
        Route::get('structure', [EconomistController::class, 'structure']);
        Route::resource('statements', StatementController::class);
        Route::resource('tax-four-applications', TaxFourApplicationController::class);
        Route::resource('tax-five-applications', TaxFiveApplicationController::class);
        Route::resource('pension-payments', PensionPaymentController::class);
        Route::resource('worker-categories', WorkerCategoryController::class);
        Route::get('worker-category-organizations', [WorkerCategoryController::class, 'reportByOrganizations']);
        Route::get('statements-count', [StatementController::class, 'count']);
        Route::get('statement-decoding', [StatementController::class, 'decodingStatement']);
        Route::get('statement-decoding-organizations', [StatementController::class, 'decodingStatementByOrganization']);
        Route::post('statements-export-with-codes', [StatementController::class, 'exportWithCodes']);
        Route::post('statements-export-with-codes-by-year', [StatementController::class, 'exportWithCodesByYear']);
        Route::get('statements-multiple-workers', [StatementController::class, 'multiStatementWorkers']);
        Route::get('statements-by-positions', [StatementController::class, 'downloadWorkersByPositions']);

        //Examples
        Route::get('statement-example', [StatementController::class, 'downloadExample']);
        Route::get('tax-four-example', [TaxFourApplicationController::class, 'downloadExample']);
        Route::get('tax-five-example', [TaxFiveApplicationController::class, 'downloadExample']);
        Route::get('pension-example', [PensionPaymentController::class, 'downloadExample']);


        //STAFFING
        Route::get('staffing/generate', [StaffingApproveController::class, 'viewGenerateChanges']);
        Route::post('staffing/generate', [StaffingApproveController::class, 'generate']);
        Route::get('staffing/approve', [StaffingApproveController::class, 'index']);
        Route::delete('staffing/approve/{id}', [StaffingApproveController::class, 'destroy']);
    });

Route::middleware('economist-bot-token')
    ->prefix('v1/economist/telegram')
    ->group(function () {
        Route::post('login', [TelegramController::class, 'login']);
        Route::get('months', [TelegramController::class, 'months']);
        Route::get('check-user', [TelegramController::class, 'checkUser']);
        Route::get('salary', [TelegramController::class, 'salary']);
    });
