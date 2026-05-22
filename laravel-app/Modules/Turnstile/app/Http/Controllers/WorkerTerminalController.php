<?php

namespace Modules\Turnstile\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\HR\Models\WorkerPhoto;
use Modules\HR\Transformers\Worker\WorkerPhotosResource;

class WorkerTerminalController extends Controller
{
    public function photos(): JsonResponse
    {
        $photos = WorkerPhoto::query()->where('worker_id', request('worker_id'))->get();
        return Helper::response(true, WorkerPhotosResource::collection($photos));
    }

}
