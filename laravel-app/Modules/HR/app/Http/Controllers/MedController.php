<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Modules\HR\Http\Requests\Med\MedIndexRequest;
use Modules\HR\Http\Requests\Med\MedStoreRequest;
use Modules\HR\Http\Requests\Med\MedUpdateRequest;
use Modules\HR\Models\Med;
use Modules\HR\Services\MedService;
use Modules\HR\Transformers\Med\MedEditResource;
use Modules\HR\Transformers\Med\MedResource;

class MedController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        private readonly MedService $service
    )
    {
    }

    public function index(MedIndexRequest $request): JsonResponse
    {
        $data = $this->service->list($request->validated(), auth()->user());
        return Helper::response(true, PaginateResource::make($data, MedResource::class));
    }

    public function edit($medId): JsonResponse
    {
        $med = Med::findOrFail($medId);
        $med->load('organization:id,name,name_en,name_ru,group');
        return Helper::response(
            true,
            new MedEditResource($med)
        );
    }

    public function store(MedStoreRequest $request): JsonResponse
    {
        $this->service->store($request->toDto());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function update(MedUpdateRequest $request, $medId): JsonResponse
    {
        $med = Med::findOrFail($medId);
        $this->service->update(
            $med,
            $request->toDto($med)
        );
        return Helper::response(trans('messages.successfully_updated'));
    }

    public function destroy($medId): JsonResponse
    {
        $med = Med::findOrFail($medId);
        $this->service->delete($med);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
