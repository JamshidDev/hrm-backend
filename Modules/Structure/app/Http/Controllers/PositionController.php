<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\Position;
use Modules\Structure\Transformers\Position\PositionResource;

class PositionController implements HasMiddleware
{
    use Base64FileUploadTrait;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:admin', only: ['store', 'update', 'destroy']),
        ];
    }
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);

        $data = Position::query()
            ->search()
            ->when(request('ids'), function ($q) {
                $q->whereIn('id', explode(',', request('ids')));
            })
            ->orderBy('name')
            ->paginate($per_page);

        $positions = PaginateResource::make($data, PositionResource::class);
        return Helper::response(true, $positions);
    }


    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required']);

        $data = $request->all();

        DB::transaction(function () use ($request, $data) {
            $data['id'] = Position::query()->withTrashed()->max('id') + 1;
            $data['file'] = $this->uploadFormFile($request->file('file'), 'position-examples', ['doc', 'docx']);

            Position::query()->create($data);
        });

        return Helper::response(trans('messages.successfully_stored'));
    }


    public function update(Request $request, Position $position): JsonResponse
    {
        $request->validate([
            'name' => 'required'
        ]);

        $data = $request->all();

        DB::transaction(function () use ($request, $position, $data) {
            if ($request->hasFile('file')) {
                $data['file'] = $this->uploadFormFile($request->file('file'), 'position-examples', ['doc', 'docx']);
            }

            $position->update($data);
        });

        return Helper::response(trans('messages.successfully_updated'));
    }


    public function destroy(Position $position): JsonResponse
    {
        $position->delete();

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
