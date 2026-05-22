<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\Vacation\VacationCalculateRequest;
use Modules\HR\Http\Requests\Vacation\VacationCreateRequest;
use Modules\HR\Http\Requests\Vacation\VacationIndexRequest;
use Modules\HR\Services\VacationService;
use Modules\HR\Transformers\Vacation\VacationResource;

class VacationController extends Controller
{
    public function __construct(
        private readonly VacationService $service
    )
    {
    }

    public function index(VacationIndexRequest $request): JsonResponse
    {
        $result = $this->service->list(
            $request->validated(),
            auth()->user()
        );

        if (!$result) {
            return Helper::response(trans('messages.successfully_exported'));
        }

        return Helper::response(true, PaginateResource::make($result, VacationResource::class));
    }

    public function create(VacationCreateRequest $request): JsonResponse
    {
        $data = $this->service->getLastVacations(
            $request->validated('worker_positions')
        );

        return Helper::response(true, $data);
    }

    public function calculate(VacationCalculateRequest $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->service->calculate(
                collect($request->validated('worker_positions'))
            )
        );
    }

}
