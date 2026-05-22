<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Exports\OrganizationDevicesExport;
use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Jobs\HCP\ExportWorkersToHikCentralJob;
use App\Services\HikCentralService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;
use Modules\Turnstile\Exports\HCPDevicesExport;
use Modules\Turnstile\Models\ExportWorkerError;
use Modules\Turnstile\Models\ExportWorkerToHikCentralJob;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\OrganizationAccessLevel;
use Modules\Turnstile\Transformers\AccessLevelMinResource;
use Modules\Turnstile\Transformers\ErrorJobWorkerResource;
use Modules\Turnstile\Transformers\HCPDevicesResource;
use Modules\Turnstile\Transformers\HikCentralJobResource;

class HikCentralController extends Controller
{
    use Base64FileUploadTrait;
    private int $maxDepth = 1;
    private SupportCollection $rows;

    public function accessLevels(): JsonResponse
    {
        $user = auth()->user();
        $accessLevels = $user->load('organization.access_levels')->organization?->access_levels;

        if (request('organization_id')) {
            $accessLevels = $accessLevels->whereIn('id',
                OrganizationAccessLevel::query()
                    ->where('organization_id', request('organization_id'))
                    ->pluck('hik_central_access_level_id')
                    ->toArray()
            );
        }

        $data = AccessLevelMinResource::collection($accessLevels);
        return Helper::response(true, $data);
    }

    public function groups(): JsonResponse
    {
        $res = new HikCentralService()->groups();
        if ($res['status']) {
            return Helper::response(true, $res['msg']->list ?? []);
        }
        return Helper::response($res['msg'], [], 400);
    }

