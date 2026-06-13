<?php

namespace Modules\HR\Services;

use App\Helpers\QueryHelper;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\DepartmentDTO;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;

class DepartmentService
{
    public function index($filters, $user)
    {
        return Department::query()
            ->search()
            ->whereIsRoot()
            ->leftJoin('worker_positions as wp', function ($join) {
                $join->on('wp.department_id', '=', 'departments.id')
                    ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                    ->whereNull('wp.deleted_at');
            })
            ->select(
                'departments.*',
                DB::raw('COALESCE(SUM(wp.rate), 0) as worker_rate')
            )
            ->groupBy('departments.id')
            ->filterByOrganizationsWithJoin($user)
            ->with([
                'organization:id,name,group',
                'city:id,name,name_en,name_ru',
                'region:id,name'
            ])
            ->withExists('children')
            ->orderBy('departments.organization_id')
            ->orderByDesc('departments.id')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function store(DepartmentDTO $dto): void
    {
        if ($dto->parentId) {
            $parent = Department::findOrFail($dto->parentId);
            $parent->appendNode(new Department($this->map($dto)));
            return;
        }

        Department::create($this->map($dto));
    }

    public function update(Department $department, DepartmentDTO $dto)
    {
        if ($dto->organizationId !== $department->organization_id) {
            throw HRServiceException::permissionDenied(trans('messages.errors.dont_permission_update_this_department'));
        }
        $department->update($this->map($dto));
    }

    public function delete(Department $department): void
    {
        if (
            DepartmentPosition::where('department_id', $department->id)->exists()
            || WorkerPosition::where('department_id', $department->id)
                ->whereStatus(PositionStatusEnum::ACTIVE->value)
                ->exists()
        ) {
            throw HRServiceException::permissionDenied(trans('messages.department_has_position'));
        }

        $department->delete();
    }

    public function tree($user)
    {
        $organizationId = (int)(request('organization_id') ?? request('organizations'));
        $nodes = Department::query()
            ->when(request('id'), fn($q, $id) => $q->where('id', $id))
            ->when(request('ids'), fn($q, $ids) => $q->whereIn('id', explode(',', $ids)))
            ->search()
            ->where('organization_id', $organizationId)
            ->filterByOrganization($user);

        return new QueryHelper()
            ->adminDepartments($nodes)
            ->get()
            ->toTree();
    }

    private function map(DepartmentDTO $dto): array
    {
        return [
            'name' => $dto->name,
            'name_ru' => $dto->nameRu,
            'name_en' => $dto->nameEn,
            'comment' => $dto->comment,
            'region_id' => $dto->regionId,
            'city_id' => $dto->cityId,
            'level' => $dto->level,
            'organization_id' => $dto->organizationId,
            'parent_id' => $dto->parentId,
        ];
    }
}
