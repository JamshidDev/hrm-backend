<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\ContractConfirmationService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Modules\HR\DTO\ContractStoreDTO;
use Modules\HR\Http\Requests\Contact\ContractStoreRequest;
use Modules\HR\Models\Contract;
use Modules\HR\Services\ContractService;
use Modules\HR\Transformers\Contract\ContractResource;
use Modules\HR\Transformers\Contract\ContractShowResource;

class ContractController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        protected ContractService             $contractService,
        protected ContractConfirmationService $contractConfirmationService,
    )
    {
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $contracts = Contract::query()
            ->filter($user, request()->all())
            ->remainingFilter()
            ->search()
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,first_name,last_name,middle_name,birthday,photo',
            ])
            ->when(request('confirmation'), fn($q) => $q->where('confirmation', request('confirmation')))
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($contracts, ContractResource::class);

        return Helper::response(true, $data);
    }

    public function store(ContractStoreRequest $request): JsonResponse
    {
        $dto = ContractStoreDTO::fromRequest($request);

        $contract = $this->contractService->store(
            $dto,
            auth()->user(),
            $request
        );

        return Helper::response(trans('messages.successfully_stored'), ['contract_id' => $contract->id]);
    }

    public function show(Contract $contract): JsonResponse
    {
        $contract->load([
            'confirmations',
            'command',
            'worker',
            'organization',
            'contract_position.organization',
            'contract_position.department',
            'contract_position.position'
        ]);

        return Helper::response(true, new ContractShowResource($contract));
    }

    public function destroy($contractId): JsonResponse
    {
        $contract = Contract::query()->findOrFail($contractId);
        $this->contractConfirmationService->deleteContract($contract);

        return Helper::response(trans('messages.successfully_deleted'));
    }

}
