<?php

namespace App\Http\Controllers\Admin;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuthenticationLogResource;
use App\Http\Resources\PaginateResource;
use App\Models\AuthenticationLog;
use Illuminate\Http\JsonResponse;

class AuthenticationLogController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $logs = AuthenticationLog::query()
            ->search()
            ->filterByUserOrganization()
            ->orderByDesc('id')
            ->paginate($per_page);

        $logs = PaginateResource::make($logs, AuthenticationLogResource::class);

        return Helper::response(true, $logs);

    }


}
