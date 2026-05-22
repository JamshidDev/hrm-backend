<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\Region;
use Modules\Structure\Transformers\Structure\RegionResource;

class RegionController implements HasMiddleware
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

        $data = Region::query()->Search()->with('country')->paginate($per_page);

        $regions = PaginateResource::make($data, RegionResource::class);

        return Helper::response(true, $regions);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'country_id' => 'required',
            'name' => 'required'
        ]);

        $data = $request->all();
        $data['id'] = Region::query()->withTrashed()->max('id') + 1;
        Region::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Region $region): JsonResponse
    {
        $request->validate([
            'country_id' => 'required',
            'name' => 'required'
        ]);

        $region->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Region $region): JsonResponse
    {
        $region->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
