<?php

namespace App\Services;

use App\Helpers\Helper;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\OrganizationDisciplinary;
use Modules\HR\Models\OrganizationFinancialAssistance;
use Modules\HR\Models\OrganizationIncentive;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerBusinessTrip;

class CommandConfirmationService
{
    public function __construct(
        protected WorkerPositionService $workerPositionService
    )
    {
    }

    public function confirmation($command): void
    {
        $type = $command->type;
        $json = Storage::disk(config('filesystems.default'))->get('json/commands/' . $command->id . '.json');

        $json = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $data = $json['data'];

        switch ($type) {
            case CommandTypeEnum::ONE->value:
            case CommandTypeEnum::TWO->value:
            case CommandTypeEnum::THREE->value:
            case CommandTypeEnum::FOUR->value:
            case CommandTypeEnum::FIVE->value:
            case CommandTypeEnum::SIX->value:
            case CommandTypeEnum::SEVEN->value:
                $this->workerPositionService->createWorker($data);
                break;
            case CommandTypeEnum::TWENTY_FIVE->value:
                $this->workerPositionService->updateWorker($data);
                break;
            case CommandTypeEnum::TWENTY_ONE->value:
                $this->workerPositionService->updateWorkerPosition($data);
                break;
            case CommandTypeEnum::THIRTY_ONE->value:
            case CommandTypeEnum::THIRTY_TWO->value:
            case CommandTypeEnum::THIRTY_THREE->value:
            case CommandTypeEnum::THIRTY_FOUR->value:
            case CommandTypeEnum::THIRTY_FIVE->value:
            case CommandTypeEnum::THIRTY_SIX->value:
            case CommandTypeEnum::THIRTY_SEVEN->value:
            case CommandTypeEnum::THIRTY_EIGHT->value:
            case CommandTypeEnum::THIRTY_NINE->value:
                $this->workerPositionService->finishedWorkerPosition($data);
                if ($data['contract_id']) {
                    $contract = Contract::find($data['contract_id']);
                    if ($contract) {
                        $contract->contract_to_date = $data['contract_to_date'];
                        $contract->status = PositionStatusEnum::FINISHED->value;
                        $contract->save();
                    }
                }
                break;

            case CommandTypeEnum::FIFTY_FIVE->value:
            case CommandTypeEnum::FORTY_ONE->value:
                $cleanData = Helper::sanitizeInsertData($data, new Vacation());
                $updateColumns = array_keys($cleanData[0]);
                $uniqueBy = ['worker_id', 'type', 'to'];
                Vacation::upsert($cleanData, $uniqueBy, $updateColumns);
                break;
            case CommandTypeEnum::FIFTY->value:
            case CommandTypeEnum::FORTY_THREE->value:
                if (array_key_exists('id', $json) && $json['id']) {
                    Vacation::findOrFail($json['id'])
                        ->update([
                            'to' => $data['to'],
                            'work_day' => $data['work_day'],
                        ]);
                }
                break;
            case CommandTypeEnum::FORTY_FOUR->value:
                if (array_key_exists('id', $json) && $json['id']) {
                    Vacation::findOrFail($json['id'])
                        ->update([
                            'to' => $data['to'],
                            'rest_day' => $data['rest_day'],
                            'work_day' => $data['work_day'],
                        ]);
                }
                break;
            case CommandTypeEnum::FORTY_SIX->value:
            case CommandTypeEnum::FORTY_SEVEN->value:
            case CommandTypeEnum::FORTY_EIGHT->value:
            case CommandTypeEnum::FIFTY_ONE->value:
            case CommandTypeEnum::FIFTY_TWO->value:
            case CommandTypeEnum::FIFTY_THREE->value:
            case CommandTypeEnum::FIFTY_FOUR->value:
            case CommandTypeEnum::FORTY_NINE->value:
            case CommandTypeEnum::FORTY_FIVE->value:
                Vacation::updateOrCreate(
                    [
                        'worker_id' => $data['worker_id'],
                        'type' => $data['type'],
                        'to' => $data['to']
                    ],
                    $data
                );
                break;
            case CommandTypeEnum::SIXTY_TWO->value:
            case CommandTypeEnum::SIXTY_ONE->value:
                $cleanData = Helper::sanitizeInsertData($data, new WorkerBusinessTrip());
                WorkerBusinessTrip::insert($cleanData);
                break;
            case CommandTypeEnum::SEVENTY_ONE->value:
                $cleanData = Helper::sanitizeInsertData($data, new OrganizationIncentive());
                OrganizationIncentive::insert($cleanData);
                break;
            case CommandTypeEnum::SEVENTY_TWO->value:
                $cleanData = Helper::sanitizeInsertData($data, new OrganizationDisciplinary());
                OrganizationDisciplinary::insert($cleanData);
                break;
            case CommandTypeEnum::SEVENTY_THREE->value:
                $cleanData = Helper::sanitizeInsertData($data, new OrganizationFinancialAssistance());
                OrganizationFinancialAssistance::insert($cleanData);
                break;
        }

        $command->confirmation = ConfirmationStatusEnum::SUCCESS->value;
        $command->save();
    }

}
