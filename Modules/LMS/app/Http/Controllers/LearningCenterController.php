<?php

namespace Modules\LMS\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;
use Modules\LMS\Models\LearningCenter;
use Modules\LMS\Transformers\LearningCenterListResource;

class LearningCenterController implements HasMiddleware
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

        $data = LearningCenter::query()
            ->search()
            ->orderByDesc('id')
            ->with([
                'users.worker:id,last_name,first_name,middle_name,photo,birthday'
            ])
            ->paginate($per_page);

        $data = PaginateResource::make($data, LearningCenterListResource::class);

        return Helper::response(true, $data);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required',
            'code' => 'required',
        ]);

        $learningCenter = LearningCenter::create($request->all());

        if ($request->users) {
            $learningCenter->users()->sync($request->users);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, LearningCenter $learningCenter): JsonResponse
    {
        $request->validate([
            'name' => 'required|sometimes',
            'code' => 'required|sometimes'
        ]);

        $learningCenter->update($request->all());

        if ($request->users) {
            $learningCenter->users()->sync($request->users);
        }

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(LearningCenter $learningCenter): JsonResponse
    {
        $learningCenter->delete();

        return Helper::response(true, trans('messages.successfully_deleted'));
    }
}
