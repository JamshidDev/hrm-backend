<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsMediaStoreRequest;
use Modules\Chat\Models\ChatNewsMedia;
use Modules\Chat\Services\ChatNewsMediaService;

class ChatNewsMediaController extends Controller
{
    public function store(ChatNewsMediaStoreRequest $request, ChatNewsMediaService $service): \Illuminate\Http\JsonResponse
    {
        $media = $service->create($request->validated());
        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy(ChatNewsMedia $chatNewsMedia, ChatNewsMediaService $service): \Illuminate\Http\JsonResponse
    {
        $service->delete($chatNewsMedia);
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
