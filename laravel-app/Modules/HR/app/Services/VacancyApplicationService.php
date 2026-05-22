<?php

namespace Modules\HR\Services;

use App\Helpers\Helper;
use App\Models\ZoomMeeting;
use App\Services\ZoomService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Models\VacancyApplication;
use Modules\HR\Models\VacancyApplicationStatus;
use Modules\Vacancy\Enums\VacancySendStatusEnum;

class VacancyApplicationService
{
    use Base64FileUploadTrait;

    public function showVacancyUser($applicationId): VacancyApplication|Model|Collection|null
    {
        return VacancyApplication::with([
            'user',
            'user.careers',
            'user.country',
            'user.region',
            'user.city',
            'user.current_region',
            'user.current_city',
            'user.educations',
            'user.nationality',
        ])->findOrFail($applicationId)?->user;
    }

    public function updateApplicationDetails($request, $applicationId): JsonResponse
    {
        $application = VacancyApplication::with('vacancy_position')->findOrFail($applicationId);

        if ($request->next_level) {
            $currentStatus = $request->type;
        } else {
            $currentStatus = $application->vacancy_position->vacancy_status;
        }

        if ($currentStatus === VacancyLevelEnum::TWO->value) {
            $request->validate([
                'details' => 'nullable|array',
                'details.*.file_type' => ['required', 'integer'],
                'details.*.status' => ['required', 'integer'],
                'status' => 'nullable|integer',
                'message' => 'nullable|string'
            ]);

            VacancyApplicationStatus::query()->updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'type' => VacancyLevelEnum::TWO->value,
                ],
                [
                    'details' => $request->details,
                    'status' => $request->status,
                    'message' => $request->message
                ]
            );
        } elseif ($currentStatus === VacancyLevelEnum::THREE->value) {
            $request->validate([
                'status' => 'nullable|integer',
                'message' => 'nullable|string'
            ]);
            VacancyApplicationStatus::query()->updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'type' => VacancyLevelEnum::THREE->value,
                ],
                [
                    'status' => $request->status,
                    'message' => $request->message
                ]
            );
        } elseif ($currentStatus === VacancyLevelEnum::FOUR->value) {
            $request->validate([
                'status' => 'nullable|integer',
                'message' => 'nullable|string'
            ]);
            VacancyApplicationStatus::query()->updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'type' => VacancyLevelEnum::FOUR->value,
                ],
                [
                    'status' => $request->status,
                    'message' => $request->message
                ]
            );
        } elseif ($currentStatus === VacancyLevelEnum::FIVE->value) {
            $request->validate([
                'status' => 'nullable|integer',
                'message' => 'nullable|string'
            ]);
            VacancyApplicationStatus::query()->updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'type' => VacancyLevelEnum::FIVE->value,
                ],
                [
                    'status' => $request->status,
                    'message' => $request->message
                ]
            );
        } elseif ($currentStatus === VacancyLevelEnum::SIX->value) {
            $request->validate([
                'status' => 'nullable|integer',
                'message' => 'nullable|string'
            ]);
            VacancyApplicationStatus::query()->updateOrCreate(
                [
                    'vacancy_application_id' => $applicationId,
                    'type' => VacancyLevelEnum::SIX->value,
                ],
                [
                    'status' => $request->status,
                    'message' => $request->message
                ]
            );
        }


        return Helper::response(trans('messages.successfully_updated'));
    }

    public function createMeetingForApplicationUser($request, $applicationId): void
    {
        \DB::transaction(function () use ($request, $applicationId) {

            $application = VacancyApplication::with('vacancy_position')->findOrFail($applicationId);

//            if (($application->vacancy_position->vacancy_status !== VacancyLevelEnum::THREE->value) && !$request->privilege) {
//                throw new \Exception(trans('messages.application_not_allowed'));
//            }

            $topic = Helper::pad_number($application->id, 8);
            $meet = new ZoomService()->createMeeting($topic, $request->meet_date_and_time, $request->duration);

            $zoomMeet = ZoomMeeting::query()
                ->updateOrCreate(
                    [
                        'model_id' => $application->id,
                        'model_type' => VacancyApplication::class,
                    ],
                    [
                        'zoom_id' => $meet['id'],
                        'zoom_uuid' => $meet['uuid'],
                        'meet_date_and_time' => $request->meet_date_and_time,
                        'duration' => $request->duration,
                        'details' => $meet
                    ]
                );

            $details['zoom'] = [
                'zoom_id' => $zoomMeet->id,
                'meet_uuid' => $meet['uuid'],
                'meet_id' => $meet['id'],
                'meet_date_and_time' => $request->meet_date_and_time,
                'duration' => $request->duration
            ];

            VacancyApplicationStatus::query()
                ->updateOrCreate(
                    [
                        'vacancy_application_id' => $applicationId,
                        'type' => VacancyLevelEnum::THREE->value,
                    ],
                    [
                        'details' => $details
                    ]
                );
        });
    }

    public function uploadFileForStatus($request, $applicationId): void
    {
        $status = VacancyApplicationStatus::where('vacancy_application_id', $applicationId)
            ->where('type', $request->type)
            ->first();
        if (!$status) {
            $status = VacancyApplicationStatus::create([
                'vacancy_application_id' => $applicationId,
                'type' => $request->type,
                'status' => VacancySendStatusEnum::ONE->value
            ]);
        }

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $filePath = $this->uploadFormFile($file, 'vacancy-application-status', ['mp4', 'avi', 'pdf', 'png', 'jpeg', 'jpg', 'webp']);
        if ($filePath) {
            $details = $status->details;
            $files = $details['files'] ?? [];
            $files[] = [
                'file_path' => $filePath,
                'file_name' => $fileName,
            ];
            $details['files'] = $files;
            $status->details = $details;
            $status->save();
        }
    }

    public function updateStatusApplication($request, $applicationId): void
    {
        if ($request->status === VacancySendStatusEnum::THREE->value) {
            $statuses = VacancyApplicationStatus::where('vacancy_application_id', $applicationId)
                ->whereStatus($request->status)
                ->exist();

            if (!$statuses) {
                throw new \Exception('Canceled Status not found');
            }
        }

        $application = VacancyApplication::findOrFail($applicationId);
        $application->status = $request->status;
        $application->save();
    }
}
