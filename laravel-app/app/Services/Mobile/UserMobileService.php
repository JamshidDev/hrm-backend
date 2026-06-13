<?php

namespace App\Services\Mobile;

use App\Helpers\Helper;
use App\Http\Resources\User\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Modules\Confirmation\Enums\ApplicationEducationTypeEnum;
use Modules\Economist\Models\Statement;
use Modules\Economist\Services\StatementService;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Services\VacationService;
use Modules\HR\Services\WorkerPositionService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserMobileService
{
    public function __construct(
        private readonly WorkerPositionService $workerPositionService,
        private readonly UserService $userService,
        private readonly VacationService $vacationService,
        private readonly StatementService $statementService,
    ) {
    }

    public function enums(): array
    {
        return [
            'application_types' => WorkerApplicationTypeEnum::mobileList(),
            'education_types' => ApplicationEducationTypeEnum::list(),
        ];
    }

    public function workerInfoLabels(): array
    {
        return [
            'personal_information' => trans('messages.mobile.personal_information'),
            'careers' => trans('messages.mobile.careers'),
            'passport_information' => trans('messages.mobile.passport_information'),
            'educations' => trans('messages.mobile.education'),
            'relatives' => trans('messages.mobile.relatives'),
            'meds' => trans('messages.mobile.meds'),
            'vacations' => trans('messages.mobile.vacations'),
            'incentives' => trans('messages.mobile.incentives'),
            'disciplinary_actions' => trans('messages.mobile.disciplinary_actions'),
            'exams' => trans('messages.mobile.exams'),
            'salary' => trans('messages.mobile.salary'),
        ];
    }

    public function downloadResume(User $user, int $workerPositionId): BinaryFileResponse
    {
        return $this->workerPositionService->downloadResume(null, $user, $workerPositionId);
    }

    public function salaryMonths(User $user): Collection
    {
        $user->loadMissing('worker:id,pin');

        return Statement::query()
            ->wherePin($user->worker?->pin)
            ->select(['year', 'month'])
            ->groupBy('year', 'month')
            ->get();
    }

    public function salary(User $user, int $year, int $month): array
    {
        $user->loadMissing('worker:id,pin');

        $statements = Statement::query()
            ->wherePin($user->worker?->pin)
            ->where('year', $year)
            ->where('month', $month)
            ->get();

        $amounts = [];
        $this->statementService->getStatements($statements, $amounts);

        return ['salary' => $amounts];
    }

    public function documents(User $user): array
    {
        return $this->userService->documents($user);
    }

    public function changePassword(User $user, string $oldPassword, string $newPassword): UserResource
    {
        if (!Hash::check($oldPassword, $user->password)) {
            throw new HttpResponseException(
                Helper::response(trans('messages.invalid_credentials_password'), [], 401)
            );
        }

        $user->update([
            'password' => bcrypt($newPassword),
            'password_changed_at' => now(),
        ]);

        return new UserResource($user);
    }

    public function latestVacations(User $user, ?int $workerPositionId)
    {
        return $this->vacationService->getMyLatestVacation($workerPositionId, $user);
    }
}
