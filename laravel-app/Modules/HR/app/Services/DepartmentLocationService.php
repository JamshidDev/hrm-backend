<?php

namespace Modules\HR\Services;

use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentLocation;

class DepartmentLocationService
{
    public function index(array $filters, $user)
    {
        return DepartmentLocation::query()
            ->with(['department:id,name,organization_id', 'department.organization:id,name'])
            ->when($filters['department_id'] ?? null, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->whereHas('department', function ($query) use ($filters, $user) {
                $query->filterByOrganizations($user)
                    ->when($filters['organization_id'] ?? null, function ($q, $organizationId) {
                        $q->where('organization_id', $organizationId);
                    })
                    ->when($filters['search'] ?? null, function ($q, $search) {
                        $q->whereLike('name', '%' . $search . '%');
                    });
            })
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function list($user)
    {
        return Department::query()
            ->search()
            ->whereIsRoot()
            ->filterByOrganizationsWithJoin($user)
            ->with(['organization:id,name,group'])
            ->withExists('children')
            ->withExists('locations')
            ->orderBy('organization_id')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function show(DepartmentLocation $departmentLocation): DepartmentLocation
    {
        return $departmentLocation->load(['department:id,name,organization_id', 'department.organization:id,name']);
    }

    public function store(array $data, $user): DepartmentLocation
    {
        $this->ensureAccessibleDepartment($data['department_id'], $user);

        return DepartmentLocation::query()->create($this->payload($data));
    }

    public function update(DepartmentLocation $departmentLocation, array $data, $user): DepartmentLocation
    {
        $this->ensureAccessibleDepartment($data['department_id'], $user);

        $departmentLocation->update($this->payload($data));

        return $departmentLocation->load(['department:id,name,organization_id', 'department.organization:id,name']);
    }

    public function delete(DepartmentLocation $departmentLocation): void
    {
        $departmentLocation->delete();
    }

    public function findForUser(int $id, $user): DepartmentLocation
    {
        return DepartmentLocation::query()
            ->whereKey($id)
            ->whereHas('department', fn($query) => $query->filterByOrganizations($user))
            ->firstOrFail();
    }

    private function ensureAccessibleDepartment(int $departmentId, $user): void
    {
        Department::query()
            ->whereKey($departmentId)
            ->filterByOrganizations($user)
            ->firstOrFail();
    }

    private function payload(array $data): array
    {
        return [
            'department_id' => $data['department_id'],
            'geo_type' => (bool)$data['geo_type'],
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'radius' => $data['radius'] ?? 30,
            'polygon' => $data['polygon'] ?? null,
            'accuracy_limit' => $data['accuracy_limit'] ?? null,
        ];
    }

    public function normalizePolygon(mixed $polygon): ?array
    {
        if ($polygon === null || $polygon === '') {
            return null;
        }

        if (is_string($polygon)) {
            $decoded = json_decode($polygon, true);
            $polygon = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        if (!is_array($polygon)) {
            return null;
        }

        if (isset($polygon['coordinates']) && is_array($polygon['coordinates'])) {
            $polygon = $polygon['coordinates'];
        }

        return collect($polygon)
            ->map(function ($point) {
                if (is_array($point) && array_key_exists('lat', $point) && array_key_exists('lng', $point)) {
                    return [
                        'lat' => (float)$point['lat'],
                        'lng' => (float)$point['lng'],
                    ];
                }

                if (is_array($point) && array_key_exists(0, $point) && array_key_exists(1, $point)) {
                    return [
                        'lat' => (float)$point[0],
                        'lng' => (float)$point[1],
                    ];
                }

                return null;
            })
            ->filter()
            ->values()
            ->all();
    }

}
