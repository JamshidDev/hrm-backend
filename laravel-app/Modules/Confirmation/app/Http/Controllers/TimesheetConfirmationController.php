<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\TimesheetConfirmation;
use Modules\Confirmation\Transformers\TimesheetResource;

class TimesheetConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();
        $confirmations = TimesheetConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'timesheet.work_place',
                'timesheet.department',
                'timesheet.user.worker',
                'timesheet.user.worker.position.department:id,name,level',
                'timesheet.user.worker.position.position:id,name',
                'timesheet.workers',
            ])
            ->whereHas('timesheet', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, TimesheetResource::class);

        return Helper::response(true, $data);
    }


}
