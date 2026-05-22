<?php

use Illuminate\Support\Facades\Route;
use Modules\HR\Http\Controllers\PensionerController;
use Modules\Med\Http\Controllers\MedController;
use Modules\Med\Http\Controllers\SendedWorkerController;
use Modules\Med\Http\Controllers\WorkerController;

Route::middleware(['auth.hybrid'])
    ->prefix('v1/med')
    ->group(function () {
        Route::get('workers', [MedController::class, 'index']);
        Route::get('worker-positions', [WorkerController::class, 'index']);
        Route::get('pensioners', [PensionerController::class, 'listMed']);
        Route::post('send-to-med', [MedController::class, 'sendToMed']);
        Route::get('sended-workers', [MedController::class, 'sendedWorkers']);
        Route::get('polyclinics', [MedController::class, 'polyclinics']);
        Route::get('dashboard', [MedController::class, 'dashboard']);
        Route::delete('sended-workers/{sendedWorkerId}', [MedController::class, 'destroy']);
        Route::get('organizations', [MedController::class, 'organizations']);

        Route::prefix('hospital')
            ->group(function () {
                Route::get('tickets', [SendedWorkerController::class, 'index']);
                Route::get('tickets/{ticketId}/commissions', [SendedWorkerController::class, 'commissions']);
                Route::post('tickets-attach', [SendedWorkerController::class, 'attachCommission']);
                Route::delete('tickets-attach/{attachedId}', [SendedWorkerController::class, 'detachCommission']);
                Route::post('tickets/{ticketId}/confirm', [SendedWorkerController::class, 'confirmDocument']);
            });
    });
