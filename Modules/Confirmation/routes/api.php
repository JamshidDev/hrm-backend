<?php

use Illuminate\Support\Facades\Route;
use Modules\Confirmation\Http\Controllers\CommandConfirmationController;
use Modules\Confirmation\Http\Controllers\ContractAdditionalConfirmationController;
use Modules\Confirmation\Http\Controllers\ContractConfirmationController;
use Modules\Confirmation\Http\Controllers\DashboardController;
use Modules\Confirmation\Http\Controllers\DocumentChatController;
use Modules\Confirmation\Http\Controllers\DocumentConfirmationController;
use Modules\Confirmation\Http\Controllers\DocumentController;
use Modules\Confirmation\Http\Controllers\DocumentFileController;
use Modules\Confirmation\Http\Controllers\DocumentViewController;
use Modules\Confirmation\Http\Controllers\LmsCertificateConfirmationController;
use Modules\Confirmation\Http\Controllers\LmsProtocolConfirmationController;
use Modules\Confirmation\Http\Controllers\StaffingApproveConfirmationController;
use Modules\Confirmation\Http\Controllers\TimesheetConfirmationController;
use Modules\Confirmation\Http\Controllers\VacationScheduleConfirmationController;
use Modules\Confirmation\Http\Controllers\WorkerApplicationConfirmationController;
use Modules\HR\Http\Controllers\WorkerApplicationController;
use Modules\Structure\Http\Controllers\SignatureController;
use Modules\Confirmation\Http\Controllers\ReportConfirmationController;

Route::middleware(['auth.hybrid'])
    ->prefix('v1')
    ->group(function () {

        Route::prefix('confirmation')
            ->group(function () {
                Route::get('document/base64', [DocumentController::class, 'documentBase64']);
                Route::post('document/signature', [DocumentController::class, 'confirmation']);
                Route::post('forward', [DocumentController::class, 'forwardConfirmation']);
                Route::post('init', [SignatureController::class, 'init']);
                Route::post('status', [SignatureController::class, 'status']);
                Route::post('verify', [SignatureController::class, 'verify']);
            });

        Route::prefix('worker-application')
            ->name('worker-application.')
            ->group(function () {
                Route::get('statistics', [DashboardController::class, 'workerApplicationStatistics']);
                Route::post('applications', [WorkerApplicationController::class, 'store']);
                Route::get('directors', [WorkerApplicationController::class, 'directors']);
                Route::get('enums', [WorkerApplicationController::class, 'enums']);
                Route::get('confirmations', [WorkerApplicationController::class, 'confirmations']);
                Route::get('positions', [WorkerApplicationController::class, 'positions']);
                Route::get('temporarily-workers', [WorkerApplicationController::class, 'temporarily_workers']);
                Route::get('applications/{workerApplicationId}/edit', [WorkerApplicationController::class, 'edit']);
                Route::put('applications/{workerApplicationId}/update', [WorkerApplicationController::class, 'update']);
                Route::delete('applications/{workerApplicationId}', [WorkerApplicationController::class, 'destroy']);
            });

        Route::prefix('document')->group(function () {
            Route::get('show', [DocumentController::class, 'show']);
            Route::get('history', [DocumentController::class, 'history']);
            Route::apiResource('files', DocumentFileController::class);
        });
    });

Route::middleware(['auth:sanctum'])
    ->prefix('v1')
    ->group(function () {
        Route::prefix('confirmation')
            ->group(function () {
                Route::get('contracts', [ContractConfirmationController::class, 'index']);
                Route::get('commands', [CommandConfirmationController::class, 'index']);
                Route::get('contract-additional', [ContractAdditionalConfirmationController::class, 'index']);
                Route::get('timesheet', [TimesheetConfirmationController::class, 'index']);
                Route::get('vacation-schedule', [VacationScheduleConfirmationController::class, 'index']);
                Route::get('protocol', [LmsProtocolConfirmationController::class, 'index']);
                Route::get('certificates', [LmsCertificateConfirmationController::class, 'index']);
                Route::apiResource('applications', WorkerApplicationConfirmationController::class);
                Route::get('staffing-approve', [StaffingApproveConfirmationController::class, 'index']);
                Route::get('reports', [ReportConfirmationController::class, 'index']);
            });

        Route::prefix('document')->group(function () {
            Route::get('generate-url', [DocumentConfirmationController::class, 'generateConfirmationUrl']);
            Route::post('document-confirm', [DocumentController::class, 'updateDocument']);

            //Chat
            Route::get('users', [DocumentChatController::class, 'users']);
            Route::get('messages', [DocumentChatController::class, 'messages']);
            Route::post('messages', [DocumentChatController::class, 'sendMessage']);
            Route::delete('messages/{messageId}', [DocumentChatController::class, 'deleteMessage']);
            Route::post('messages/read', [DocumentChatController::class, 'readMessage']);
            Route::get('applications', [DocumentFileController::class, 'applications']);
        });
    });

Route::post('v1/document/update',
    [DocumentController::class, 'update'])
    ->name('document.update')->middleware(['only_office_ip']);

Route::post('v1/document/signature',
    [DocumentConfirmationController::class, 'signature'])
    ->name('document.signature.generate-url');

Route::post('v1/document/application-confirmation',
    [WorkerApplicationController::class, 'applicationConfirmation'])
    ->name('document.signature.application.generate-url');

Route::post('v1/document/view/{model}/{uuid}', [DocumentViewController::class, 'show']);
