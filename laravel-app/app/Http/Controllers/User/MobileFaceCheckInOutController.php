<?php

namespace App\Http\Controllers\User;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Mobile\FaceCheckLocationRequest;
use App\Services\Mobile\FaceCheckInOutService;

class MobileFaceCheckInOutController extends Controller
{
    public function __construct(protected FaceCheckInOutService $checkInOutService)
    {
    }

    public function lastEvent()
    {
        $user = auth()->user();
        return Helper::response(true, $this->checkInOutService->lastEvent($user));
    }

    public function checkLocation(FaceCheckLocationRequest $request)
    {
        $user = auth()->user();
        $data = $this->checkInOutService->checkLocation($request->validated(), $user);
        return Helper::response(true, $data);
    }
}
