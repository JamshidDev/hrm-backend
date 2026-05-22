<?php

use Illuminate\Support\Facades\Route;
use Modules\ProjectService\Http\Controllers\TranslateController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/services')
    ->name('services.')
    ->group(function () {
        Route::post('translate', [TranslateController::class, 'translate']);
    });
