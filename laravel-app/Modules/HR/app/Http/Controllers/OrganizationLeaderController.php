<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\OrganizationLeader\OrganizationLeaderIndexRequest;
use Modules\HR\Http\Requests\OrganizationLeader\OrganizationLeaderStoreRequest;
use Modules\HR\Http\Requests\OrganizationLeader\OrganizationLeaderUpdateRequest;
use Modules\HR\Models\OrganizationLeader;
use Modules\HR\Services\OrganizationLeaderService;
use Modules\HR\Transformers\OrganizationLeader\OrganizationLeaderResource;

class OrganizationLeaderController extends Controller
{
    public function __construct(
        private readonly OrganizationLeaderService $service
    )
    {
    }

    public function index(OrganizationLeaderIndexRequest $request): JsonResponse
    {
        $data = $this->service->paginate(
            $request->validated(),
            auth()->user()
        );

        return Helper::response(
            true,
            PaginateResource::make($data, OrganizationLeaderResource::class)
        );
    }

    public function store(
        OrganizationLeaderStoreRequest $request
    ): JsonResponse
    {
        $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(OrganizationLeaderUpdateRequest $request, $organizationLeaderId): JsonResponse
    {

        $organizationLeader = OrganizationLeader::findOrFail($organizationLeaderId);
        $this->service->update(
            $organizationLeader,
            $request->validated()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($organizationLeaderId): JsonResponse
    {

        $organizationLeader = OrganizationLeader::findOrFail($organizationLeaderId);
        $this->service->delete($organizationLeader);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
