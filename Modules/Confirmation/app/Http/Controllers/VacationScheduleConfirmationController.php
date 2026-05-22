<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\VacationScheduleConfirmation;
use Modules\Confirmation\Transformers\VacationScheduleConfirmationResource;

class VacationScheduleConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $data = VacationScheduleConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'schedule',
                'schedule.organization',
                'schedule.director.worker',
                'schedule.tradeUnion.worker',
                'schedule.creator.worker'
            ])
            ->whereHas('schedule', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($data, VacationScheduleConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
