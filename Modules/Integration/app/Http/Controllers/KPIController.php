<?php

namespace Modules\Integration\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;

class KPIController extends Controller
{
    public function report(): JsonResponse
    {
        $organizations_count  = Organization::query()->whereGroup(false)->count();

        $workers_count = WorkerPosition::query()
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->count();

        return Helper::response(true, [
            'organizations_count' => $organizations_count,
            'workers_count' => $workers_count,
        ]);
    }
}
