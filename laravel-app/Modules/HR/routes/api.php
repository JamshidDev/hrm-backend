<?php

use App\Http\Controllers\ZoomController;
use Illuminate\Support\Facades\Route;
use Modules\HR\Http\Controllers\CommandController;
use Modules\HR\Http\Controllers\ConfirmationWorkerController;
use Modules\HR\Http\Controllers\ContractAdditionalController;
use Modules\HR\Http\Controllers\ContractController;
use Modules\HR\Http\Controllers\Dashboard\DashboardController;
use Modules\HR\Http\Controllers\Dashboard\DashboardViewController;
use Modules\HR\Http\Controllers\DepartmentController;
use Modules\HR\Http\Controllers\DepartmentLocationController;
use Modules\HR\Http\Controllers\DepartmentPositionController;
use Modules\HR\Http\Controllers\Exports\ExportTaskController;
use Modules\HR\Http\Controllers\Exports\ResumeController;
use Modules\HR\Http\Controllers\Exports\WorkerExportController;
use Modules\HR\Http\Controllers\FilterController;
use Modules\HR\Http\Controllers\HRController;
use Modules\HR\Http\Controllers\MedController;
use Modules\HR\Http\Controllers\NationalityController;
use Modules\HR\Http\Controllers\OrganizationDisciplinaryController;
use Modules\HR\Http\Controllers\OrganizationDocumentController;
use Modules\HR\Http\Controllers\OrganizationIncentiveController;
use Modules\HR\Http\Controllers\OrganizationLeaderController;
use Modules\HR\Http\Controllers\OrganizationPolyclinicController;
use Modules\HR\Http\Controllers\PensionerController;
use Modules\HR\Http\Controllers\ReportController;
use Modules\HR\Http\Controllers\VacancyApplicationExamController;
use Modules\HR\Http\Controllers\VacancyApplicationStatusController;
use Modules\HR\Http\Controllers\VacancyPositionController;
use Modules\HR\Http\Controllers\VacancySendController;
use Modules\HR\Http\Controllers\VacationController;
use Modules\HR\Http\Controllers\VacationScheduleController;
use Modules\HR\Http\Controllers\VacationScheduleYearController;
use Modules\HR\Http\Controllers\WorkerAcademicDegreeController;
use Modules\HR\Http\Controllers\WorkerAcademicTitleController;
use Modules\HR\Http\Controllers\WorkerApplicationController;
use Modules\HR\Http\Controllers\WorkerBusinessTripController;
use Modules\HR\Http\Controllers\WorkerController;
use Modules\HR\Http\Controllers\WorkerDisabilityController;
use Modules\HR\Http\Controllers\WorkerLanguageController;
use Modules\HR\Http\Controllers\WorkerMilitaryServiceController;
use Modules\HR\Http\Controllers\WorkerOldCareerController;
use Modules\HR\Http\Controllers\WorkerPartyController;
use Modules\HR\Http\Controllers\WorkerPassportController;
use Modules\HR\Http\Controllers\WorkerPhoneController;
use Modules\HR\Http\Controllers\WorkerPhotoController;
use Modules\HR\Http\Controllers\WorkerPositionController;
use Modules\HR\Http\Controllers\WorkerRelativeController;
use Modules\HR\Http\Controllers\WorkerRelativeDisabilityController;
use Modules\HR\Http\Controllers\WorkerSickLeaveController;
use Modules\HR\Http\Controllers\WorkerUniversityController;
use Modules\HR\Http\Controllers\WorkerUserController;
use Modules\LMS\Http\Controllers\EduPlanController;
use Modules\LMS\Http\Controllers\EduPlanWorkerController;
use Modules\Structure\Http\Controllers\OrganizationPhoneController;

