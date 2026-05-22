<?php

namespace App\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Requests\Zoom\ZoomCheckMeetingRequest;
use App\Services\ZoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZoomController extends Controller
{
    public function __construct(private readonly ZoomService $service)
    {
    }

    public function callback(Request $request): JsonResponse
    {
        \Log::info('zoom', $request->all());
        try {
            $validation = $this->service->handleWebhook($request->all());

            if ($validation !== null) {
                return response()->json($validation);
            }

            return response()->json(['status' => 'ok']);
        } catch (\Exception $exception) {
            return Helper::response($exception->getMessage(), [], 400);
        }
    }

    public function checkMeeting(ZoomCheckMeetingRequest $request): JsonResponse
    {
        return Helper::response(
            true,
            $this->service->checkMeeting(
                $request->validated('meet_uuid'),
                $request->validated('meet_id'),
            )
        );
    }
}
