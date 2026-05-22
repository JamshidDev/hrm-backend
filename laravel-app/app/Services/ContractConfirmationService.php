<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\ContractAdditionalTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;

class ContractConfirmationService
{
    public function __construct(
        protected WorkerPositionService $workerPositionService
    )
    {
    }

    public function confirmation($contract): void
    {
        $json = Storage::disk(config('filesystems.default'))
            ->get('json/contracts/' . $contract->id . '.json');
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $data = $data['data'];

        $data['rank'] = $data['rank'] ?? 1;
        $data['rate'] = $data['rate'] ?? 1;
        $data['group'] = $data['group'] ?? 0;

        $this->workerPositionService->createWorker($data);
        $contract->confirmation = ConfirmationStatusEnum::SUCCESS->value;
        $contract->status = PositionStatusEnum::ACTIVE->value;
        $contract->save();
    }

    public function updateContract($contract): void
    {
        $type = $contract->type;
        $json = Storage::disk(config('filesystems.default'))->get(
            'json/contract-additional/' . $contract->id . '.json'
        );
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $data = $data['data'];

        switch ($type) {
            case ContractAdditionalTypeEnum::EIGHT->value:
                $this->workerPositionService->updateWorkerPosition($data);
                break;
            case ContractAdditionalTypeEnum::ONE->value:
                $this->workerPositionService->updateWorker($data);
                break;
            case ContractAdditionalTypeEnum::TWELVE->value:
            case ContractAdditionalTypeEnum::THIRTEEN->value:
                $this->workerPositionService->finishedWorkerPosition($data);
                $contract = $contract->load('contract')->contract;
                $contract->status = PositionStatusEnum::FINISHED->value;
                $contract->contract_to_date = $data['contract_to_date'];
                $contract->save();
                break;
        }
    }

    public function deleteContract($contract): void
    {
        if ($contract->command_status) {
            $command = $contract->load('command')->command;
            if ($command) {
                if ($command->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
                    throw HRServiceException::approvedDocumentCannotBeDeleted(trans('messages.contract_loaded_command_dont_delete'));
                }
                $command->delete();
            }
        } else {
            if ($contract->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
                throw HRServiceException::approvedDocumentCannotBeDeleted(trans('messages.you_cannot_delete_a_document_that_has_been_approved'));
            }
        }
        $contract->delete();
    }
}
