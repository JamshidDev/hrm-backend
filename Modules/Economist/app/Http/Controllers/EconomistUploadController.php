<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Economist\Http\Requests\EconomistUpload\EconomistUploadConfirmRequest;
use Modules\Economist\Http\Requests\EconomistUpload\EconomistUploadStoreRequest;
use Modules\Economist\Services\EconomistUploadService;

class EconomistUploadController extends Controller
{
    public function __construct(
        private readonly EconomistUploadService $service
    ) {
    }

    public function upload(EconomistUploadStoreRequest $request): JsonResponse
    {
        $this->service->upload(
            $request->validated(),
            $request->file('file'),
            auth()->user()
        );
        return Helper::response(trans('messages.successfully_stored'));

    }

    public function confirmed(EconomistUploadConfirmRequest $request): JsonResponse
    {
        $this->service->confirm($request->validated());
        return Helper::response(trans('messages.successfully_updated'));
    }
}
