<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsTranslationStoreRequest;
use Modules\Chat\Models\ChatNewsTranslation;
use Modules\Chat\Services\ChatNewsTranslationService;

class ChatNewsTranslationController extends Controller
{
    public function store(ChatNewsTranslationStoreRequest $request, ChatNewsTranslationService $service): \Illuminate\Http\JsonResponse
    {
        $translation = $service->create($request->validated());

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function destroy(ChatNewsTranslation $chatNewsTranslation, ChatNewsTranslationService $service): \Illuminate\Http\JsonResponse
    {
        $service->delete($chatNewsTranslation);

        return Helper::response(trans('messages.successfully_deleted'));
    }
}
