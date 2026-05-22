<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\StaffingApproveConfirmation;
use Modules\Confirmation\Transformers\StaffingApproveConfirmationResource;

class StaffingApproveConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $user = auth()->user();
        $confirmations = StaffingApproveConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'staffing_approve.organization',
                'staffing_approve.confirmations',
                'staffing_approve.confirmatory'
            ])
            ->whereHas('staffing_approve', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, StaffingApproveConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
