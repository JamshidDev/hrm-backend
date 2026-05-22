<?php

namespace Modules\Turnstile\Services;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Services\HikCentralService;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\Organization;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\HikCentralDepartment;
use Modules\Turnstile\Models\HikCentralDevice;
use Modules\Turnstile\Models\OrganizationAccessLevel;
use Modules\Turnstile\Transformers\AccessLevelMinResource;
use Modules\Turnstile\Transformers\AccessLevelResource;

class HikCentralAccessLevelService
{
    public function syncAccessLevels(): void
    {
        $hikCentral = new HikCentralService();
        $hikCentral->devices();
        $res = $hikCentral->accessLevels();

        if (!$res['status']) {
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }

        $accessLevelsData = [];
        $devicesData = [];
        $pivotData = [];
        $accessLevelIds = [];
        $deviceIds = [];

        foreach ($res['data'] as $items) {
            foreach ($items as $item) {
                $accessLevelIds[] = $item->privilegeGroupId;
                $accessLevelsData[] = [
                    'hik_central_access_level_id' => $item->privilegeGroupId,
                    'hik_central_key' => 1,
                    'name' => $item->privilegeGroupName,
                    'description' => $item->description,
                    'devices_count' => count($item->ElementList),
                ];

                foreach ($item->ElementList as $element) {
                    $device = $element->Element;
                    $deviceIds[] = $device->ID;
                    $devicesData[] = [
                        'hik_central_device_id' => $device->ID,
                        'name' => $device->BaseInfo->Name,
                        'area_name' => $device->BaseInfo->AreaName,
                        'status' => str_contains($device->BaseInfo->Name, '_en'),
                    ];
                    $pivotData[] = [
                        'hik_central_access_level_id' => $item->privilegeGroupId,
                        'hik_central_device_id' => $device->ID,
                    ];
                }
            }
        }

        HikCentralAccessLevel::whereNotIn('hik_central_access_level_id', $accessLevelIds)->delete();
        HikCentralDevice::whereNotIn('hik_central_device_id', $deviceIds)->delete();

        HikCentralAccessLevel::upsert($accessLevelsData, ['hik_central_access_level_id', 'hik_central_key'], ['name', 'description', 'devices_count']);
        HikCentralDevice::upsert(collect($devicesData)->unique('hik_central_device_id')->values()->toArray(), ['hik_central_device_id'], ['name', 'area_name', 'status']);

        $accessLevelMap = HikCentralAccessLevel::query()->whereIn('hik_central_access_level_id', $accessLevelIds)->pluck('id', 'hik_central_access_level_id');
        $deviceMap = HikCentralDevice::query()->whereIn('hik_central_device_id', $deviceIds)->pluck('id', 'hik_central_device_id');

        $pivotInsert = [];
        foreach ($pivotData as $pivot) {
            if (isset($accessLevelMap[$pivot['hik_central_access_level_id']], $deviceMap[$pivot['hik_central_device_id']])) {
                $pivotInsert[] = [
                    'hik_central_access_level_id' => $accessLevelMap[$pivot['hik_central_access_level_id']],
                    'hik_central_device_id' => $deviceMap[$pivot['hik_central_device_id']],
                ];
            }
        }

        DB::table('hik_central_access_level_devices')->truncate();
        if ($pivotInsert) {
            DB::table('hik_central_access_level_devices')->insert($pivotInsert);
        }

        $this->syncDepartments($hikCentral);
    }

    public function departments(): array
    {
        return [
            'departments' => HikCentralDepartment::query()->get()->map(fn($item) => ['id' => $item->id, 'name' => $item->name]),
            'devices' => HCPDevice::query()->get()->map(fn($item) => ['id' => $item->device_id, 'name' => $item->name, 'status' => $item->status]),
        ];
    }

    public function update(int $accessLevelId, array $data): void
    {
        $accessLevel = HikCentralAccessLevel::query()->findOrFail($accessLevelId);

        OrganizationAccessLevel::query()->updateOrCreate([
            'organization_id' => 1,
            'hik_central_access_level_id' => $accessLevelId,
        ]);

        $accessLevel->update([
            'hik_central_department_id' => $data['hik_central_department_id'],
            'devices' => $data['devices'],
        ]);
    }

    public function paginate(array $filters)
    {
        $devices = HCPDevice::query()->get();
        $data = HikCentralAccessLevel::query()
            ->when($filters['search'] ?? null, fn($query, $search) => $query->whereLike('name', '%' . $search . '%'))
            ->with('department')
            ->orderByDesc('id')
            ->orderBy('hik_central_department_id')
            ->paginate($filters['per_page'] ?? 10);

        return PaginateResource::make(
            $data->through(fn($item) => new AccessLevelResource($item, $devices)),
            AccessLevelResource::class
        );
    }

    public function organizationAccessLevels(int $organizationId)
    {
        $data = HikCentralAccessLevel::query()
            ->whereIn('id', OrganizationAccessLevel::query()
                ->where('organization_id', $organizationId)
                ->select('hik_central_access_level_id'))
            ->get();

        return AccessLevelMinResource::collection($data);
    }

    public function allAccessLevels(array $filters, $user)
    {
        $accessLevelIds = Helper::userAccessLevels($user);
        $data = HikCentralAccessLevel::query()
            ->when($filters['search'] ?? null, fn($query, $search) => $query->whereLike('name', '%' . $search . '%'))
            ->orderByDesc('id');

        if (!$user->hasRole('Admin')) {
            $data->whereIn('id', $accessLevelIds);
        }

        return AccessLevelMinResource::collection($data->get());
    }

    public function attachAccessLevelToOrganization(array $data): void
    {
        $organization = Organization::findOrFail($data['organization_id']);
        $organization->access_levels()->sync($data['access_levels'] ?? []);
    }

    private function syncDepartments(HikCentralService $hikCentral): void
    {
        $departments = [];
        foreach ([null, 2] as $page) {
            $res = $page ? $hikCentral->groups($page) : $hikCentral->groups();
            if (!$res['status']) {
                throw TurnstileServiceException::serverError(is_string($res['msg']) ? $res['msg'] : trans('messages.server_error'));
            }
            $batch = collect($res['msg']->list)->map(fn($item) => [
                'hik_central_department_id' => $item->orgIndexCode,
                'name' => $item->orgName
            ])->unique('hik_central_department_id')->values()->toArray();
            $departments = array_merge($departments, $batch);
        }

        HikCentralDepartment::upsert($departments, ['hik_central_department_id'], ['name']);
    }
}
