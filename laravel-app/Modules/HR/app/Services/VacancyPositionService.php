<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\VacancyPositionDTO;
use Modules\HR\Enums\VacancyLevelEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\VacancyPosition;
use Modules\Structure\Models\VacancyApproveOrganization;
use Modules\Vacancy\Enums\VacancySendStatusEnum;
use RuntimeException;

class VacancyPositionService
{
    public function index(int $perPage, $user)
    {
        return VacancyPosition::query()
            ->filter($user, request()->all())
            ->whereHas('department_position')
            ->whereHas('department_position.department')
            ->with([
                'department_position.department',
                'department_position.position',
                'organization',
            ])
            ->withCount('applications')
            ->paginate($perPage);
    }

    public function show(int $id): VacancyPosition
    {
        return VacancyPosition::query()
            ->with([
                'department_position.department',
                'department_position.position',
                'organization',
                'applications',
                'city.region',
                'applications.user',
                'applications.statuses',
                'applications.files',
                'applications.messages'
            ])
            ->whereHas('department_position.department')
            ->whereHas('department_position.position')
            ->findOrFail($id);
    }

    public function edit(int $id): VacancyPosition
    {
        return VacancyPosition::with([
            'department_position.department',
            'department_position.position',
            'organization',
        ])->findOrFail($id);
    }

    public function store(VacancyPositionDTO $dto): VacancyPosition
    {
        return DB::transaction(function () use ($dto) {
            $departmentPosition = DepartmentPosition::findOrFail($dto->departmentPositionId);

            $data = $dto->data;
            $data['organization_id'] = $departmentPosition->organization_id;
            $data['user_id'] = auth()->id();

            return VacancyPosition::create($data);
        });
    }

    public function update(int $id, array $data): void
    {
        $user = auth()->user();
        $vacancy = VacancyPosition::findOrFail($id);

        if ($data['status'] ?? null) {
            $vacancyApprove = VacancyApproveOrganization::where('to_organization_id', $vacancy->organization_id)
                ->first();
            if ($vacancyApprove && $user->organization_id !== $vacancyApprove->from_organization_id) {
                throw HRServiceException::organizationNotAllowedPermission(trans('messages.errors.has_application_not_checked'));
            }
        }

        $vacancy->update($data);
    }

    public function finish(int $id, $request): void
    {
        $user = auth()->user();
        $vacancy = VacancyPosition::findOrFail($id);

        if ($request->finish ?? null) {
            $vacancyApprove = VacancyApproveOrganization::where('to_organization_id', $vacancy->organization_id)
                ->first();
            if ($vacancyApprove && $user->organization_id !== $vacancyApprove->from_organization_id) {
                throw HRServiceException::organizationNotAllowedPermission(trans('messages.errors.has_application_not_checked'));
            }
        }
        $vacancy->update([
            'finish' => $request->finish,
            'vacancy_status' => VacancyLevelEnum::SEVEN->value
        ]);
    }

    public function delete(int $id): void
    {
        $user = auth()->user();
        $vacancy = VacancyPosition::findOrFail($id);
        if ($user->organization_id !== $vacancy?->organization_id) {
            throw HRServiceException::organizationNotAllowedPermission(trans('messages.errors.organization_not_allowed_permission'));
        }
        $vacancy->delete();
    }

    public function changeStatus(int $id): void
    {
        DB::transaction(function () use ($id) {
            $vacancy = VacancyPosition::query()->with(['applications'])->findOrFail($id);

            $currentStatus = $vacancy->vacancy_status;

            $notCheckedApplications = $vacancy
                ->applications()
                ->whereDoesntHave('currentStatus', function ($query) use ($currentStatus) {
                    $query->where('type', $currentStatus);
                })->exists();

            if ($notCheckedApplications) {
                throw HRServiceException::vacancyHasApplicationNotChecked(trans('messages.errors.has_application_not_checked'));
            }

            $newStatus = $this->nextStatus($vacancy->vacancy_status);
            $vacancy->update(['vacancy_status' => $newStatus]);

            $statuses = $vacancy->applications()
                ->with(['currentStatus' => function ($query) use ($currentStatus) {
                    $query->where('type', $currentStatus)->whereNot('status', VacancySendStatusEnum::THREE->value);
                }])->get();

            foreach ($statuses as $status) {
                $currentStatus = $status->currentStatus;
                if ($currentStatus) {
                    $currentStatus->status = VacancySendStatusEnum::TWO->value;
                    $currentStatus->save();
                }
            }
        });
    }

    private function nextStatus($nowStatus): int
    {
        if ($nowStatus !== VacancyLevelEnum::ONE->value ||
            $nowStatus !== VacancyLevelEnum::TWO->value ||
            $nowStatus !== VacancyLevelEnum::THREE->value ||
            $nowStatus !== VacancyLevelEnum::FOUR->value ||
            $nowStatus !== VacancyLevelEnum::FIVE->value) {
            return $nowStatus + 1;
        }
        throw new RuntimeException(trans('messages.errors.status_not_allowed'));
    }
}
