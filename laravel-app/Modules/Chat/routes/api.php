<?php

use Illuminate\Support\Facades\Route;
use Modules\Chat\Http\Controllers\ChatNewsCategoryController;
use Modules\Chat\Http\Controllers\ChatNewsController;
use Modules\Chat\Http\Controllers\ChatNewsMediaController;
use Modules\Chat\Http\Controllers\ChatNewsTranslationController;
use Modules\Chat\Http\Controllers\ChatNewsViewController;
use Modules\Chat\Http\Controllers\ChatNewsReactionController;
use Modules\Chat\Http\Controllers\NotificationController;
use Modules\Chat\Http\Controllers\TelegramController;
use Modules\Chat\Http\Controllers\UserEmojiController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1')
    ->group(function () {

        Route::get('chat/enums', [\Modules\Chat\Http\Controllers\ChatController::class, 'enums']);
        //NOTIFICATIONS
        Route::prefix('notifications')
            ->group(function () {
                Route::get('enums', [NotificationController::class, 'enums']);
                Route::get('', [NotificationController::class, 'index']);
                Route::post('send', [NotificationController::class, 'send']);
                Route::post('send-batch', [NotificationController::class, 'sendBatch']);
            });

        //TELEGRAM
        Route::prefix('telegram')
            ->group(function () {
                Route::get('messages', [TelegramController::class, 'messages']);
                Route::get('dashboard', [TelegramController::class, 'dashboard']);
            });

        //NEWS
        Route::prefix('chat')
            ->group(function () {
                Route::apiResource('categories', ChatNewsCategoryController::class);
                Route::resource('news', ChatNewsController::class);
                Route::apiResource('translations', ChatNewsTranslationController::class);
                Route::apiResource('media', ChatNewsMediaController::class);
            });
    });

Route::middleware(['auth.hybrid'])
    ->prefix('v1/news')
    ->group(function () {
        Route::get('', [ChatNewsController::class, 'list']);
        Route::post('{id}/view', [ChatNewsViewController::class, 'store']);
        Route::post('{id}/reaction', [ChatNewsReactionController::class, 'store']);
    });

Route::post('v1/chat/emoji', [UserEmojiController::class, 'send'])->middleware('socket-server-api');
