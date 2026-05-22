<?php

namespace Modules\Economist\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\Economist\DocumentReplace;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Economist\Http\Requests\StaffingApprove\ApproveGenerateRequest;
use Modules\Economist\Models\StaffingApprove;
use Modules\Economist\Transformers\StaffingApprove\ApproveIndexResource;

class StaffingApproveController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $commands = StaffingApprove::query()
            ->filter($user, request()->all())
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'confirmatory:id,worker_id,organization_id,department_id,position_id',
                'confirmatory.worker:id,last_name,first_name,middle_name,birthday,photo',
                'confirmatory.organization:id,name,name_en,name_ru,group',
                'confirmatory.department:id,name,level',
                'confirmatory.position:id,name'
            ])
            ->orderByDesc('id')
            ->paginate($per_page);

        $commands = PaginateResource::make($commands, ApproveIndexResource::class);

        return Helper::response(true, $commands);
    }

    public function viewGenerateChanges(DocumentReplace $documentReplace): JsonResponse
    {
        $user = auth()->user()->load('organization');
        return Helper::response(true, [
            'positions' => $documentReplace->changedPositions($user),
        ]);
    }

    public function generate(ApproveGenerateRequest $request, DocumentReplace $documentReplace)
    {
        $user = auth()->user()->load('organization');
        $store = $documentReplace->generate($user, $request);

        if (!$store['status']) {
            return Helper::response($store['message'], [], 400);
        }

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function show($staffingApproveId): JsonResponse
    {
        $staffingApprove = StaffingApprove::query()
            ->findOrFail($staffingApproveId);

        return Helper::response(true, $staffingApprove);
    }

    public function destroy($staffingApproveId): JsonResponse
    {
        $staffingApprove = StaffingApprove::findOrFail($staffingApproveId);

        if ($staffingApprove && $staffingApprove->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            return Helper::response(trans('messages.you_cannot_delete_a_document_that_has_been_approved'), [], 400);
        }

        $staffingApprove->delete();
        return Helper::response(trans('messages.successfully_deleted'));
    }
}
