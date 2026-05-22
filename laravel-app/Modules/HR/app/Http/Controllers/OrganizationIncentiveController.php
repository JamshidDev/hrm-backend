<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\OrganizationIncentive\OrganizationIncentiveIndexRequest;
use Modules\HR\Services\OrganizationIncentiveService;
use Modules\HR\Transformers\Incentives\IncentiveResource;

class OrganizationIncentiveController extends Controller
{
    public function __construct(private readonly OrganizationIncentiveService $service)
    {
    }

    public function index(OrganizationIncentiveIndexRequest $request): JsonResponse
    {
        $result = $this->service->list(
            $request->validated(),
            auth()->user()
        );

        if (!$result) {
            return Helper::response(trans('messages.successfully_exported'));
        }

        return Helper::response(true, PaginateResource::make($result, IncentiveResource::class));
    }

}
