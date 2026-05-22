<?php

use Illuminate\Support\Facades\Route;
use Modules\Turnstile\Http\Controllers\BuildingController;
use Modules\Turnstile\Http\Controllers\DashboardPreviewController;
use Modules\Turnstile\Http\Controllers\EventController;
use Modules\Turnstile\Http\Controllers\HikCentralAccessLevelController;
use Modules\Turnstile\Http\Controllers\HikCentralController;
use Modules\Turnstile\Http\Controllers\HikCentralSyncController;
use Modules\Turnstile\Http\Controllers\HikCentralWorkerController;
use Modules\Turnstile\Http\Controllers\OrganizationTerminalController;
use Modules\Turnstile\Http\Controllers\TelegramPhotoController;
use Modules\Turnstile\Http\Controllers\TerminalController;
use Modules\Turnstile\Http\Controllers\TerminalLogController;
use Modules\Turnstile\Http\Controllers\TurnstileController;
use Modules\Turnstile\Http\Controllers\TurnstileScheduleGroupController;
use Modules\Turnstile\Http\Controllers\TurnstileScheduleStatsController;
use Modules\Turnstile\Http\Controllers\TurnstileScheduleTypeController;
use Modules\Turnstile\Http\Controllers\TurnstileTimesheetController;
use Modules\Turnstile\Http\Controllers\TurnstileWorkerScheduleController;
use Modules\Turnstile\Http\Controllers\TurnstileWorkerScheduleGenerateController;
use Modules\Turnstile\Http\Controllers\UserDeviceNotifyController;
use Modules\Turnstile\Http\Controllers\WorkDurationController;
use Modules\Turnstile\Http\Controllers\WorkerTerminalController;
use Modules\Turnstile\Http\Controllers\WorkerTurnstileApproveController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/turnstile')
    ->name('turnstile.')
    ->group(function () {
        Route::apiResource('buildings', BuildingController::class);
        Route::apiResource('terminals', TerminalController::class);
        Route::resource('organization-terminals', OrganizationTerminalController::class);

        Route::get('worker-photos', [WorkerTerminalController::class, 'photos']);

        Route::get('work-duration', [WorkDurationController::class, 'index']);
        Route::get('work-duration/logs', [WorkDurationController::class, 'logs']);

        Route::get('terminal-logs', [TerminalLogController::class, 'index']);
        Route::get('terminal-logs/export', [TerminalLogController::class, 'export']);
        Route::get('enums', [TurnstileController::class, 'enums']);

        Route::prefix('hik-central')
            ->group(function () {
                Route::get('access-levels-sync', [HikCentralAccessLevelController::class, 'syncAccessLevels']);
                Route::get('access-levels', [HikCentralAccessLevelController::class, 'index']);
                Route::get('departments', [HikCentralAccessLevelController::class, 'departments']);
                Route::put('access-levels/{id}', [HikCentralAccessLevelController::class, 'update']);
                Route::get('organization-access-levels', [HikCentralAccessLevelController::class, 'organizationAccessLevels']);
                Route::get('all-access-levels', [HikCentralAccessLevelController::class, 'allAccessLevels']);
                Route::post('organization-access-levels-attach', [HikCentralAccessLevelController::class, 'attachAccessLevelToOrganization']);
                Route::get('groups', [HikCentralController::class, 'groups']);
                Route::get('workers', [HikCentralWorkerController::class, 'index']);
                Route::get('worker-access-levels', [HikCentralWorkerController::class, 'showAccessLevels']);
                Route::get('worker-errors', [HikCentralWorkerController::class, 'showErrorAL']);
                Route::get('devices', [HikCentralController::class, 'devices']);
                Route::get('devices-stat-export', [HikCentralController::class, 'exportStatistics']);
                Route::put('devices/{deviceId}', [HikCentralController::class, 'updateDevice']);
                Route::delete('devices/{deviceId}', [HikCentralController::class, 'deleteDevice']);
                Route::post('devices', [HikCentralController::class, 'storeDevice']);
                Route::get('devices-refresh', [HikCentralController::class, 'refreshDevices']);
                Route::delete('workers/destroy/{workerId}', [HikCentralWorkerController::class, 'destroy']);
                Route::post('workers/add', [HikCentralWorkerController::class, 'addWorkerToHikCentral']);
                Route::post('workers/update-face', [HikCentralWorkerController::class, 'updateWorkerFace']);
                Route::post('workers/refresh', [HikCentralWorkerController::class, 'refreshAccessLevel']);
                Route::get('workers/access-levels', [HikCentralController::class, 'accessLevels']);
                Route::post('workers/sync-to-server', [HikCentralController::class, 'syncWorkersToHikCentral']);
                Route::get('workers/exported-jobs', [HikCentralController::class, 'jobs']);
                Route::get('workers/exported-errors', [HikCentralController::class, 'errorWorkers']);

                Route::get('events', [EventController::class, 'index']);
                Route::get('events-new', [EventController::class, 'newStyleEvents']);
                Route::get('work-durations', [EventController::class, 'durations']);
                Route::get('work-durations/{workerId}', [EventController::class, 'showWorkerDurations']);
                Route::get('work-durations/{workerId}/events', [EventController::class, 'showWorkerEventsInDay']);
                Route::post('events/sync', [EventController::class, 'syncEvents']);

                Route::get('sync', [HikCentralSyncController::class, 'index']);
                Route::get('sync/{syncId}', [HikCentralSyncController::class, 'show']);
                Route::get('sync/{syncId}/offline-devices', [HikCentralSyncController::class, 'offlineDevices']);

                Route::get('workers/added-logs', [TurnstileController::class, 'addedLogs']);
                Route::get('workers/invalids', [TurnstileController::class, 'invalidWorkersByHcp']);

                Route::get('telegram/photos', [TelegramPhotoController::class, 'index']);
                Route::post('telegram/photos/update', [TelegramPhotoController::class, 'updatePhotos']);

                Route::get('telegram', [UserDeviceNotifyController::class, 'index']);
                Route::post('telegram', [UserDeviceNotifyController::class, 'store']);
                Route::get('telegram/{userId}', [UserDeviceNotifyController::class, 'edit']);
                Route::delete('telegram/{userId}', [UserDeviceNotifyController::class, 'destroy']);
                Route::get('telegram-users', [UserDeviceNotifyController::class, 'users']);
                Route::get('all-devices', [UserDeviceNotifyController::class, 'devices']);

                //APPROVE AL
                Route::resource('approve-al/list', WorkerTurnstileApproveController::class);
                Route::post('approve-al/approved/{approvalId}', [WorkerTurnstileApproveController::class, 'approved']);
                Route::get('approve-al/als', [WorkerTurnstileApproveController::class, 'access_levels']);
            });

        Route::prefix('schedule')
            ->group(function () {
                Route::apiResource('types', TurnstileScheduleTypeController::class);
                Route::get('departments', [TurnstileController::class, 'userTimesheetDepartments']);
                Route::get('schedule-types', [TurnstileScheduleTypeController::class, 'indexByWorkers']);
                Route::post('generate', [TurnstileWorkerScheduleController::class, 'generate']);
                Route::resource('workers', TurnstileWorkerScheduleController::class);
                Route::post('timesheet/export', [TurnstileTimesheetController::class, 'exportTimeSheet']);
                Route::get('workers-with-turnstile', [TurnstileWorkerScheduleController::class, 'indexTurnstileSheet']);
                Route::get('get-workers', [TurnstileWorkerScheduleGenerateController::class, 'workers']);
                Route::get('day-in-month', [TurnstileWorkerScheduleGenerateController::class, 'dayInMonth']);
                Route::post('generate-schedule', [TurnstileWorkerScheduleGenerateController::class, 'generateSchedule']);
                Route::post('generate-schedule-workers', [TurnstileWorkerScheduleGenerateController::class, 'generateScheduleByWorker']);
                Route::post('schedule-workers-replacement', [TurnstileWorkerScheduleGenerateController::class, 'replacementWorkers']);
                Route::post('generate-turnstile-schedule', [TurnstileWorkerScheduleGenerateController::class, 'generateTurnstileSchedule']);

                Route::get('schedule-groups', [TurnstileScheduleGroupController::class, 'groups']);
                Route::delete('schedule-groups/{groupId}', [TurnstileScheduleGroupController::class, 'deleteGroup']);
                Route::put('schedule-groups/{groupId}', [TurnstileScheduleGroupController::class, 'updateGroup']);
                Route::get('schedule-workers', [TurnstileScheduleGroupController::class, 'groupWorkers']);
            });

        Route::get('absent-scheduled-workers', [TurnstileController::class, 'absentScheduledWorkers'])
            ->middleware('permission:turnstile-absent-workers-export');
    });

Route::middleware(['auth.hybrid'])
    ->prefix('v1/turnstile/schedule')
    ->group(function () {
        //New Dashboard
        Route::get('stats-one', [TurnstileScheduleStatsController::class, 'statsForTurnstile']);
        Route::get('stats-two', [TurnstileScheduleStatsController::class, 'scheduleStatsByMonth']);
        Route::get('stats-three', [TurnstileScheduleStatsController::class, 'statsCurrentEvents']);
        Route::get('stats-four', [TurnstileScheduleStatsController::class, 'dailyAttendanceChart']);
        Route::get('stats-five', [TurnstileScheduleStatsController::class, 'devives']);
        Route::get('stats-six', [TurnstileScheduleStatsController::class, 'privilegeTurnstile']);
        Route::get('stats-seven', [TurnstileScheduleStatsController::class, 'lateAndEarlyStatsGroupedByDays']);
        Route::get('stats-preview', [DashboardPreviewController::class, 'preview']);
    });