Route::middleware(['auth.hybrid'])
    ->prefix('v1/hr')
    ->group(function () {
        //Dashboard
        Route::middleware(['permission:hr'])
            ->group(function () {
                Route::get('dashboard', [DashboardController::class, 'index'])->middleware('permission:hr-dashboard');
                Route::get('dashboard-two', [DashboardController::class, 'indexTwo'])->middleware('permission:hr-dashboard');
                Route::get('dashboard-three', [DashboardController::class, 'indexThree'])->middleware('permission:hr-dashboard');

                Route::middleware('permission:hr-dashboard-read')
                    ->group(function () {
                        Route::get('dashboard/birthdays', [DashboardViewController::class, 'birthdays']);
                        Route::get('dashboard/educations', [DashboardViewController::class, 'workersByEducation']);
                        Route::get('dashboard/age', [DashboardViewController::class, 'workerByAge']);
                        Route::get('dashboard/passport', [DashboardViewController::class, 'workerByPassport']);
                        Route::get('dashboard/pension', [DashboardViewController::class, 'workerByPension']);
                        Route::get('dashboard/meds', [DashboardViewController::class, 'workerByMed']);
                        Route::get('dashboard/disciplinary-actions', [DashboardViewController::class, 'disciplinaryActions']);
                        Route::get('dashboard/incentive-actions', [DashboardViewController::class, 'incentiveActions']);
                        Route::get('dashboard/meds', [DashboardViewController::class, 'workerByMed']);
                        Route::get('dashboard/contract-types', [DashboardViewController::class, 'workerByContractTypes']);
                        Route::get('dashboard/contracts', [DashboardViewController::class, 'contracts']);
                        Route::get('dashboard/worker-disabilities/preview', [DashboardViewController::class, 'workerDisabilitiesPreview']);
                        Route::get('dashboard/worker-relative-disabilities/preview', [DashboardViewController::class, 'workerRelativeDisabilitiesPreview']);
                        Route::get('dashboard/worker-sick-leaves/preview', [DashboardViewController::class, 'workerSickLeavesPreview']);
                    });

                Route::resource('worker-positions', WorkerPositionController::class);
                Route::get('worker-positions/{uuid}/resume-download', [ResumeController::class, 'downloadResume']);
            });
    });

