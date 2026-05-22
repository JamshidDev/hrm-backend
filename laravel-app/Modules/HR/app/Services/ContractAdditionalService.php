<?php

namespace Modules\HR\Services;

use App\Jobs\DocxToPdfJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Models\ContractAdditionalConfirmation;
use Modules\HR\DTO\ContractAdditionalStoreDTO;
use Modules\HR\Enums\ContractCommandStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\ContractAdditional;
use Modules\HR\Models\WorkerPosition;

class ContractAdditionalService
{
    public function __construct(
        protected WorkerService $workerService,
        protected CommandReplaceService $commandReplaceService,
        protected ContractReplaceService $contractReplaceService,
    ) {}

    public function store(ContractAdditionalStoreDTO $dto, $requestData, $user): ContractAdditional
    {
        return DB::transaction(function () use ($dto, $requestData, $user) {

            $workerPosition = WorkerPosition::with([
                'worker',
                'worker.passport',
                'worker.phones',
                'worker.current_city',
                'worker.current_region',
                'position'
            ])->findOrFail($dto->worker_position_id);

            $this->checkWorker($workerPosition->worker_id);

            $director = ConfirmationWorker::findOrFail($dto->director_id);

            $systemData = [
                'user_id'            => $user->id,
                'worker_id'          => $workerPosition->worker_id,
                'director_id'        => $director->id,
                'contract_id'        => $workerPosition->contract_id,
                'contract_date'      => $dto->contract_date,
                'worker_position_id' => $workerPosition->id,
                'organization_id'    => $dto->organization_id ?? $workerPosition->organization_id,
                'number'             => $dto->number,
                'table_number'       => $dto->table_number,
                'type'               => $dto->type,
                'command_status'     => $dto->command_status
                    ? ContractCommandStatusEnum::FORMED->value
                    : ContractCommandStatusEnum::NOT_MANDATORY->value,
            ];

            $contract = ContractAdditional::create($systemData);

            $file = $this->contractReplaceService->contractAdditionalReplace(
                $user,
                $requestData,
                $workerPosition,
                $contract->uuid
            );

            DocxToPdfJob::dispatch(
                $file,
                'documents/contract-additional',
                $contract->id,
                ContractAdditional::class
            )->afterCommit();

            $data = $requestData->all();
            $data['contract_model_type'] = ContractAdditional::class;
            $data['contract_model_id'] = $contract->id;
            $data['worker_id'] = $workerPosition->worker_id;
            $data['contract_id'] = $workerPosition->contract_id;
            $data['organization_id'] = $systemData['organization_id'];

            $this->storeJson(
                $contract->id,
                $data,
                array_merge($data, [
                    'file' => $file,
                    'contract_additional_id' => $contract->id
                ])
            );
            if ($dto->command_status) {
                $this->commandReplaceService->replace(
                    $data,
                    $user,
                    $director,
                    $workerPosition,
                    null,
                    'store'
                );
            }

            $this->createConfirmation($contract, $workerPosition->worker_id, $director);
            return $contract;
        });
    }

    private function checkWorker(int $workerId): void
    {
        $status = $this->workerService->checkWorkerDocument($workerId);

        if (!$status['status']) {
            throw HRServiceException::validation(trans('messages.you_cannot_create_a_document_for_another_worker_' . $status['type']));
        }
    }

    private function storeJson(int $id, array $requestData, array $systemData): void
    {
        Storage::put(
            "json/contract-additional/{$id}.json",
            json_encode([
                'request' => $requestData,
                'data'    => $systemData
            ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)
        );
    }

    private function createConfirmation($contract, $workerId, $director): void
    {
        ContractAdditionalConfirmation::create([
            'contract_additional_id' => $contract->id,
            'type' => 'w',
            'worker_id' => $workerId,
        ]);

        ContractAdditionalConfirmation::create([
            'contract_additional_id' => $contract->id,
            'type' => 'd',
            'worker_id' => $director->worker_id,
            'position' => $director->position,
        ]);
    }
}
