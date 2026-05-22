<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Structure\Models\Organization;
use Modules\Turnstile\Transformers\OrganizationTerminalResource;
use Modules\Turnstile\Transformers\TerminalMinimalResource;

class OrganizationTerminalController extends Controller
{
    public function index(): JsonResponse
    {
        $organizations = Organization::query()
            ->withCount('terminals')
            ->get()
            ->toTree();

        $data = OrganizationTerminalResource::collection($organizations);

        return Helper::response(true, $data);
    }

    public function show($id): JsonResponse
    {
        $organization = Organization::query()
            ->with('terminals')
            ->find($id);

        $data = TerminalMinimalResource::collection($organization?->terminals);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'terminals'       => 'sometimes|array',
            'organization_id' => 'required|exists:organizations,id'
        ]);

        $organization = Organization::findOrFail($request->organization_id);
        $organization->terminals()->sync($request->terminals);

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy($organizationId): JsonResponse
    {
        $organization = Organization::findOrFail($organizationId);
        $organization->terminals()->detach();

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
