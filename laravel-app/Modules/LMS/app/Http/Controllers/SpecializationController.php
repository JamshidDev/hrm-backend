<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\Specialization;
use Modules\LMS\Transformers\SpecializationListResource;
use Modules\LMS\Transformers\SpecializationShowResource;

class SpecializationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Specialization::query()
            ->search()
            ->with('direction')
            ->withCount('positions')
            ->paginate($per_page);

        $data = PaginateResource::make($data, SpecializationListResource::class);

        return Helper::response(true, $data);
    }

    public function show(Specialization $specialization): JsonResponse
    {
        $data = $specialization
            ->load([
                'positions',
                'direction',
            ]);

        return Helper::response(true, new SpecializationShowResource($data));
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required', 'direction_id' => 'required']);

        $specialization = Specialization::create($request->all());

        if ($request->positions) {
            $specialization->positions()->sync($request->positions);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Specialization $specialization): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required',
            'direction_id' => 'sometimes|required',
            'name_ru' => 'sometimes|required',
            'name_en' => 'sometimes|required',
            'positions' => 'sometimes|array'
        ]);

        $specialization->update($validated);

        if ($request->positions) {
            $specialization->positions()->sync($request->positions);
        }

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Specialization $specialization): JsonResponse
    {
        $specialization->delete();
        $specialization->positions()->detach();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
