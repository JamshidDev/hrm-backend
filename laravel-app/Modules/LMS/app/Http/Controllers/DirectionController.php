<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\LMS\Models\Direction;
use Modules\LMS\Transformers\DirectionListResource;

class DirectionController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Direction::query()->search()->orderByDesc('id')->paginate($per_page);

        $data = PaginateResource::make($data, DirectionListResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required']);

        Direction::create($request->all());

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Direction $direction): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required',
            'name_ru' => 'sometimes|required',
            'name_en' => 'sometimes|required',
        ]);

        $direction->update($validated);

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Direction $direction): JsonResponse
    {
        $direction->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
