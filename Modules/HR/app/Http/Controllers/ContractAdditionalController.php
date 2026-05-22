<?php

namespace Modules\HR\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginateResource;
use App\Services\ContractConfirmationService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\DTO\ContractAdditionalStoreDTO;
use Modules\HR\Enums\ContractCommandStatusEnum;
use Modules\HR\Http\Requests\ContactAdditional\ContractAdditionalStoreRequest;
use Modules\HR\Models\Contract;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Services\ContractAdditionalService;
use Modules\HR\Transformers\ContractAdditional\ContractAdditionalResource;

class ContractAdditionalController extends Controller
{
    use Base64FileUploadTrait;

    public function __construct(
        protected ContractAdditionalService   $contractAdditionalService,
        protected ContractConfirmationService $contractConfirmationService,
    )
    {
    }

    public function index(): JsonResponse
    {
        $per_page = request('per_page', 10);
        $user = auth()->user();

        $contracts = ContractAdditional::query()
            ->filter($user, request()->all())
            ->when(request('search'), function ($query) {
                $query->whereHas('worker', function ($query) {
                    $query->searchByFullName();
                });
            })
            ->with([
                'organization:id,name,name_en,name_ru,group',
                'worker:id,last_name,first_name,middle_name,birthday,photo',
            ])
            ->when(request('confirmation'), fn($q) => $q->where('confirmation', request('confirmation')))
            ->orderByDesc('id')
            ->paginate($per_page);

        $data = PaginateResource::make($contracts, ContractAdditionalResource::class);

        return Helper::response(true, $data);
    }

    public function store(ContractAdditionalStoreRequest $request): JsonResponse
    {
        $dto = ContractAdditionalStoreDTO::fromRequest($request);

        $this->contractAdditionalService->store(
            $dto,
            $request,
            auth()->user()->load('organization.city.region')
        );

        return Helper::response(trans('messages.successfully_stored'));
    }

    public function confirmation($contractId, Request $request): ?JsonResponse
    {
        $document = ContractAdditional::find($contractId);
        DB::transaction(function () use ($request, $document) {
            $filePath = $this->uploadFormFile($request->file('file'), 'documents/contract-additional');
            $document->confirmation_file = $filePath;
            $document->confirmation = ConfirmationStatusEnum::SUCCESS;
            $document->save();

            if ($document->command_status === ContractCommandStatusEnum::NOT_MANDATORY) {
                $this->contractConfirmationService->updateContract($document);
            }
        });

        return Helper::response(trans('messages.signature.success'));
    }

    public function destroy($contractAdditionalId): JsonResponse
    {
        $contractAdditional = ContractAdditional::query()->findOrFail($contractAdditionalId);
        $this->contractConfirmationService->deleteContract($contractAdditional);

        return Helper::response(trans('messages.successfully_deleted'));
    }


}
