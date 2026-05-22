<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\OrganizationDisciplinary\OrganizationDisciplinaryIndexRequest;
use Modules\HR\Services\OrganizationDisciplinaryService;
use Modules\HR\Transformers\DisciplinaryAction\DisciplinaryResource;

class OrganizationDisciplinaryController extends Controller
{
    public function __construct(
        private readonly OrganizationDisciplinaryService $service
    )
    {
    }

    public function index(OrganizationDisciplinaryIndexRequest $request): JsonResponse
    {
        $result = $this->service->list(
            $request->validated(),
            auth()->user()
        );

        if (!$result) {
            return Helper::response(trans('messages.successfully_exported'));
        }

        return Helper::response(true, PaginateResource::make($result, DisciplinaryResource::class));
    }

}
