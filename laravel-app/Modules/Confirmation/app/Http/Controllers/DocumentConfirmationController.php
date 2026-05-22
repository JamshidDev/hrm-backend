<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Services\DocumentSignatureUrlService;

class DocumentConfirmationController extends Controller
{
    public function __construct(
        private readonly DocumentSignatureUrlService $documentSignatureUrlService,
    )
    {
    }

    public function generateConfirmationUrl(Request $request): JsonResponse
    {
        $request->validate([
            'model' => ['required', 'string'],
            'confirmation_id' => ['required', 'integer'],
        ]);
        return Helper::response(true, $this->documentSignatureUrlService->generate(
            $request->model,
            $request->confirmation_id
        ));
    }

    public function signature(Request $request): ?JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'key' => ['nullable', 'regex:/^data:image\/(png);base64,.+/'],
            'status' => 'nullable|string'
        ]);
        $result = $this->documentSignatureUrlService->signWithToken($data);

        if (!$result['success']) {
            return Helper::response($result['message'], [], $result['status']);
        }

        if (array_key_exists('data', $result)) {
            return Helper::response(true, $result['data']);
        }

        return Helper::response($result['message']);
    }
}
