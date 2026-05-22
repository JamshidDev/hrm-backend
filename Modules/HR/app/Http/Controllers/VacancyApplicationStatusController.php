<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\HR\Models\VacancyApplication;
use Modules\HR\Services\VacancyApplicationService;
use Modules\HR\Transformers\Vacancy\VacancyUserResource;

class VacancyApplicationStatusController extends Controller
{
    public function __construct(protected VacancyApplicationService $service)
    {}

    public function updateApplicationStatus(Request $request, $vacancyId, $applicationId)
    {
        return $this->service->updateApplicationDetails($request, $applicationId);
    }

    public function showVacancyUser($vacancyId, $applicationId)
    {
         $user = $this->service->showVacancyUser($applicationId);
         return Helper::response(true, new VacancyUserResource($user));
    }

    public function createMeeting(Request $request, $vacancyId, $applicationId)
    {
        $request->validate([
            'meet_date_and_time' => 'required|date_format:Y-m-d H:i:s',
            'duration' => 'required|integer',
        ]);
        $this->service->createMeetingForApplicationUser($request, $applicationId);
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function uploadFileForStatus(Request $request, $vacancyId, $applicationId)
    {
        $request->validate([
            'type' => 'required|integer',
            'file' => 'required|file'
        ]);
        $this->service->uploadFileForStatus($request, $applicationId);

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function updateStatusApplication(Request $request, $vacancyId, $applicationId)
    {
        $request->validate([
            'status' => 'required|integer'
        ]);
        $this->service->updateStatusApplication($request, $applicationId);

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy($vacancyPositionId, $vacancyApplicationId): JsonResponse
    {
        $vacancyApplication = VacancyApplication::query()->findOrFail($vacancyApplicationId);
        $vacancyApplication?->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

}
