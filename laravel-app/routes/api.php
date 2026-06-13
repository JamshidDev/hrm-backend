<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AppInstructionController;
use App\Http\Controllers\Admin\AuthenticationLogController;
use App\Http\Controllers\Admin\IntegrationApiLogController;
use App\Http\Controllers\Admin\MobileController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\AI\OpenAIController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\MobileAuthController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\DeployController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\Telegram\TelegramController;
use App\Http\Controllers\Telegram\TelegramPushController;
use App\Http\Controllers\ToDoController;
use App\Http\Controllers\User\MobileFaceCheckInOutController;
use App\Http\Controllers\User\MobileVersionController;
use App\Http\Controllers\User\UsefulController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\User\UserFaceController;
use App\Http\Controllers\User\UserMobileController;
use Illuminate\Support\Facades\Route;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\Structure\Http\Controllers\SignatureController;

# ***AUTH***
Route::prefix('auth')
    ->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('mobile/refresh', [MobileAuthController::class, 'refresh']);
        Route::post('mobile/login', [MobileAuthController::class, 'login']);

        Route::post('v1/liveness/start', [UserFaceController::class, 'startLiveness']);
        Route::post('v1/liveness/validate', [UserFaceController::class, 'validateLiveness'])
            ->middleware('socket-server-api');
        Route::post('v1/liveness/complete', [UserFaceController::class, 'completeLiveness'])
            ->middleware('socket-server-api');
    });

Route::prefix('v1/signature')
    ->group(function () {
        Route::get('challenge', [SignatureController::class, 'challenge']);
        Route::post('auth', [SignatureController::class, 'auth']);
    });

Route::post('oauth/token', [OAuthController::class, 'checkAuthCode']);

# ***AUTH***
Route::middleware(['auth.hybrid'])
    ->prefix('oauth')
    ->group(function () {
        Route::post('auth-code', [OAuthController::class, 'generateAuthCode']);
    });

