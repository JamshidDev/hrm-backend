<?php

namespace Modules\Med\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Med\Transformers\WorkerPositionResource;

class WorkerController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = WorkerPosition::query()
            ->select(
                'position_id',
                'position_date',
                'worker_id',
                'organization_id',
                'department_id',
                'group',
                'type',
            )
            ->when(request('organizations'), function ($query, $organizations) {
                $query->whereIn('organization_id', explode(',', $organizations));
            })
            ->remainingFilter()
            ->search()
            ->with([
                'department:id,name,level',
                'organization:id,name,name_en,name_ru,group',
                'position:id,name',
                'worker:id,uuid,last_name,first_name,middle_name,birthday,photo,education',
            ])
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->orderBy('organization_id')
            ->orderBy('department_id')
            ->orderBy('department_position_id')
            ->paginate($per_page);

        $data = PaginateResource::make($data, WorkerPositionResource::class);

        return Helper::response(true, $data);
    }
}