    public function devices()
    {
        $user = auth()->user();

        $devices = HCPDevice::query()
            ->with('organization')
            ->when(request('search'), function ($query, $search) {
                $query->whereLike('name', '%' . $search . '%');
            })
            ->when(request('org-status') === 'yes', function ($query) {
                $query->whereHas('organization');
            })
            ->when(request('organizations'), function ($query) {
                $query->whereIn('organization_id', explode(',', request('organizations')));
            })
            ->when(request('org_status'), function ($query, $orgStatus) {
                if ($orgStatus === 'no') {
                    $query->whereDoesntHave('organization');
                } else {
                    $query->whereHas('organization');
                }

            })
            ->when(request('status'), function ($query) {
                $query->where('status', request('status') === 'on');
            })
            ->when(request('attached'), function ($query, $attached) {
                if ($attached === 'yes') {
                    $query->whereNotNull('device_id');
                } else {
                    $query->whereNull('device_id');
                }
            })
            ->orderBy('name');

        if (!$user->hasRole('Admin')) {
            $accessLevels = $user->load('organization.access_levels')->organization?->access_levels;
            $devicesArr = $accessLevels->pluck('devices')->whereNotNull()->toArray();
            $deviceIds = collect($devicesArr)->flatten()->values()->toArray();
            $devices = $devices->whereIn('device_id', $deviceIds);
        }

        if (request()->has('download')) {
            $devices = $devices->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'status' => $item->status,
                ];
            })->values()->toArray();
            return Excel::download(new HCPDevicesExport($devices), 'devices.xlsx');
        }

        $data = PaginateResource::make($devices->paginate(request('per_page', 10)), HCPDevicesResource::class);
        return Helper::response(true, $data);
    }

    public function exportStatistics()
    {
        $user = auth()->user();
        $organizations = Organization::query()
            ->leaderOrganizations($user)
            ->when(request('organizations'), function ($q) {
                $q->whereIn('id', explode(',', request('organizations')));
            })
            ->withCount(['devices as total_devices'])
            ->withCount(['devices as offline_devices' => function ($q) {
                $q->where('status', false);
            }])
            ->withCount(['worker_positions as total_workers'])
            ->withCount([
                'worker_positions as workers_without_university' => function ($q) {
                    $q->whereDoesntHave('worker.universities');
                }
            ])
            ->defaultOrder()
            ->get()
            ->toTree();

        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd   = now()->endOfMonth()->toDateString();

        $scheduledIds = DB::table('turnstile_worker_schedules')
            ->whereNull('deleted_at')
            ->select('worker_position_id')
            ->whereBetween('date', [$monthStart, $monthEnd])
            ->groupBy('worker_position_id');

        $vacationWorkerIds = DB::table('vacations')
            ->select('worker_id')
            ->whereDate('from', '<=', $monthEnd)
            ->whereDate('to', '>=', $monthStart)
            ->groupBy('worker_id');

        $orgStats = WorkerPosition::query()
            ->filter($user, request()->all())
            ->where('is_turnstile', true)
            ->when(request('departments'), function ($q) {
                $q->whereIn('department_id', explode(',', request('departments')));
            })
            ->whereNotIn('id', $scheduledIds)
            ->whereNotIn('worker_id', $vacationWorkerIds)
            ->selectRaw('organization_id, COUNT(*) as no_schedule_workers')
            ->groupBy('organization_id')
            ->get();

        $this->rows = collect();
        $this->flattenTree($organizations, 1, $orgStats);
        return Excel::download(new OrganizationDevicesExport($this->rows, $this->maxDepth), 'stat.xlsx');
    }

    private function flattenTree($nodes, $level, $orgStats): void
    {
        foreach ($nodes as $node) {
            [$totalDevices, $offlineDevices, $totalW, $schedule, $univer] =
                $this->childDevices($node, 0, 0, 0, 0, 0, $orgStats);
            $row = [
                'id' => $node->id,
                'level' => $level,
                'has_child' => $node->children && $node->children->count() > 0,
                "name_level_$level" => $node->name,
                "total_devices" => $totalDevices ?? 0,
                "offline_devices" => $offlineDevices ?? 0,
                "totalW" => $totalW ?? 0,
                'schedule' => $schedule,
                'univer' => $univer,
            ];

            $this->rows->push($row);
            $this->maxDepth = max($this->maxDepth, $level);

            if ($node->children && $node->children->count()) {
                $this->flattenTree($node->children, $level + 1, $orgStats);
            }
        }
    }

    public function childDevices($node, $totalDevices, $offlineDevices, $totalW, $schedule, $univer, $orgStats): array
    {
        $org = $orgStats->where('organization_id', $node->id)->first();

        $totalDevices += $node->total_devices ?? 0;
        $offlineDevices += $node->offline_devices ?? 0;
        $totalW += $node->total_workers ?? 0;
        $schedule += $org?->no_schedule_workers ?? 0;
        $univer += $node?->workers_without_university ?? 0;

        return [$totalDevices, $offlineDevices, $totalW, $schedule, $univer];
    }

    public function updateDevice(Request $request, $deviceId): JsonResponse
    {
        $request->validate([
            'device_id' => 'nullable|integer',
            "name" => "nullable|string",
            "device_code" => "nullable|string",
            "ip_address" => "nullable|ipv4",
            "mac_address" => "nullable|mac_address",
            "config" => "boolean",
            "log" => "boolean",
            "upload_workers" => "boolean",
            "contract_number" => "nullable|string",
            "contract_date" => "nullable|string",
            "price" => "nullable|string",
        ]);

        $data = $request->all();
        if ($request->device_id) {
            $deviceByDeviceId = HCPDevice::query()->where('device_id', $request->device_id)->first();
            if ((int)$deviceByDeviceId?->id !== (int)$deviceId) {
                $deviceByDeviceId?->forceDelete();
            }
        }
        HCPDevice::query()->find($deviceId)?->update($data);
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function storeDevice(Request $request): JsonResponse
    {
        $request->validate([
            'organization_id' => 'required',
            "name" => "nullable|string",
            "device_code" => "nullable|string",
            "ip_address" => "nullable|ipv4",
            "mac_address" => "nullable|mac_address",
            "config" => "boolean",
            "log" => "boolean",
            "upload_workers" => "boolean",
            "contract_number" => "nullable|string",
            "contract_date" => "nullable|string",
            "price" => "nullable|string",
        ]);

        HCPDevice::query()->create($request->all());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function deleteDevice($deviceId): JsonResponse
    {
        HCPDevice::query()->find($deviceId)?->forceDelete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

    public function refreshDevices(): JsonResponse
    {
        new HikCentralService()->devices();
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function syncWorkersToHikCentral(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'organization_id' => 'required|integer',
            'access_level_id' => 'required|integer',
            'departments' => 'sometimes|required'
        ]);

        $export = ExportWorkerToHikCentralJob::query()
            ->create([
                'user_id' => auth()->id(),
                'name' => $request->name,
            ]);

        if (!HikCentralAccessLevel::find($request->access_level_id)?->devices) {
            return Helper::response("Please, attach department and devices to AC", [], 400);
        }

        $organization = Organization::findOrFail($request->organization_id);

        OrganizationAccessLevel::query()
            ->updateOrCreate([
                'organization_id' => $organization->id,
                'hik_central_access_level_id' => $request->access_level_id,
            ]);

        ExportWorkersToHikCentralJob::dispatch(
            $export,
            $request->organization_id,
            $request->access_level_id,
            $request->departments ?? null,
            $request->worker_position_ids ?? null,
            $request->job ?? false,
            $request->department,
            null
        );

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function jobs(): JsonResponse
    {
        $data = ExportWorkerToHikCentralJob::query()
            ->when(request('search'), function ($query, $search) {
                $query->whereLike('name', '%' . $search . '%');
            })
            ->orderByDesc('id')
            ->withCount('error_workers')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, HikCentralJobResource::class);

        return Helper::response(true, $data);
    }

    public function errorWorkers(Request $request): JsonResponse
    {
        $request->validate([
            'job_id' => 'required|integer'
        ]);

        $data = ExportWorkerError::query()
            ->where('export_worker_to_hik_central_job_id', $request->job_id)
            ->with('worker:id,last_name,first_name,middle_name,photo')
            ->orderByDesc('id')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, ErrorJobWorkerResource::class);

        return Helper::response(true, $data);
    }
}