Route::middleware(['auth.hybrid'])
    ->prefix('v1')
    ->group(function () {

        Route::prefix('user')
            ->group(function () {
                Route::get('logout', [AuthController::class, 'logout'])->name('logout');
                Route::get('profile', [UserController::class, 'profile']);
                Route::get('me', [UserController::class, 'me']);
                Route::get('notifications', [UserController::class, 'notifications']);
                Route::post('notifications/mark-read', [UserController::class, 'markAsReadNotifications']);
                Route::get('roles', [UserController::class, 'roles']);
                Route::put('update', [UserController::class, 'update']);
                Route::put('change-organization', [UserController::class, 'changeCurrentOrganization']);
                Route::get('organization-info', [UserController::class, 'organizationInfo']);
                Route::put('organization-info', [UserController::class, 'updateOrganizationInfo']);
                Route::post('access-for-admin', [AdminUserController::class, 'checkTokenForAdmin']);
                Route::get('organization-hr', [UserController::class, 'organizationHrs']);

                //SOCKET-SERVER
                Route::post('face/recognition', [UserFaceController::class, 'recognition']);
                Route::post('face/liveness/start', [UserFaceController::class, 'startLivenessForUser']);

                Route::get('socket/verify-token', [UserController::class, 'verifyToken']);
                Route::post('socket/users-photos', [UserController::class, 'updateUserPhotos']);

                Route::prefix('mobile')
                    ->group(function () {
                        Route::post('version', [MobileVersionController::class, 'check']);
                        Route::get('logout', [MobileAuthController::class, 'logout']);
                        Route::post('update-password', [UserMobileController::class, 'update']);
                        Route::get('my-schedules', [UserMobileController::class, 'mySchedules']);
                        Route::post('update-fcm', [MobileAuthController::class, 'updateFCM']);
                        Route::get('personal-list', [UserMobileController::class, 'mobileWorkerInfoList']);
                        Route::get('work-info', [UserMobileController::class, 'workInfo']);
                        Route::get('documents', [UserMobileController::class, 'documents']);
                        Route::get('turnstile-events', [UserMobileController::class, 'turnstile_events']);
                        Route::get('get-salary-months', [UserMobileController::class, 'getSalaryMonths']);
                        Route::get('get-salary', [UserMobileController::class, 'getSalary']);
                        Route::get('enums', [UserMobileController::class, 'enums']);
                        Route::get('my-vacations', [UserMobileController::class, 'myLatestVacations']);
                        Route::get('my-resume', [UserMobileController::class, 'myResume']);

                        //FACE CHECK IN/OUT
                        Route::get('last-event', [MobileFaceCheckInOutController::class, 'lastEvent']);
                        Route::post('check-location', [MobileFaceCheckInOutController::class, 'checkLocation']);
                        Route::post('turnstile-start-liveness', [UserFaceController::class, 'startLivenessForTurnstile']);

                        //TURNSTILE
                        Route::get('turnstile-stats', [UserMobileController::class, 'myTodaySchedule']);
                        Route::get('turnstile-show-stats', [UserMobileController::class, 'showMonthStat']);
                    });

            });

        Route::prefix('admin')
            ->middleware('permission:users-write')
            ->group(function () {

                Route::get('/generate-log-viewer', [AuthController::class, 'generateLogViewerToken']);

                //Integration users
                Route::put('integration-log/users/{id}', [IntegrationApiLogController::class, 'update']);
                Route::get('integration-log/users', [IntegrationApiLogController::class, 'users']);

                Route::get('integration-log/summary', [IntegrationApiLogController::class, 'summary']);
                Route::get('integration-log/timeline', [IntegrationApiLogController::class, 'timeline']);
                Route::get('integration-log/top-clients', [IntegrationApiLogController::class, 'topClients']);
                Route::get('integration-log/top-endpoints', [IntegrationApiLogController::class, 'topEndpoints']);
                Route::get('integration-log/methods', [IntegrationApiLogController::class, 'methods']);
                Route::get('integration-log/statuses', [IntegrationApiLogController::class, 'statuses']);
                Route::get('integration-log', [IntegrationApiLogController::class, 'index']);

                //Test
                Route::post('test', [ToDoController::class, 'test']);
                Route::get('wrong-worker-pins', [ToDoController::class, 'wrongWorkerPins']);


                Route::get('users/direct-permissions', [AdminUserController::class, 'directPermissionUsers']);
                Route::apiResource('users', AdminUserController::class);
                Route::get('users/{userUuid}/roles', [AdminUserController::class, 'userRoles']);
                Route::get('users/{userUuid}/permissions', [AdminUserController::class, 'userPermissions']);
                Route::post('users/{userUuid}/block', [AdminUserController::class, 'block']);
                Route::get('users/{userUuid}/login', [AdminUserController::class, 'loginAsUser']);
                Route::put('users/{userUuid}/roles/detach', [AdminUserController::class, 'detachUserRoles']);
                Route::post('users/{userUuid}/permissions/attach', [AdminUserController::class, 'attachPermission']);
                Route::put('users/{userUuid}/permissions/detach', [AdminUserController::class, 'detachPermission']);
                Route::post('assign-role', [AdminUserController::class, 'assignRoleToUser']);
                Route::apiResource('roles', RoleController::class);
                Route::apiResource('permissions', PermissionController::class);
                Route::get('activity-logs', [ActivityLogController::class, 'index']);
                Route::get('authentication-logs', [AuthenticationLogController::class, 'index']);

                //FRONTEND
                Route::prefix('deploy')->group(function () {
                    Route::get('logs', [DeployController::class, 'index']);
                    Route::post('logs', [DeployController::class, 'store']);
                    Route::post('upload', [DeployController::class, 'upload']);
                    Route::put('publish/{id}', [DeployController::class, 'publish']);
                });

                Route::get('telegram/users', [TelegramController::class, 'index']);
                Route::post('telegram/users/send-message', [TelegramPushController::class, 'sendMessage']);
                Route::get('telegram/bot/users', [TelegramPushController::class, 'telegramUsers']);
                Route::post('telegram/bot/users-detach', [TelegramController::class, 'detachUsers']);
                Route::get('access-for-admin', [AdminUserController::class, 'getTokenForAdmin']);

                Route::get('mobile/users', [MobileController::class, 'index']);
                Route::get('mobile/users/{id}', [MobileController::class, 'show']);
            });

        Route::prefix('ai')->group(function () {
            Route::post('lawyer', [OpenAIController::class, 'getAiLawyer']);
            Route::get('list', [OpenAIController::class, 'getGroupByAiList']);
            Route::get('questions', [OpenAIController::class, 'getAiQuestion']);
            Route::post('questions/{id}/like', [OpenAIController::class, 'likeDislikeQuestion']);
        });

        Route::prefix('useful')
            ->group(function () {
                Route::get('codex', [UsefulController::class, 'codex']);
                Route::get('leaders', [UsefulController::class, 'leaders']);
            });

        Route::get('quote', [QuoteController::class, 'inRandomQuote']);

        Route::prefix('admin')
            ->middleware('permission:instructions')
            ->group(function () {
                Route::get('instructions', [AppInstructionController::class, 'index']);
                Route::post('instructions', [AppInstructionController::class, 'store'])
                    ->middleware('permission:instructions-write');
                Route::put('instructions/{appInstructionId}', [AppInstructionController::class, 'update'])
                    ->middleware('permission:instructions-write');
                Route::delete('instructions/{appInstructionId}', [AppInstructionController::class, 'destroy'])
                    ->middleware('permission:instructions-write');
                Route::delete('instruction-photos/{photoId}', [AppInstructionController::class, 'detachPhoto'])
                    ->middleware('permission:instructions-write');
                Route::get('instructions-export', [AppInstructionController::class, 'exportToPdf'])
                    ->middleware('permission:instructions-write');
            });
    });

Route::prefix('v1/telegram')
    ->middleware('telegram')
    ->group(function () {
        Route::get('auth/{chatId}', [TelegramController::class, 'getUserInfo']);
        Route::post('auth/check', [TelegramController::class, 'check']);
        Route::post('auth/register', [TelegramController::class, 'register']);
        Route::delete('auth/{chatId}', [TelegramController::class, 'destroy']);

        Route::middleware('telegram-user')
            ->group(function () {
                Route::get('profile', [TelegramController::class, 'profile']);
                Route::get('petition-types', [TelegramController::class, 'petitionTypes']);
                Route::get('menu/services', [TelegramController::class, 'services']);
                Route::get('menu/get-service', [TelegramController::class, 'getService']);
                Route::post('menu/set-service', [TelegramController::class, 'setServices']);
            });
    });

Route::get('/only-office/file/{uuid}', function ($uuid) {

    $modelType = request('model');
    $model = ModelTypeEnum::tryFrom($modelType)->model();
    abort_unless($model, 403);
    $doc = $model::where('uuid', $uuid)->firstOrFail();
    return Storage::disk('minio')->download($doc->file);
})->name('only_office_file')->middleware('signed');
