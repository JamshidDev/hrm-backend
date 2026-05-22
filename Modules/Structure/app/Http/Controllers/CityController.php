<?php

namespace Modules\Structure\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\City;
use Modules\Structure\Transformers\Structure\CityResource;

class CityController implements HasMiddleware
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

        $data = City::query()->search()->with('region.country')->paginate($per_page);

        $cities = PaginateResource::make($data, CityResource::class);

        return Helper::response( true, $cities);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'region_id' => 'required',
            'name' => 'required'
        ]);

        $data = $request->all();
        $data['id'] = City::query()->withTrashed()->max('id') + 1;
        City::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, City $city): JsonResponse
    {
        $request->validate([
            'region_id' => 'required',
            'name' => 'required'
        ]);

        $city->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(City $city): JsonResponse
    {
        $city->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
