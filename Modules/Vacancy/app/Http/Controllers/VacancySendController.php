<?php

namespace Modules\Vacancy\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Models\VacancyApplication;
use Modules\HR\Models\VacancyApplicationFile;
use Modules\HR\Models\VacancyApplicationStatus;
use Modules\HR\Models\VacancyPosition;
use Modules\Vacancy\Enums\VacancySendStatusEnum;
use Modules\Vacancy\Exceptions\VacancyServiceException;
use Modules\Vacancy\Transformers\VacancyApplicationListResource;
use Modules\Vacancy\Transformers\VacancyApplicationShowResource;

class VacancySendController extends Controller
{
    use Base64FileUploadTrait;

    public function send(Request $request): ?JsonResponse
    {
        $request->validate([
            'vacancy_position_id' => 'required',
            'files' => 'nullable|array',
        ]);

        $user = $request->user('vacancy')
            ->load([
                'careers',
                'educations'
            ]);

        if (!$user->photo) {
            throw VacancyServiceException::noPhoto(trans('messages.vacancy.user.no_photo'));
        }

        if (!$user->country_id || !count($user->educations)) {
            throw VacancyServiceException::incompleteProfile(trans('messages.vacancy.user.no_info_details'));
        }

        $vacancyPosition = VacancyPosition::find($request->vacancy_position_id);

        if (!$vacancyPosition || Carbon::parse($vacancyPosition->to) < Carbon::now()) {
            throw VacancyServiceException::vacancyExpired(trans('messages.vacancy.user.vacancy_position_expired'));
        }

        $checkSend = VacancyApplication::query()
            ->where([
                'vacancy_position_id' => $request->vacancy_position_id,
                'vacancy_user_id' => $user->id,
            ])->exists();

        if ($checkSend) {
            throw VacancyServiceException::alreadyApplied(trans('messages.vacancy.user.already_applied'));
        }

        DB::transaction(function () use ($request, $user) {
            $sendVacancy = VacancyApplication::create([
                'vacancy_position_id' => $request->vacancy_position_id,
                'vacancy_user_id' => $user->id,
            ]);

            $details = [
                'application_id' => $sendVacancy->id,
                'number' => Helper::pad_number($sendVacancy->id, 8),
                'created' => $sendVacancy->created_at->format('Y-m-d H:i:s'),
            ];

            VacancyApplicationStatus::create([
                'vacancy_application_id' => $sendVacancy->id,
                'type' => VacancyLevelEnum::ONE->value,
                'details' => $details,
                'status' => VacancySendStatusEnum::TWO->value
            ]);

            $this->uploadFiles($request, $sendVacancy);
        });

        return Helper::response(trans('messages.vacancy.send_success'));
    }

    public function applications(Request $request): ?JsonResponse
    {
        $user = $request->user('vacancy');

        $applications = VacancyApplication::query()
            ->where('vacancy_user_id', $user->id)
            ->when(request('status'), function ($query, $status) {
                return $query->where('status', $status);
            })
            ->whereHas('vacancy_position')
            ->whereHas('vacancy_position.department_position')
            ->whereHas('vacancy_position.department_position.department')
            ->whereHas('vacancy_position.department_position.position')
            ->with([
                'vacancy_position',
                'vacancy_position.department_position.position',
                'vacancy_position.department_position.department',
                'vacancy_position.department_position.organization',
                'vacancy_position' => function ($q) {
                    $q->withCount('applications');
                },
                'files'
            ])
            ->get();

        return Helper::response(true, VacancyApplicationListResource::collection($applications));
    }

    public function show(Request $request, $applicationId)
    {
        $user = $request->user('vacancy');

        $application = VacancyApplication::query()
            ->where('vacancy_user_id', $user->id)
            ->with([
                'vacancy_position',
                'vacancy_position.department_position.position',
                'vacancy_position.department_position.department',
                'vacancy_position.department_position.organization',
                'vacancy_position' => function ($q) {
                    $q->withCount('applications');
                },
                'files',
                'statuses'
            ])
            ->findOrFail($applicationId);

        return Helper::response(true, new VacancyApplicationShowResource($application));
    }

    public function dashboard(Request $request): ?JsonResponse
    {
        $user = $request->user('vacancy');

        $vacancyCounts = VacancyApplication::query()
            ->where('vacancy_user_id', $user->id)
            ->select('status', DB::raw('COUNT(*) as vacancies_count'))
            ->groupBy('status')
            ->pluck('vacancies_count', 'status');

        $v = [];
        foreach (VacancySendStatusEnum::cases() as $item) {
            $v[] = [
                'name' => VacancySendStatusEnum::get($item->value),
                'count' => $vacancyCounts[$item->value] ?? 0,
            ];
        }

        $v[] = [
            'name' => 'Barchasi',
            'count' => 0
        ];

        return Helper::response(true, $v);
    }

    public function files(Request $request, $applicationId): ?JsonResponse
    {
        $request->validate([
            'uploads' => 'required|array',
        ]);
        $sendVacancy = VacancyApplication::query()->findOrFail($applicationId);
        $this->uploadFiles($request, $sendVacancy);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function deleteFile(Request $request, $applicationId, $fileId): ?JsonResponse
    {
        VacancyApplicationFile::query()->findOrFail($fileId)->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function uploadFiles(Request $request, VacancyApplication|Model|Collection|null $sendVacancy): void
    {
        if ($request->uploads) {
            foreach ($request->uploads as $file) {

                $type = $file['type'];
                $file = $file['file'];

                $filePath = $this->uploadFormFile($file, 'vacancy-send',
                    ['pdf', 'jpg', 'png', 'jpeg', 'docx', 'png', 'docx']);

                $file_name = $file->getClientOriginalName();

                VacancyApplicationFile::create([
                    'vacancy_application_id' => $sendVacancy->id,
                    'file_name' => $file_name,
                    'file' => $filePath,
                    'file_type' => $type,
                ]);
            }
        }
    }
}
