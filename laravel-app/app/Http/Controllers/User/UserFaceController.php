<?php

namespace App\Http\Controllers\User;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Face\CompleteLivenessRequest;
use App\Http\Requests\Face\FaceRecognitionRequest;
use App\Http\Requests\Face\StartLivenessRequest;
use App\Http\Requests\Face\ValidateLivenessRequest;
use App\Services\Face\FaceRecognitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserFaceController extends Controller
{
    public function __construct(private readonly FaceRecognitionService $service)
    {
    }

    public function recognition(FaceRecognitionRequest $request): JsonResponse
    {
        $status = $this->service->recognize(
            auth()->user(),
            $request->validated('photo'),
            $request->header('X-Device-UUID'),
        );

        return Helper::response(true, ['status' => $status]);
    }

    public function startLivenessForUser(Request $request): JsonResponse
    {
        $sessionId = $this->service->startSession(
            auth()->id(),
            $request->header('X-Device-UUID'),
            'face_check',
        );

        return response()->json(['session_id' => $sessionId]);
    }

    public function startLivenessForTurnstile(Request $request): JsonResponse
    {
        $sessionId = $this->service->startSession(
            auth()->id(),
            $request->header('X-Device-UUID'),
            'turnstile',
            $request->all()
        );

        return response()->json(['session_id' => $sessionId]);
    }

    public function startLiveness(StartLivenessRequest $request): JsonResponse
    {
        $sessionId = $this->service->startLoginSession(
            $request->validated('phone'),
            $request->header('X-Device-UUID'),
        );

        return response()->json(['session_id' => $sessionId]);
    }

    public function validateLiveness(ValidateLivenessRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->validateSession($request->validated('session_id'))
        );
    }

    public function completeLiveness(CompleteLivenessRequest $request): JsonResponse
    {
        $sessionId = $this->service->completeSession(
            $request->validated('session_id'),
            $request->validated(),
        );

        return response()->json(['session_id' => $sessionId]);
    }
}
