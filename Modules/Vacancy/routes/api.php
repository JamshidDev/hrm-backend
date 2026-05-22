<?php

use App\Helpers\Helper;
use App\Http\Controllers\ZoomController;
use Illuminate\Support\Facades\Route;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Models\Nationality;
use Modules\HR\Transformers\Nationality\NationalityResource;
use Modules\HR\Transformers\Worker\LanguageResource;
use Modules\Structure\Models\Country;
use Modules\Structure\Models\Language;
use Modules\Structure\Transformers\Structure\CountryMinResource;
use Modules\Vacancy\Enums\VacancyFileTypesEnum;
use Modules\Vacancy\Http\Controllers\VacancyController;
use Modules\Vacancy\Http\Controllers\VacancyExamController;
use Modules\Vacancy\Http\Controllers\VacancySendController;
use Modules\Vacancy\Http\Controllers\VacancyUserCareerController;
use Modules\Vacancy\Http\Controllers\VacancyUserController;
use Modules\Vacancy\Http\Controllers\VacancyUserEducationController;

Route::prefix('v1/vacancies')
    ->name('vacancies.')
    ->group(function () {
        Route::post('login', [VacancyUserController::class, 'login']);
        Route::post('token', [VacancyUserController::class, 'sendOtp']);
        Route::post('register', [VacancyUserController::class, 'register']);

        //Zoom
        Route::post('zoom/check-meet', [ZoomController::class, 'checkMeeting']);

        Route::middleware('auth:vacancy')->group(function () {
            Route::get('profile', [VacancyUserController::class, 'profile']);
            Route::post('profile/update-photo', [VacancyUserController::class, 'updatePhoto']);
            Route::put('profile/update', [VacancyUserController::class, 'update']);
            Route::resource('careers', VacancyUserCareerController::class);
            Route::resource('educations', VacancyUserEducationController::class);

            Route::post('send-application', [VacancySendController::class, 'send']);
            Route::get('applications', [VacancySendController::class, 'applications']);
            Route::get('applications/{applicationId}', [VacancySendController::class, 'show']);
            Route::get('dashboard', [VacancySendController::class, 'dashboard']);
            Route::post('applications/{id}/files', [VacancySendController::class, 'files']);
            Route::delete('applications/{applicationId}/files/{fileId}', [VacancySendController::class, 'deleteFile']);

            Route::post('applications/{id}/exam/start', [VacancyExamController::class, 'start']);
            Route::post('applications/{id}/exam/{vacancyExamId}/send-result/{questionId}', [VacancyExamController::class, 'sendResult']);
            Route::post('applications/{id}/exam/{vacancyExamId}/continue', [VacancyExamController::class, 'continue']);
            Route::post('applications/{id}/exam/{vacancyExamId}/finish', [VacancyExamController::class, 'finish']);
            Route::get('applications/{id}/exam/{vacancyExamId}/results', [VacancyExamController::class, 'results']);
        });

        Route::get('organizations', [VacancyController::class, 'organizations']);
        Route::get('report', [VacancyController::class, 'index']);
        Route::get('report/{id}', [VacancyController::class, 'show']);
        Route::get('list', [VacancyController::class, 'list']);
        Route::get('regions', [VacancyController::class, 'regions']);
        Route::get('cities', [VacancyController::class, 'cities']);

        Route::get('enums', static function () {
            return Helper::response(true, [
                'educations' => EducationEnum::list(),
                'languages' => LanguageResource::collection(Language::all()),
                'nationalities' => NationalityResource::collection(Nationality::all()),
                'countries' => CountryMinResource::collection(Country::all()),
                'marital_statuses' => MaritalStatusEnum::list(),
                'file_types' => VacancyFileTypesEnum::list(),
            ]);
        });
    });
