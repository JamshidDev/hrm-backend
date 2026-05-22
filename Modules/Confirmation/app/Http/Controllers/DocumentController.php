<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Services\DocumentContextResolverService;
use Modules\Confirmation\Services\DocumentConfirmationFlowService;
use Modules\Confirmation\Services\DocumentEditorCallbackService;
use Modules\Confirmation\Services\DocumentQueryService;
use Modules\Confirmation\Services\DocumentWorkflowService;

class DocumentController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        protected DocumentContextResolverService  $documentContextResolverService,
        protected DocumentConfirmationFlowService $documentConfirmationFlowService,
        protected DocumentEditorCallbackService   $documentEditorCallbackService,
        protected DocumentQueryService            $documentQueryService,
        protected DocumentWorkflowService         $documentWorkflowService,
    )
    {
    }

    public function show(Request $request): JsonResponse
    {
        return Helper::response(true, $this->documentQueryService->show($request, auth()->user()));
    }

    public function history(Request $request): JsonResponse
    {
        return Helper::response(true, $this->documentQueryService->history($request->model, $request->document_id));
    }

    public function documentBase64(Request $request): JsonResponse
    {
        return Helper::response(true, $this->documentQueryService->documentBase64($request->model, $request->document_id));
    }

    public function updateDocument(Request $request): JsonResponse
    {
        $request->validate([
            'model' => 'required',
            'document_id' => 'required'
        ]);

        $this->documentWorkflowService->updateDocument($request, auth()->user());

        return Helper::response(trans('messages.document.updated'));
    }

    public function confirmation(Request $request): ?JsonResponse
    {
        $user = auth()->user();
        $modelContext = $this->documentContextResolverService->resolveModelContext($request->model);
        $confirmation = $this->documentContextResolverService->resolveConfirmation($modelContext, $request->confirmation_id);
        $document = $this->documentContextResolverService->resolveDocumentByConfirmation($modelContext, $confirmation, ['confirmations']);

        if ($request->status === ConfirmationStatusEnum::REJECTED->value) {
            $this->documentConfirmationFlowService->reject(
                $user,
                $modelContext,
                $document,
                $confirmation,
                $request->comment
            );
            return Helper::response(trans('messages.document.rejected_successful'));
        }

        $result = $this->documentConfirmationFlowService->approve(
            $request,
            $user,
            $modelContext,
            $document,
            $confirmation
        );

        if (!$result['success']) {
            return Helper::response($result['message'], [], 400);
        }

        return Helper::response($result['message']);
    }

    public function update(Request $request): JsonResponse
    {
        $model = $this->documentContextResolverService->resolveModelContext($request->model);
        $this->documentEditorCallbackService->updateDocument($request, $model);

        return response()->json([
            'error' => 0,
            'msg' => trans('messages.document.updated')
        ]);
    }

    public function forwardConfirmation(Request $request): JsonResponse
    {
        $request->validate([
            'model' => 'required',
            'confirmation_id' => 'required',
            'new_confirmation_id' => 'required',
            'type' => 'required|in:d,s'
        ]);
        $this->documentWorkflowService->forwardConfirmation($request);

        return Helper::response(trans('messages.document.forward_successful'));
    }
}
