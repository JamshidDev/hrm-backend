<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\Country;
use Modules\Structure\Transformers\Structure\CountryResource;

class CountryController implements HasMiddleware
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

        $data = Country::query()->search()->paginate($per_page);

        $countries = PaginateResource::make($data, CountryResource::class);

        return Helper::response(true, $countries);
    }


    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required'
        ]);

        $validated['id'] = Country::query()->withTrashed()->max('id') + 1;
        Country::create($validated);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Country $country): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required'
        ]);

        $country->update($validated);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Country $country): JsonResponse
    {
        $country->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
