<?php

namespace App\Http\Controllers\Auth;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Requests\OAuth\OAuthCheckCodeRequest;
use App\Http\Requests\OAuth\OAuthGenerateCodeRequest;
use App\Services\OAuthService;
use Illuminate\Http\JsonResponse;

class OAuthController extends Controller
{
    public function __construct(private readonly OAuthService $service)
    {
    }

    public function generateAuthCode(OAuthGenerateCodeRequest $request): JsonResponse
    {
        $url = $this->service->generateAuthCode(auth()->user(), $request->validated());

        return Helper::response(true, ['url' => $url]);
    }

    public function checkAuthCode(OAuthCheckCodeRequest $request): JsonResponse
    {
        return Helper::response(true, $this->service->exchangeAuthCode($request->validated()));
    }
}
