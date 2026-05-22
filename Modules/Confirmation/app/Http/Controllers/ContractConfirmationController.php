<?php

namespace Modules\Confirmation\Http\Controllers;


use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\Confirmation\Transformers\ContractConfirmationResource;

class ContractConfirmationController extends Controller
{
    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();
        $confirmations = ContractConfirmation::query()
            ->filter($user, request()->all())
            ->with([
                'contract',
                'contract.worker',
                'contract.organization',
            ])
            ->whereHas('contract', function ($query) {
                $query->where('confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);
            })
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($confirmations, ContractConfirmationResource::class);

        return Helper::response(true, $data);
    }

}
