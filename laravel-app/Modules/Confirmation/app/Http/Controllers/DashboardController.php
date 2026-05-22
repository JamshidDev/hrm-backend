<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Http\Controllers\Controller;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Models\WorkerApplication;

class DashboardController extends Controller
{
    public function workerApplicationStatistics()
    {
        $applicationsCounts = WorkerApplication::query()
            ->get()
            ->groupBy('confirmation')
            ->map(fn($group) => $group->count());

        $allTypes = ConfirmationStatusEnum::cases();

        return collect($allTypes)->map(fn($type) => [
            'id'               => $type->value,
            'name'             => ConfirmationStatusEnum::get($type->value, null),
            'applications' => $applicationsCounts[$type->value] ?? 0,
        ])->values();
    }
}
