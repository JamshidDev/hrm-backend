<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\PaginateResource;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $logs = ActivityLog::query()
            ->search()
            ->filterByUserOrganization()
            ->orderByDesc('id')
            ->paginate($per_page);

        $logs = PaginateResource::make($logs, ActivityLogResource::class);

        return Helper::response(true, $logs);

    }

}
