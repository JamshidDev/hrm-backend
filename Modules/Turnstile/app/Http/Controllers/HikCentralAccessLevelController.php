<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Http\Requests\HikCentralAccessLevel\HikCentralAccessLevelUpdateRequest;
use Modules\Turnstile\Http\Requests\HikCentralAccessLevel\HikCentralOrganizationAccessLevelAttachRequest;
use Modules\Turnstile\Services\HikCentralAccessLevelService;

class HikCentralAccessLevelController extends Controller
{
    public function __construct(
        private readonly HikCentralAccessLevelService $service
    ) {
    }

    public function syncAccessLevels(): JsonResponse
    {
        $this->service->syncAccessLevels();
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function departments(): JsonResponse
    {
        return Helper::response(true, $this->service->departments());
    }

    public function update(int $id, HikCentralAccessLevelUpdateRequest $request): JsonResponse
    {
        $this->service->update($id, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function index(Request $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginate($request->all()));
    }

    public function organizationAccessLevels(Request $request): JsonResponse
    {
        return Helper::response(true, $this->service->organizationAccessLevels((int)$request->get('organization_id')));
    }

    public function allAccessLevels(Request $request): JsonResponse
    {
        return Helper::response(true, $this->service->allAccessLevels($request->all(), auth()->user()));
    }

    public function attachAccessLevelToOrganization(HikCentralOrganizationAccessLevelAttachRequest $request): JsonResponse
    {
        $this->service->attachAccessLevelToOrganization($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }
}
