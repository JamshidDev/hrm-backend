<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Models\User;
use Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\UserTurnstileDevice;
use Modules\Turnstile\Transformers\UserDevicesResource;
use Modules\Turnstile\Transformers\UserWorkerResource;

class UserDeviceNotifyController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::select('users.*')
            ->join('user_turnstile_devices as utd', 'utd.user_id', '=', 'users.id')
            ->withCount('hcp_devices')
            ->groupBy('users.id')
            ->with(['worker:id,last_name,first_name,middle_name,photo'])
            ->paginate(request('per_page', 10));

        $users = PaginateResource::make($users, UserDevicesResource::class);

        return Helper::response(true, $users);
    }

    public function devices(): JsonResponse
    {
        return Helper::response(true, [
            'devices' => HCPDevice::query()->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->device_id,
                        'name' => $item->name,
                        'status' => $item->status ? 1 : 2,
                    ];
                })
        ]);
    }

    public function edit($id): JsonResponse
    {
        $devices = HCPDevice::query()
            ->whereIn('device_id', UserTurnstileDevice::query()
                ->where('user_id', $id)
                ->pluck('hik_central_device_id')
                ->map(fn($val) => (string)$val)
                ->toArray())
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->device_id,
                    'name' => $item->name
                ];
            })
            ->values()
            ->toArray();

        return Helper::response(true, $devices);
    }

    public function users(): JsonResponse
    {
        $users = User::query()
            ->whereHas('telegram')
            ->whereHas('worker')
            ->with(['worker:id,last_name,first_name,middle_name'])
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', fn ($query) => $query->searchByFullName());
            })
            ->paginate(request('per_page', 50));

        $data = PaginateResource::make($users, UserWorkerResource::class);

        return Helper::response(true, $data);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'devices' => 'required|array',
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::find($request->user_id);
        if (!$user) {
            return Helper::response(trans('messages.user_not_found'), [], 400);
        }
        $user->hcp_devices()->delete();

        $devices = collect($request->devices)
            ->map(fn($id) => ['hik_central_device_id' => (int)$id])
            ->toArray();
        $user->hcp_devices()->createMany($devices);

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($id): JsonResponse
    {
        UserTurnstileDevice::query()
            ->where('user_id', $id)
            ->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
