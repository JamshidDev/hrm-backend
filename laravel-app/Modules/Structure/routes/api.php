<?php

use App\Http\Controllers\QuoteController;
use Illuminate\Support\Facades\Route;
use Modules\HR\Http\Controllers\Exports\ExportTaskController;
use Modules\HR\Http\Controllers\Exports\ReportExportController;
use Modules\LMS\Http\Controllers\LearningCenterController;
use Modules\Structure\Http\Controllers\CityController;
use Modules\Structure\Http\Controllers\CommandTypeController;
use Modules\Structure\Http\Controllers\ContractAdditionalTypeController;
use Modules\Structure\Http\Controllers\ContractTypeController;
use Modules\Structure\Http\Controllers\CountryController;
use Modules\Structure\Http\Controllers\HolidayController;
use Modules\Structure\Http\Controllers\LanguageController;
use Modules\Structure\Http\Controllers\OrganizationController;
use Modules\Structure\Http\Controllers\OrganizationServiceController;
use Modules\Structure\Http\Controllers\PositionController;
use Modules\Structure\Http\Controllers\RegionController;
use Modules\Structure\Http\Controllers\ReportController;
use Modules\Structure\Http\Controllers\ScheduleController;
use Modules\Structure\Http\Controllers\SpecialityController;
use Modules\Structure\Http\Controllers\StructureController;
use Modules\Structure\Http\Controllers\UniversityController;
use Modules\Structure\Http\Controllers\UploadFileController;
use Modules\Structure\Http\Controllers\VacancyApproveOrganizationController;
use Modules\Structure\Http\Controllers\WorkDayController;

Route::middleware(['auth:sanctum'])
    ->prefix('v1/structure')
    ->name('structure.')
    ->group(function () {
        $resources = [
            'countries' => CountryController::class,
            'regions' => RegionController::class,
            'cities' => CityController::class,
            'positions' => PositionController::class,
            'languages' => LanguageController::class,
            'organizations' => OrganizationController::class,
            'universities' => UniversityController::class,
            'specialities' => SpecialityController::class,
            'schedules' => ScheduleController::class,
            'work-days' => WorkDayController::class,
            'quotes' => QuoteController::class,
            'contract-types' => ContractTypeController::class,
            'contract-additional-types' => ContractAdditionalTypeController::class,
            'command-types' => CommandTypeController::class,
            'organization-services' => OrganizationServiceController::class,
            'holidays' => HolidayController::class,
            'learning-centers' => LearningCenterController::class
        ];

        foreach ($resources as $resource => $controller) {
            Route::apiResource($resource, $controller);
        }


        Route::prefix('vacancy-approve')
            ->group(function () {
                Route::get('organizations', [VacancyApproveOrganizationController::class, 'index']);
                Route::post('attach', [VacancyApproveOrganizationController::class, 'attach']);
                Route::delete('organizations/{id}', [VacancyApproveOrganizationController::class, 'destroy']);
            });


        Route::get('organization-list', [OrganizationController::class, 'list']);
        Route::get('organization-levels', [OrganizationController::class, 'levels']);

        Route::post('export/tasks-read', [ExportTaskController::class, 'markAsRead']);
        Route::get('export/tasks-count', [ExportTaskController::class, 'isNotReadCount']);
        Route::get('report-export', [ExportTaskController::class, 'reportExportList']);
        Route::post('report-export', [ReportExportController::class, 'export']);


        Route::apiResource('reports', ReportController::class);
        Route::post('report/generate', [ReportController::class, 'generate']);
        Route::get('report/labels', [ReportController::class, 'labels']);
        Route::post('report/store', [ReportController::class, 'store']);
        Route::post('report/excel', [ReportController::class, 'viewExcel']);
        Route::put('reports-detail/{detailId}', [ReportController::class, 'updateDetail']);
        Route::delete('reports-detail/{detailId}', [ReportController::class, 'destroyDetail']);
        Route::post('report/create-confirmation', [ReportController::class, 'createConfirmation']);
        Route::delete('report/delete-confirmation/{confirmationId}', [ReportController::class, 'deleteConfirmation']);
        Route::get('reports-stat', [ReportController::class, 'stats']);
        Route::put('reports-per-month', [ReportController::class, 'updateReportMonthOrganizations']);
        Route::get('reports-per-month', [ReportController::class, 'indexReportMonthOrganizations']);
        Route::delete('reports-per-month/{id}', [ReportController::class, 'destroyReportMonthOrganizations']);

        Route::post('upload', [UploadFileController::class, 'store']);
        Route::get('enums', [StructureController::class, 'enums']);
    });

Route::middleware(['auth.hybrid'])
    ->prefix('v1/structure')
    ->group(function () {
        Route::get('', [StructureController::class, 'index']);
        Route::get('all', [StructureController::class, 'getAllStructure']);
        Route::get('parents', [StructureController::class, 'leadOrganizations']);
        Route::get('parent-leaders', [StructureController::class, 'parentLeaders']);
        Route::get('confirmations', [StructureController::class, 'confirmations']);
    });

