<?php

use Illuminate\Support\Facades\Route;
use Modules\Structure\Http\Controllers\SignatureController;

Route::post('frontend/mobile/upload', [SignatureController::class, 'upload']);

//Route::any('{any}', static function () {
//    return response()->json(['message' => 'Unauthorized'], 401);
//})->where('any', '.*');
