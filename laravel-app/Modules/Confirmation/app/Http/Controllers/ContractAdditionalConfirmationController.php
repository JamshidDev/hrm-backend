<?php

namespace Modules\Confirmation\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\Confirmation\Transformers\ContractAdditionalConfirmationResource;

class ContractAdditionalConfirmationController extends Controller
{

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();
        $confirmations = ContractAdditionalConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'contract_additional',
                'contract_additional.worker',
                'contract_additional.organization',
            ])
            ->whereHas('contract_additional', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, ContractAdditionalConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
