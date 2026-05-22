<?php

namespace Modules\HR\Services;

use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Position;

class FilterService
{
    public function workers(array $filters, $user)
    {
        return WorkerPosition::query()
            ->filter($user, $filters)
            ->where('organization_id', $filters['organization_id'])
            ->search()
            ->with([
                'contract:id,type',
                'position:id,name',
                'worker:id,last_name,first_name,middle_name',
            ])
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($filters['per_page'] ?? 100);
    }

    public function departmentsByOrganizations(array $filters, $user)
    {
        return Department::query()
            ->filterByOrganizations($user, $filters)
            ->search()
            ->with('organization')
            ->paginate($filters['per_page'] ?? 100);
    }

    public function rootDepartments(array $filters, $user)
    {
        return Department::query()
            ->whereIsRoot()
            ->search()
            ->filterByOrganization($user)
            ->with('organization')
            ->paginate($filters['per_page'] ?? 100);
    }

    public function departmentTree(array $filters)
    {
        return Department::query()
            ->search()
            ->when(
                $filters['organization_id'] ?? null,
                fn ($q, $orgId) => $q->where('organization_id', $orgId)
            )
            ->get()
            ->toTree();
    }

    public function departmentPositions(int $departmentId)
    {
        return DepartmentPosition::query()
            ->where('department_id', $departmentId)
            ->search()
            ->with('position:id,name,name_ru,name_en')
            ->orderBy('organization_id')
            ->get();
    }

    public function positions(array $filters)
    {
        $positionIds = WorkerPosition::query()
            ->when($filters['organizations'] ?? null,
                fn ($q, $orgIds) => $q->whereIn('organization_id', explode(',', $orgIds)))
            ->when($filters['departments'] ?? null,
                fn ($q, $deps) => $q->whereIn('department_id', explode(',', $deps)))
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->select('position_id');

        return Position::query()
            ->search()
            ->whereIn('id', $positionIds)
            ->paginate($filters['per_page'] ?? 10);
    }
}
