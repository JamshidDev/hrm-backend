<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\IntegrationApiLogResource;
use App\Http\Resources\PaginateResource;
use App\Models\HmacUser;
use App\Models\IntegrationApiLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class IntegrationApiLogController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = $this->filteredQuery()
            ->with([
                'model' => function ($morphTo) {
                    $morphTo->morphWith([
                        User::class => ['worker:id,last_name,first_name,middle_name'],
                    ]);
                }
            ])
            ->select([
                'id', 'model_id', 'model_type', 'secret', 'api_type', 'endpoint', 'method',
                'request_headers', 'request_body', 'response_status', 'error', 'duration_ms', 'created_at'
            ])
            ->orderByDesc('id')
            ->paginate($per_page);

        $roles = PaginateResource::make($data, IntegrationApiLogResource::class);

        return Helper::response(true, $roles);
    }

    public function users(): JsonResponse
    {
        $users = HmacUser::query()
            ->get()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'public_key' => $user->public_key,
                    'secret_type' => $user->secret_type,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                    'is_active' => $user->is_active,
                ];
            });
        return Helper::response(true, $users);
    }

    public function summary(): JsonResponse
    {
        $data = $this->filteredQuery()
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw("COUNT(*) FILTER (WHERE response_status BETWEEN 200 AND 299) as success_requests")
            ->selectRaw("COUNT(*) FILTER (WHERE response_status >= 400) as error_requests")
            ->selectRaw('COALESCE(ROUND(AVG(duration_ms), 2), 0) as avg_duration_ms')
            ->selectRaw('COALESCE(MAX(duration_ms), 0) as max_duration_ms')
            ->selectRaw("COUNT(DISTINCT (COALESCE(model_type, '') || ':' || COALESCE(model_id::text, '0'))) as unique_clients")
            ->first();

        return Helper::response(true, $data);
    }

    public function timeline(): JsonResponse
    {
        $groupBy = request('group_by', 'day');
        $format = $groupBy === 'hour' ? 'YYYY-MM-DD HH24:00:00' : 'YYYY-MM-DD';

        $data = $this->filteredQuery()
            ->selectRaw("to_char(created_at, '{$format}') as period")
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw("COUNT(*) FILTER (WHERE response_status >= 400) as error_requests")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return Helper::response(true, $data);
    }

    public function topClients(): JsonResponse
    {
        $limit = (int)request('limit', 10);

        $rows = $this->filteredQuery()
            ->selectRaw('model_type, model_id')
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw("COUNT(*) FILTER (WHERE response_status >= 400) as error_requests")
            ->selectRaw('COALESCE(ROUND(AVG(duration_ms), 2), 0) as avg_duration_ms')
            ->selectRaw('MAX(created_at) as last_request_at')
            ->groupBy('model_type', 'model_id')
            ->orderByDesc('total_requests')
            ->limit($limit)
            ->get();

        return Helper::response(true, $this->mapClients($rows));
    }

    public function topEndpoints(): JsonResponse
    {
        $limit = (int)request('limit', 10);

        $data = $this->filteredQuery()
            ->selectRaw('endpoint, method')
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw("COUNT(*) FILTER (WHERE response_status >= 400) as error_requests")
            ->selectRaw('COALESCE(ROUND(AVG(duration_ms), 2), 0) as avg_duration_ms')
            ->groupBy('endpoint', 'method')
            ->orderByDesc('total_requests')
            ->limit($limit)
            ->get();

        return Helper::response(true, $data);
    }

    public function methods(): JsonResponse
    {
        $data = $this->filteredQuery()
            ->selectRaw('method')
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw("COUNT(*) FILTER (WHERE response_status >= 400) as error_requests")
            ->selectRaw('COALESCE(ROUND(AVG(duration_ms), 2), 0) as avg_duration_ms')
            ->groupBy('method')
            ->orderByDesc('total_requests')
            ->get();

        return Helper::response(true, $data);
    }

    public function statuses(): JsonResponse
    {
        $data = $this->filteredQuery()
            ->selectRaw('response_status')
            ->selectRaw('COUNT(*) as total_requests')
            ->groupBy('response_status')
            ->orderBy('response_status')
            ->get();

        return Helper::response(true, $data);
    }

    private function filteredQuery(): Builder
    {
        $query = IntegrationApiLog::query();

        $dateFrom = request('date_from')
            ? Carbon::parse(request('date_from'))->startOfDay()
            : now()->subDays(7)->startOfDay();
        $dateTo = request('date_to')
            ? Carbon::parse(request('date_to'))->endOfDay()
            : now()->endOfDay();

        return $query
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->when(request('api_type'), fn($q, $apiType) => $q->where('api_type', $apiType))
            ->when(request('model_type'), fn($q, $modelType) => $q->where('model_type', $modelType))
            ->when(request('model_id'), fn($q, $modelId) => $q->where('model_id', $modelId))
            ->when(request('method'), fn($q, $method) => $q->where('method', strtoupper($method)))
            ->when(request('response_status'), fn($q, $status) => $q->where('response_status', $status))
            ->when(request('endpoint'), fn($q, $endpoint) => $q->where('endpoint', 'like', '%' . $endpoint . '%'))
            ->when(request('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('secret', 'like', '%' . $search . '%')
                        ->orWhere('endpoint', 'like', '%' . $search . '%');
                });
            });
    }

    private function mapClients(Collection $rows): Collection
    {
        $users = User::query()
            ->with('worker:id,last_name,first_name,middle_name')
            ->whereIn('id', $rows->where('model_type', User::class)->pluck('model_id')->filter()->all())
            ->get()
            ->keyBy('id');

        $hmacUsers = HmacUser::query()
            ->whereIn('id', $rows->where('model_type', HmacUser::class)->pluck('model_id')->filter()->all())
            ->get()
            ->keyBy('id');

        return $rows->map(function ($row) use ($users, $hmacUsers) {
            $client = null;

            if ($row->model_type === User::class) {
                $user = $users->get($row->model_id);
                $fullName = trim(collect([
                    $user?->worker?->last_name,
                    $user?->worker?->first_name,
                    $user?->worker?->middle_name,
                ])->filter()->implode(' '));

                $client = [
                    'id' => $user?->id,
                    'type' => 'sanctum_user',
                    'name' => $fullName ?: ($user?->phone ?? "User #{$row->model_id}"),
                    'secret_type' => 'sanctum_user',
                ];
            } elseif ($row->model_type === HmacUser::class) {
                $hmacUser = $hmacUsers->get($row->model_id);

                $client = [
                    'id' => $hmacUser?->id,
                    'type' => 'hmac_user',
                    'name' => $hmacUser?->name ?? "HmacUser #{$row->model_id}",
                    'secret_type' => $hmacUser?->secret_type,
                ];
            }

            return [
                'model_type' => $row->model_type,
                'model_id' => $row->model_id,
                'client' => $client,
                'total_requests' => (int)$row->total_requests,
                'error_requests' => (int)$row->error_requests,
                'avg_duration_ms' => (float)$row->avg_duration_ms,
                'last_request_at' => $row->last_request_at,
            ];
        });
    }

    public function update(Request $request, $userId)
    {
        $data = $request->validate([
            'is_active' => 'boolean',
            'name' => 'nullable|string',
            'public_key' => 'nullable|string',
            'secret_key' => 'nullable|string',
            'secret_type' => 'nullable|string',
        ]);
        $user = HmacUser::findOrFail($userId);
        $data = array_filter($data, fn($value) => !is_null($value));
        $user->update($data);

        Cache::forget('hmac_user_sanctum_' . $user->phone);

        return Helper::response(trans('messages.successfully_updated'));
    }

}
