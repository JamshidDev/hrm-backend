<?php

namespace Modules\Confirmation\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Services\DocumentChatService;

class DocumentChatController extends Controller
{
    public function __construct(
        private readonly DocumentChatService $documentChatService,
    ) {
    }

    public function users(Request $request): JsonResponse
    {
        return Helper::response(true, $this->documentChatService->getUsers($request, auth()->user()));
    }

    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'message'      => 'required|string',
            'document_id'  => 'required|integer',
            'model'        => 'required|string',
            'recipient_id' => 'required|integer',
        ]);

        return Helper::response(
            trans('messages.sent_successfully'),
            $this->documentChatService->sendMessage($request, auth()->user())
        );
    }

    public function messages(Request $request): JsonResponse
    {
        return Helper::response(true, $this->documentChatService->getMessages($request, auth()->user()));
    }

    public function deleteMessage($messageId): JsonResponse
    {
        $this->documentChatService->deleteMessage((int)$messageId);
        return Helper::response(trans('messages.deleted_successfully'));
    }

    public function readMessage(Request $request): JsonResponse
    {
        $this->documentChatService->readMessages($request->message_ids);

        return Helper::response(trans('messages.read_successfully'));
    }
}
