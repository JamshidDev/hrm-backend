<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Http\Requests\Nationality\NationalityStoreRequest;
use Modules\HR\Http\Requests\Nationality\NationalityUpdateRequest;
use Modules\HR\Models\Nationality;
use Modules\HR\Services\NationalityService;
use Modules\HR\Transformers\Nationality\NationalityResource;

class NationalityController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:nationalities-write', only: ['destroy', 'store', 'update'])
        ];
    }

    public function __construct(public NationalityService $service)
    {}

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $data = Nationality::query()->search()->paginate($per_page);
        $nationalities = PaginateResource::make($data, NationalityResource::class);
        return Helper::response(true, $nationalities);
    }


    public function store(NationalityStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(NationalityUpdateRequest $request, $nationalityId): JsonResponse
    {
        $nationality = Nationality::findOrFail($nationalityId);
        $this->service->update($nationality, $request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($nationalityId): JsonResponse
    {
        $nationality = Nationality::findOrFail($nationalityId);
        $this->service->delete($nationality);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
