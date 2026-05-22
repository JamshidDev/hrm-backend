<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Models\ReportConfirmation;
use Modules\Confirmation\Transformers\ReportConfirmationResource;

class ReportConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();
        $confirmations = ReportConfirmation::query()
            ->filter($user, request()->all())
            ->whereHas('report')
            ->with([
                'report.organization',
                'report.confirmations'
            ])
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, ReportConfirmationResource::class);
        return Helper::response(true, $data);
    }
}
