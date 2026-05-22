<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Enums\OrganizationLevelEnum;
use Modules\Structure\Models\Organization;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Organization\OrganizationResource;

class OrganizationController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $organizations = Organization::Search()
            ->whereIsRoot()
            ->with('city.region')
            ->with('descendants')
            ->paginate($per_page);

        $data = PaginateResource::make($organizations, OrganizationResource::class);

        return Helper::response(true, $data);
    }

    public function list(Request $request): JsonResponse
    {
        $data = Organization::query()
            ->whereLike('name', "%$request->search%")
            ->orWhereLike('full_name', "%$request->search%")
            ->get();
        $data = OrganizationListResource::collection($data);
        return Helper::response(true, $data);
    }


    public function levels(): JsonResponse
    {
        $levels = OrganizationLevelEnum::list();
        return Helper::response(true, $levels);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'city_id' => 'required|integer|exists:cities,id',
            'name' => 'required',
            'full_name' => 'required',
            'level' => 'required',
            'group' => 'boolean',
            'code' => 'required',
        ]);

        $data = $request->all();
        $data['id'] = Organization::query()->max('id') + 1;

        if ($request->parent_id) {
            $parent = Organization::find($request->parent_id);

            if (!$parent) {
                return Helper::response(trans('messages.organization_not_found'), 404);
            }

            $child = new Organization($data);
            $parent->appendNode($child);
        } else {
            Organization::create($data);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function show(Organization $organization): JsonResponse
    {
        $organization->load('city.region');

        $item = new OrganizationResource($organization);

        $data = $organization->children()->with('city.region')->get();

        return Helper::response(true, [
            'organization' => $item,
            'children' => OrganizationResource::collection($data)
        ]);
    }


    public function update(Request $request, Organization $organization): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => 'sometimes|required|integer|exists:cities,id',
            'name' => 'sometimes|required',
            'full_name' => 'sometimes|required',
            'level' => 'sometimes|required',
            'group' => 'sometimes|boolean',
            'code' => 'sometimes|required',
            "external" => "sometimes|required",
        ]);

        $organization->fill($validated);

        if ($request->parent_id) {
            $parent = Organization::find($request->parent_id);
            $organization->appendToNode($parent)->save();
        } else {
            $organization->makeRoot()->save();
        }

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Organization $organization): JsonResponse
    {
        $organization->forceDelete();
        return Helper::response(trans('messages.successfully_deleted'));
    }

}
