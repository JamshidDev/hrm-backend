<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\Structure\Models\University;
use Modules\Structure\Transformers\University\UniversityResource;

class UniversityController implements HasMiddleware
{

    public static function middleware(): array
    {
        return [
            new Middleware('permission:universities-write', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = University::query()->search()
            ->with('city.region')
            ->paginate($per_page);

        $universities = PaginateResource::make($data, UniversityResource::class);

        return Helper::response(true, $universities);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'city_id' => 'required',
            'education' => 'required',
            'type' => 'required',
        ]);

        University::query()->create([
            'id' => University::query()->withTrashed()->max('id') + 1,
            'name' => $request->name,
            'name_en' => $request->name_en,
            'name_ru' => $request->name_ru,
            'city_id' => $request->city_id,
            'education' => $request->education,
            'type' => $request->type,
        ]);

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, University $university): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'city_id' => 'required',
            'education' => 'required',
            'type' => 'required',
        ]);

        $university->update([
            'name' => $request->name,
            'name_en' => $request->name_en,
            'name_ru' => $request->name_ru,
            'city_id' => $request->city_id,
            'education' => $request->education,
            'type' => $request->type,
        ]);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(University $university): JsonResponse
    {
        $university->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
