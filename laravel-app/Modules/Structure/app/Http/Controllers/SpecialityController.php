<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\Speciality;
use Modules\Structure\Transformers\University\SpecialityResource;

class SpecialityController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:specialities-write', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Speciality::query()
            ->search()
            ->paginate($per_page);

        $specialities = PaginateResource::make($data, SpecialityResource::class);

        return Helper::response(true, $specialities);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required']);

        $data = $request->all();
        $data['id'] = Speciality::query()->withTrashed()->max('id') + 1;
        Speciality::query()->create($data);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Speciality $speciality): JsonResponse
    {
        $request->validate(['name' => 'required']);

        $speciality->update($request->all());

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Speciality $speciality): JsonResponse
    {
        $speciality->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
