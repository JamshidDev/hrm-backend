<?php

namespace Modules\HR\Services;

use App\Jobs\DocxToPdfJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\HR\DTO\ContractStoreDTO;
use Modules\HR\Enums\ContractCommandStatusEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Contract;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;

class ContractService
{
    public function __construct(
        protected WorkerService          $workerService,
        protected CommandReplaceService  $commandReplaceService,
        protected ContractReplaceService $contractReplaceService,
    )
    {
    }

    public function store(ContractStoreDTO $dto, $user, $requestData): Contract
    {
        if (WorkerPosition::query()
            ->where('worker_id', $dto->worker_id)
            ->where('type', ContractTypeEnum::ONE->value)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->exists() && $dto->type === ContractTypeEnum::ONE->value) {

            throw HRServiceException::workerAlreadyExists(trans('messages.worker.already'));
        }

        $this->checkWorkerDocument($dto->worker_id);

        return DB::transaction(function () use ($dto, $user, $requestData) {
            $worker = Worker::with([
                'passport',
                'phones',
                'current_city',
                'current_region'
            ])->findOrFail($dto->worker_id);

            $director = ConfirmationWorker::findOrFail($dto->director_id);

            $systemData = [
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'work_place_id' => $dto->organization_id,
                'director_id' => $director->id,
                'worker_id' => $worker->id,
                'generate' => 2,
                'contract_date' => $dto->contract_date,
                'number' => $dto->number,
                'type' => $dto->type,
                'table_number' => $dto->table_number,
                'contract_to_date' => $dto->contract_to_date,
                'command_status' => $dto->command_status
                    ? ContractCommandStatusEnum::FORMED->value
                    : ContractCommandStatusEnum::NOT_MANDATORY->value
            ];

            $contract = Contract::create($systemData);

            $file = $this->contractReplaceService->contractReplace(
                $user,
                $requestData,
                $worker,
                $contract->uuid
            );

            DocxToPdfJob::dispatch(
                $file,
                'documents/contracts',
                $contract->id,
                Contract::class
            )->afterCommit();

            $data = $requestData->all();
            $data['contract_model_type'] = Contract::class;
            $data['contract_model_id'] = $contract->id;
            $data['contract_id'] = $contract->id;

            $this->storeJson(
                $contract->id,
                $data,
                array_merge($data, [
                    'contract_id' => $contract->id,
                    'file' => $file,
                ])
            );

            if ($dto->command_status) {
                $this->commandReplaceService->replace(
                    $data,
                    $user,
                    $director,
                    null,
                    $worker,
                    'store'
                );
            }

            $this->createConfirmation($contract, $worker->id, $director);
            return $contract;
        });
    }

    private function checkWorkerDocument(int $workerId): void
    {
        $status = $this->workerService->checkWorkerDocument($workerId);

        if (!$status['status']) {
            throw HRServiceException::validation(trans('messages.you_cannot_create_a_document_for_another_worker_' . $status['type']));
        }
    }

    private function storeJson(
        int   $contractId,
        array $requestData,
        array $systemData
    ): void
    {
        Storage::put(
            "json/contracts/{$contractId}.json",
            json_encode([
                'request' => $requestData,
                'data' => $systemData
            ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)
        );
    }

    private function createConfirmation($contract, $workerId, $director): void
    {
        ContractConfirmation::create([
            'contract_id' => $contract->id,
            'type' => 'w',
            'worker_id' => $workerId,
        ]);

        ContractConfirmation::create([
            'contract_id' => $contract->id,
            'type' => 'd',
            'worker_id' => $director->worker_id,
            'position' => $director->position
        ]);
    }
}
