<?php

namespace Modules\Chat\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Modules\Chat\Services\ChatNewsViewService;

class ChatNewsViewController extends Controller
{
    public function store($chatNewsId, ChatNewsViewService $service): \Illuminate\Http\JsonResponse
    {
        $service->view($chatNewsId, auth()->id());
        return Helper::response();
    }
}
