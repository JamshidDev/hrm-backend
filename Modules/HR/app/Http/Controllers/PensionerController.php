<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Modules\HR\Http\Requests\Pensioner\PensionerStoreRequest;
use Modules\HR\Http\Requests\Pensioner\PensionerUpdateRequest;
use Modules\HR\Models\Pensioner;
use Modules\HR\Services\PensionerService;
use Modules\HR\Transformers\Pensioner\PensionerResource;

class PensionerController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('can:hr-pensioners-write', only: ['destroy', 'store', 'update'])];
    }

    public function __construct(
        public PensionerService $service
    )
    {
    }

    public function index(): JsonResponse
    {
        $result = $this->service->paginate(
            request()->all(),
            auth()->user()
        );

        if (!$result) {
            return Helper::response(trans('messages.successfully_exported'));
        }

        return Helper::response(true, PaginateResource::make($result, PensionerResource::class));
    }

    public function listMed(): JsonResponse
    {
        $data = $this->service->listMed(request()->all());

        return Helper::response(
            true,
            PaginateResource::make($data, PensionerResource::class)
        );
    }

    public function store(PensionerStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(PensionerUpdateRequest $request, $pensionerId): JsonResponse
    {
        $pensioner = Pensioner::findOrFail($pensionerId);
        $this->service->update(
            $pensioner,
            $request->toArrayData()
        );

        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($pensionerId): JsonResponse
    {
        $pensioner = Pensioner::findOrFail($pensionerId);
        $this->service->delete($pensioner);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
