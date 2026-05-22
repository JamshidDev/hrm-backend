<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Modules\Chat\Http\Requests\ChatNews\ChatNewsReactionRequest;
use Modules\Chat\Services\ChatNewsReactionService;

class ChatNewsReactionController extends Controller
{
    public function store($chatNewsId, ChatNewsReactionRequest $request, ChatNewsReactionService $service): \Illuminate\Http\JsonResponse
    {
        $service->react($chatNewsId, $request->reaction, auth()->id());
        return Helper::response();
    }
}
