<?php

namespace Modules\Turnstile\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Turnstile\Http\Requests\TelegramPhoto\TelegramPhotoIndexRequest;
use Modules\Turnstile\Http\Requests\TelegramPhoto\TelegramPhotoUpdateRequest;
use Modules\Turnstile\Services\HikCentralWorkerService;
use Modules\Turnstile\Services\TelegramPhotoService;

class TelegramPhotoController extends Controller
{
    public function __construct(
        private readonly TelegramPhotoService $service,
        private readonly HikCentralWorkerService $hikCentralWorkerService
    ) {
    }

    public function index(TelegramPhotoIndexRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->paginate($request->validated(), auth()->user()));
    }

    public function updatePhotos(TelegramPhotoUpdateRequest $request): JsonResponse
    {
        $this->service->updatePhotos($request->validated(), auth()->user(), $this->hikCentralWorkerService);
        return Helper::response(trans('messages.successfully_updated'));
    }
}