Route::middleware(['auth.hybrid'])
    ->prefix('v1/hr')
    ->name('hr.')
    ->group(function () {

        Route::apiResource('nationalities', NationalityController::class);
        Route::get('enums', [HRController::class, 'enums']);

        Route::get('check-worker', [WorkerController::class, 'checkWorker'])
            ->middleware(['permission:hr-check-worker']);

        Route::middleware(['permission:hr'])
            ->group(function () {
                Route::apiResource('departments', DepartmentController::class);
                Route::resource('department-positions', DepartmentPositionController::class);
                Route::apiResource('workers', WorkerController::class);
                Route::apiResource('worker-photos', WorkerPhotoController::class);
                Route::apiResource('worker-phones', WorkerPhoneController::class);
                Route::apiResource('worker-disabilities', WorkerDisabilityController::class);
                Route::apiResource('worker-relative-disabilities', WorkerRelativeDisabilityController::class);
                Route::apiResource('worker-sick-leaves', WorkerSickLeaveController::class);
                Route::apiResource('worker-passports', WorkerPassportController::class);
                Route::apiResource('worker-languages', WorkerLanguageController::class);
                Route::apiResource('worker-parties', WorkerPartyController::class);
                Route::apiResource('worker-militaries', WorkerMilitaryServiceController::class);
                Route::apiResource('worker-relatives', WorkerRelativeController::class);
                Route::apiResource('worker-old-careers', WorkerOldCareerController::class);
                Route::apiResource('worker-universities', WorkerUniversityController::class);
                Route::apiResource('worker-academic-titles', WorkerAcademicTitleController::class);
                Route::apiResource('worker-academic-degrees', WorkerAcademicDegreeController::class);
                Route::apiResource('leaders', OrganizationLeaderController::class);

                Route::resource('worker-meds', MedController::class);
                Route::apiResource('organization-documents', OrganizationDocumentController::class);
                Route::apiResource('vacation-schedules', VacationScheduleController::class);
                Route::apiResource('polyclinics', OrganizationPolyclinicController::class);
                Route::apiResource('pensioners', PensionerController::class);

                //Vacation Schedule
                Route::get('vacation-schedules-not-included', [VacationScheduleController::class, 'noVacationScheduleWorkers']);

                //VACATION SCHEDULE YEAR
                Route::get('vacation-schedule', [VacationScheduleYearController::class, 'index']);
                Route::post('vacation-schedule', [VacationScheduleYearController::class, 'store']);
                Route::get('vacation-schedule-workers', [VacationScheduleYearController::class, 'workers']);
                Route::get('vacation-schedule/{vacationScheduleYearId}/auto-generate',
                    [VacationScheduleYearController::class, 'autoGenerate']);

                //WorkerPositions
                Route::get('worker-position-info/{workerPositionId}', [WorkerPositionController::class, 'positionInfos']);
                Route::get('worker-new-careers/{uuid}', [WorkerPositionController::class, 'newCareers']);
                Route::get('worker-additional/{id}', [CommandController::class, 'checkWorkerPositionAdditional']);
                Route::delete('worker-new-careers/{id}', [WorkerPositionController::class, 'deleteNewCareer']);

                //Worker roles
                Route::post('worker-positions/{uuid}/edit/attach-role', [WorkerPositionController::class, 'attachRole']);
                Route::put('worker-positions/{uuid}/edit/detach-role', [WorkerPositionController::class, 'detachRole']);
                Route::put('worker-positions/{id}/update', [WorkerPositionController::class, 'updatePosition']);

                //Search Workers
                Route::get('search-workers', [FilterController::class, 'getWorkers'])->middleware('permission:filter-search-workers');

                //Report
                Route::middleware('permission:hr-report')
                    ->group(function () {
                        Route::get('report/structure', [ReportController::class, 'structure']);
                        Route::get('report/departments', [ReportController::class, 'departments']);
                        Route::delete('report/departments/{id}', [ReportController::class, 'deleteDepartment']);
                        Route::get('report/department-positions', [ReportController::class, 'department_positions']);
                        Route::delete('report/department-positions/{id}', [ReportController::class, 'deletePosition']);
                        Route::get('report/worker-positions', [ReportController::class, 'worker_positions']);
                        Route::get('report/optimization', [ReportController::class, 'optimization']);
                        Route::post('report/orderable', [ReportController::class, 'orderable']);
                    });

                //Vacations
                Route::get('vacations', [VacationController::class, 'index']);
                Route::post('vacations/create', [VacationController::class, 'create']);
                Route::post('vacations/calculate', [VacationController::class, 'calculate']);

                //Incentives
                Route::get('discips', [OrganizationDisciplinaryController::class, 'index']);
                Route::get('incentives', [OrganizationIncentiveController::class, 'index']);

                //BusinessTrip
                Route::get('business-trips', [WorkerBusinessTripController::class, 'index']);

                //applications
                Route::get('applications', [WorkerApplicationController::class, 'index']);
                Route::put('applications/{workerApplicationId}/accept', [WorkerApplicationController::class, 'accept']);
                Route::post('applications/generate-url', [WorkerApplicationController::class, 'getApplicationUrl']);

                Route::apiResource('confirmation-workers', ConfirmationWorkerController::class);

                Route::apiResource('contracts', ContractController::class);
                Route::apiResource('contract-additional', ContractAdditionalController::class);
                Route::apiResource('commands', CommandController::class);


                Route::put('worker-relatives-sortable', [WorkerRelativeController::class, 'sortable']);
                Route::put('worker-old-careers-sortable', [WorkerOldCareerController::class, 'sortable']);

                Route::get('enums/contract-additional-types', [HRController::class, 'contractAdditionalTypes']);
                Route::get('enums/command-types', [HRController::class, 'getCommandTypes']);
                Route::get('enums/reason-types', [HRController::class, 'getReasonTypes']);

                Route::get('department-levels', [DepartmentController::class, 'levels']);
                Route::get('department-list', [DepartmentController::class, 'list']);

                Route::get('departments-tree', [DepartmentController::class, 'departments']);

                //Export
                Route::post('export/workers', [WorkerExportController::class, 'export']);
                Route::post('export/resumes', [ResumeController::class, 'exportResumesToZip']);
                Route::post('export/relatives', [WorkerExportController::class, 'exportRelatives']);
                Route::get('export/workers/columns', [WorkerExportController::class, 'columns']);


                //OrganizationPhones
                Route::resource('organization-phones', OrganizationPhoneController::class);
                Route::get('organization-phones-list', [OrganizationPhoneController::class, 'list']);

                //VacationPosition
                Route::get('vacancy/positions', [VacancyPositionController::class, 'vacancies']);
                Route::post('vacancy/positions', [VacancyPositionController::class, 'store']);

                Route::get('vacancy', [VacancyPositionController::class, 'index']);
                Route::get('vacancy/{id}', [VacancyPositionController::class, 'show']);
                Route::get('vacancy/{id}/edit', [VacancyPositionController::class, 'edit']);
                Route::put('vacancy/{id}', [VacancyPositionController::class, 'update']);
                Route::put('vacancy/{id}/change-status', [VacancyPositionController::class, 'changeStatus']);
                Route::delete('vacancy/{id}', [VacancyPositionController::class, 'destroy']);
                Route::put('vacancy/{id}/finish', [VacancyPositionController::class, 'finish']);

                Route::get('vacancy/{id}/applications', [VacancySendController::class, 'index']);

                Route::put('vacancy/{id}/applications/{applicationId}', [VacancyApplicationStatusController::class, 'updateStatusApplication']);
                Route::delete('vacancy/{id}/applications/{applicationId}', [VacancyApplicationStatusController::class, 'destroy']);

                Route::put('vacancy/{id}/applications/{applicationId}/update', [VacancyApplicationStatusController::class, 'updateApplicationStatus']);
                Route::post('vacancy/{id}/applications/{applicationId}/upload', [VacancyApplicationStatusController::class, 'uploadFileForStatus']);
                Route::post('vacancy/{id}/applications/{applicationId}/create-meet', [VacancyApplicationStatusController::class, 'createMeeting']);
                Route::put('vacancy/{id}/applications/{applicationId}/attach-exam', [VacancyApplicationExamController::class, 'attachExam']);
                Route::put('vacancy/{id}/applications/{applicationId}/detach-exam', [VacancyApplicationExamController::class, 'detachExam']);
                Route::put('vacancy/{id}/applications/{applicationId}/update-exam', [VacancyApplicationExamController::class, 'updateExam']);
                Route::get('vacancy/{id}/applications/{applicationId}/show-user', [VacancyApplicationStatusController::class, 'showVacancyUser']);

                //Zoom
                Route::post('zoom/check-meet', [ZoomController::class, 'checkMeeting']);

                //EDU PLAN
                Route::get('edu-plans', [EduPlanController::class, 'list']);
                Route::get('edu-plans/search-workers', [EduPlanWorkerController::class, 'searchWorkers']);
                Route::post('edu-plans/attach-workers', [EduPlanWorkerController::class, 'attachWorkers']);
                Route::get('edu-plans/attached-workers', [EduPlanWorkerController::class, 'attachedWorkers']);
                Route::post('edu-plans/detach-workers', [EduPlanWorkerController::class, 'detachWorkers']);
            });

        //Filters
        Route::middleware('permission:filter')
            ->group(function () {
                Route::get('get-departments', [FilterController::class, 'getDepartmentsByOrganizations']);
                Route::get('get-department', [FilterController::class, 'getDepartments']);
                Route::get('get-positions', [FilterController::class, 'positions']);
                Route::get('get-departments-tree', [FilterController::class, 'getDepartmentsTree']);
                Route::get('get-department-positions', [FilterController::class, 'getDepartmentPositions']);
            });
        Route::get('export/tasks', [ExportTaskController::class, 'index']);
    });

Route::prefix('v1/extra')
    ->middleware('permission:extra-worker-user')
    ->group(function () {
        Route::get('users', [WorkerUserController::class, 'index']);
        Route::post('users/attach-role', [WorkerUserController::class, 'attachRole']);
        Route::post('users/detach-role', [WorkerUserController::class, 'detachRole']);
        Route::post('users/update-password', [WorkerUserController::class, 'updatePassword']);
        Route::put('users/update', [WorkerUserController::class, 'updateProfile']);


        //DEPARTMENT LOCATIONS
        Route::prefix('department')
            ->group(function () {
                Route::apiResource('locations', DepartmentLocationController::class);
                Route::get('list', [DepartmentLocationController::class, 'list']);
            });
    });
