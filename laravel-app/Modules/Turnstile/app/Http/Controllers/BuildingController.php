<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Turnstile\Models\Building;
use Modules\Turnstile\Transformers\BuildingResource;

class BuildingController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $query = Building::query()->search()->paginate($per_page);
        $data = PaginateResource::make($query, BuildingResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required']);
        $data = $request->all();
        $data['id'] = Building::query()->max('id') + 1;
        Building::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Building $building): JsonResponse
    {
        $request->validate(['name' => 'required']);
        $building->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Building $building): JsonResponse
    {
        $building->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
