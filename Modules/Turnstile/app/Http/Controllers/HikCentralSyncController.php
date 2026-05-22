<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Models\SyncHCPAccessLog;
use Modules\Turnstile\Models\SyncOfflineDevice;
use Modules\Turnstile\Transformers\HCPDeviceResource;
use Modules\Turnstile\Transformers\SyncAccessLogResource;

class HikCentralSyncController extends Controller
{
    public function index(): JsonResponse
    {
        $data = SyncHCPAccessLog::query()
            ->orderByDesc('id')
            ->with('user.worker:id,last_name,first_name,middle_name,photo')
            ->paginate(request('per_page', 10));

        $data = PaginateResource::make($data, SyncAccessLogResource::class);
        return Helper::response(true, $data);
    }

    public function show($syncHCPAccessLogId): JsonResponse
    {
        $syncHCPAccessLog = SyncHCPAccessLog::with('sync_events.device')
            ->findOrFail($syncHCPAccessLogId);
        return Helper::response(true, $syncHCPAccessLog->sync_events->map(function ($item) {
            return [
                'device' => new HCPDeviceResource($item->device),
                'start_time' => $item->start_time,
                'end_time' => $item->end_time,
                'events_count' => $item->events_count,
            ];
        }));
    }

    public function offlineDevices($syncHCPAccessLogId): JsonResponse
    {
        return Helper::response(true, [
            'devices'  => SyncOfflineDevice::query()
                ->where('sync_h_c_p_access_log_id', $syncHCPAccessLogId)
                ->get()
        ]);
    }

}
