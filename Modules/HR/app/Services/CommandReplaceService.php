<?php

namespace Modules\HR\Services;

use App\Helpers\ConvertHelper;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Jobs\DocxToPdfJob;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Command;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Services\Support\CommandAdditionalTemplateHelper;
use Modules\HR\Services\Support\CommandCrudCommandHelper;
use Modules\HR\Services\Support\CommandCrudTypeHandler;
use Modules\HR\Services\Support\ManyWorkerCommandHelper;
use Modules\HR\Services\Support\ManyWorkerCommandTypeHandler;
use Modules\HR\Services\Support\SingleWorkerVacationCommandHelper;
use Modules\HR\Services\Support\SingleWorkerVacationCommandTypeHandler;
use Modules\Structure\Models\CommandType;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\TemplateProcessor;

class CommandReplaceService
{
    use Base64FileUploadTrait;

    protected array $jsonData = [];

    public function replace($data, $user, $director, $workerPosition, $worker, $status): true|string|null
    {
        $type = $data['command_type'];
        if ($status !== 'view') {
            $this->jsonData['request'] = $data;
            $data['work_place_id'] = $data['organization_id'];
            $data['organization_id'] = $user->organization_id;
            $data['user_id'] = $user->id;
            $commandData = $data;
            $commandData['type'] = $type;
            $command = Command::create($commandData);
        }

        $confirmations = [];
        $documentPath = $this->getDocumentPath($user, $type);
        $temp = $this->createTemplateProcessor($documentPath, $user->organization_id);

        $temp->setValue('command_number', $data['command_number'] ?? '');
        $commandDate = Helper::getDateTex(Carbon::parse($data['command_date']));
        $temp->setValue('command_date', $commandDate);

        $this->setCommonValues($temp, $user, $director);

        if ($type === CommandTypeEnum::THREE->value) {
            $temp->setValue('contract_to_date', Helper::getDateTex(Carbon::parse($data['contract_to_date'])));
        }

        if ($type === CommandTypeEnum::SIX->value) {
            $this->handleSixType($temp, $data);
        }

        $this->dispatchTypeHandler($type, $temp, $data, $workerPosition, $worker, $command ?? null, $confirmations);

        $this->setFinanceValue($temp, $data);

        if ($status !== 'view') {
            return $this->persistCommandDocument($temp, $command, $data, $confirmations);
        }
        return $this->previewCommandDocument($temp);
    }

    private function dispatchTypeHandler(
        int               $type,
        TemplateProcessor $temp,
        array             $data,
                          $workerPosition,
                          $worker,
                          $command,
        array             &$confirmations
    ): void
    {
        $method = $this->getTypeHandlerMap()[$type] ?? null;

        if (!$method) {
            throw HRServiceException::invalidCommandType(trans('messages.command.types.invalid_command_type'));
        }

        $this->{$method}($temp, $data, $workerPosition, $worker, $command, $confirmations);
    }

    private function getTypeHandlerMap(): array
    {
        return array_replace(
            array_fill_keys([
                CommandTypeEnum::ONE->value,
                CommandTypeEnum::TWO->value,
                CommandTypeEnum::THREE->value,
                CommandTypeEnum::FOUR->value,
                CommandTypeEnum::FIVE->value,
                CommandTypeEnum::SIX->value,
                CommandTypeEnum::SEVEN->value,
                CommandTypeEnum::EIGHT->value,
            ], 'dispatchCreateTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::TWENTY_ONE->value,
                CommandTypeEnum::TWENTY_FIVE->value,
            ], 'dispatchUpdateTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::THIRTY_ONE->value,
                CommandTypeEnum::THIRTY_TWO->value,
                CommandTypeEnum::THIRTY_THREE->value,
                CommandTypeEnum::THIRTY_FOUR->value,
                CommandTypeEnum::THIRTY_FIVE->value,
                CommandTypeEnum::THIRTY_SIX->value,
                CommandTypeEnum::THIRTY_SEVEN->value,
                CommandTypeEnum::THIRTY_EIGHT->value,
                CommandTypeEnum::THIRTY_NINE->value,
            ], 'dispatchDeleteTypeHandler'),
            array_fill_keys([CommandTypeEnum::FORTY_ONE->value], 'dispatchFortyOneTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::FORTY_TWO->value,
                CommandTypeEnum::FORTY_THREE->value,
            ], 'dispatchFortyThreeTypeHandler'),
            array_fill_keys([CommandTypeEnum::FORTY_FOUR->value], 'dispatchFortyFourTypeHandler'),
            array_fill_keys([CommandTypeEnum::FORTY_EIGHT->value], 'dispatchFortyEightTypeHandler'),
            array_fill_keys([CommandTypeEnum::FORTY_SIX->value], 'dispatchFortySixTypeHandler'),
            array_fill_keys([CommandTypeEnum::FORTY_SEVEN->value], 'dispatchFortySevenTypeHandler'),
            array_fill_keys([CommandTypeEnum::FIFTY->value], 'dispatchFiftyTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::FIFTY_ONE->value,
                CommandTypeEnum::FIFTY_TWO->value,
                CommandTypeEnum::FIFTY_THREE->value,
                CommandTypeEnum::FIFTY_FOUR->value,
            ], 'dispatchFiftyOneTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::FORTY_FIVE->value,
                CommandTypeEnum::FORTY_NINE->value,
            ], 'dispatchFortyNineTypeHandler'),
            array_fill_keys([CommandTypeEnum::FIFTY_FIVE->value], 'dispatchFiftyFiveTypeHandler'),
            array_fill_keys([
                CommandTypeEnum::SIXTY_ONE->value,
                CommandTypeEnum::SIXTY_TWO->value,
            ], 'dispatchSixtyTwoTypeHandler'),
            array_fill_keys([CommandTypeEnum::SEVENTY_ONE->value], 'dispatchSeventyOneTypeHandler'),
            array_fill_keys([CommandTypeEnum::SEVENTY_TWO->value], 'dispatchSeventyTwoTypeHandler'),
            array_fill_keys([CommandTypeEnum::SEVENTY_THREE->value], 'dispatchSeventyThreeTypeHandler'),
        );
    }

    private function dispatchCreateTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleCreateType($temp, $data, $worker, $command, $confirmations);
    }

    private function dispatchUpdateTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleUpdateType($temp, $data, $workerPosition, $command, $confirmations);
    }

    private function dispatchDeleteTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleDeleteType($temp, $data, $workerPosition, $command, $confirmations);
    }

    private function dispatchFortyOneTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortyOneType($temp, $data, $command, $confirmations);
    }

    private function dispatchFortyThreeTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortyThreeType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFortyFourTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortyFourType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFortyEightTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortyEightType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFortySixTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortySixType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFortySevenTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortySevenType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFiftyTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFiftyType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFiftyOneTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFiftyOneType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFortyNineTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFortyNineType($temp, $data, $command, $workerPosition, $confirmations);
    }

    private function dispatchFiftyFiveTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleFiftyFiveType($temp, $data, $command, $confirmations);
    }

    private function dispatchSixtyTwoTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleSixtyTwoType($temp, $data, $command, $confirmations);
    }

    private function dispatchSeventyOneTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleSeventyOneType($temp, $data, $command, $confirmations);
    }

    private function dispatchSeventyTwoTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleSeventyTwoType($temp, $data, $command, $confirmations);
    }

    private function dispatchSeventyThreeTypeHandler(TemplateProcessor $temp, array $data, $workerPosition, $worker, $command, array &$confirmations): void
    {
        $this->handleSeventyThreeType($temp, $data, $command, $confirmations);
    }

    private function createTemplateProcessor(string $documentPath, int $organizationId): TemplateProcessor
    {
        $temp = new TemplateProcessor($documentPath);
        $temp->setImageValue('photo', [
            'path' => $this->getBannerPath($organizationId),
            'width' => 654,
            'height' => 87,
            'ratio' => true,
            'wrappingStyle' => 'inline',
        ]);

        return $temp;
    }

    private function getBannerPath(int $organizationId): string
    {
        $bannerPath = public_path('resumes/commands/banners/' . $organizationId . '.png');

        return file_exists($bannerPath)
            ? $bannerPath
            : public_path('resumes/commands/banners/1.png');
    }

    private function setFinanceValue(TemplateProcessor $temp, array $data): void
    {
        if (!array_key_exists('finance_id', $data)) {
            $temp->setValue('finance', "Moliya bo'limi");
            return;
        }

        $finance = ConfirmationWorker::query()->with('worker')->find($data['finance_id']);
        if (!$finance) {
            $temp->setValue('finance', "Moliya bo'limi");
            return;
        }

        $textRun = new TextRun();
        $textRun->addText(ucfirst($finance->position) . ' ', [
            'size' => 14,
            'name' => 'Arial'
        ]);
        $textRun->addText($finance->worker->short_name(), [
            'bold' => true,
            'size' => 14,
            'name' => 'Arial'
        ]);

        $temp->setComplexValue('finance', $textRun);
    }

    private function persistCommandDocument(TemplateProcessor $temp, Command $command, array $data, array &$confirmations): bool
    {
        $fileName = $command->uuid . '.docx';
        $newFilePath = 'replaced-files/' . $fileName;

        try {
            $temp->saveAs('storage/' . $newFilePath);
            $filePath = $this->uploadFileFromPath('storage/' . $newFilePath, $fileName, 'commands');
            DocxToPdfJob::dispatch($filePath, 'documents/commands', $command->id, Command::class)->afterCommit();
        } finally {
            Storage::delete($newFilePath);
        }

        $this->createConfirmations($command, $data, $confirmations);
        $this->saveCommandData($command);
        $this->insertCommandConfirmations($command, $confirmations);

        return true;
    }

    private function insertCommandConfirmations(Command $command, array &$confirmations): void
    {
        $now = now();
        foreach ($confirmations as &$confirmation) {
            $confirmation['command_id'] = $command->id;
            $confirmation['created_at'] = $now;
            $confirmation['updated_at'] = $now;
        }
        unset($confirmation);

        CommandConfirmation::insert($confirmations);
    }

    private function previewCommandDocument(TemplateProcessor $temp)
    {
        $fileName = Str::random(10) . auth()->id() . time() . '.docx';
        $newFilePath = 'storage/replaced-files/commands/' . $fileName;

        try {
            File::ensureDirectoryExists(public_path('storage/replaced-files/commands'));
            $temp->saveAs($newFilePath);
            $convert = ConvertHelper::docxToPdf($newFilePath, 'preview/commands');
            if (!($convert['status'] ?? false)) {
                throw new RuntimeException($convert['msg'] ?? trans('messages.server_error'));
            }
            return $convert['msg'];
        } finally {
            File::delete(public_path($newFilePath));
        }
    }

    private function manyWorkerHelper(): ManyWorkerCommandHelper
    {
        return app(ManyWorkerCommandHelper::class);
    }

    private function commandCrudHelper(): CommandCrudCommandHelper
    {
        return app(CommandCrudCommandHelper::class);
    }

    private function commandAdditionalTemplateHelper(): CommandAdditionalTemplateHelper
    {
        return app(CommandAdditionalTemplateHelper::class);
    }

    private function commandCrudTypeHandler(): CommandCrudTypeHandler
    {
        return app(CommandCrudTypeHandler::class);
    }

    private function manyWorkerTypeHandler(): ManyWorkerCommandTypeHandler
    {
        return app(ManyWorkerCommandTypeHandler::class);
    }

    private function singleWorkerVacationTypeHandler(): SingleWorkerVacationCommandTypeHandler
    {
        return app(SingleWorkerVacationCommandTypeHandler::class);
    }

    private function singleWorkerVacationHelper(): SingleWorkerVacationCommandHelper
    {
        return app(SingleWorkerVacationCommandHelper::class);
    }

    private function getDocumentPath($user, $type): string
    {
        $documentExample = CommandType::query()
            ->where('organization_id', $user->organization_id)
            ->where('type', $type)
            ->first();

        return $documentExample ? Helper::fileUrl($documentExample->file) : public_path(
            'resumes/commands/' . $type . '.docx'
        );
    }

    private function setCommonValues($temp, $user, $director): void
    {
        if ($user->organization?->command_address) {
            $address = $user->organization->command_address;
        } else {
            $address = str_replace(['viloyati', 'shahri', 'tumani'], ['v.', 'sh.', 't.'], $user->organization->city?->name);
        }

        $temp->setValue('address', $address);
        $temp->setValue('director_short_name', $director->worker->short_name());
        $temp->setValue('director_position', $director->position);
    }

    private function handleSixType($temp, $data): void
    {
        $temporaryWorkerPosition = WorkerPosition::with([
            'worker:id,last_name,first_name,middle_name',
            'department:id,name',
            'position:id,name',
        ])->find($data['temporary_worker_id']);

        if ($temporaryWorkerPosition && $temporaryWorkerPosition->worker) {
            $temp->setValue('temporary_worker_name', $temporaryWorkerPosition->worker->short_name());
            $temp->setValue('temporary_post_name', strtolower(PositionHelper::getShortPosition($temporaryWorkerPosition)));
        }
    }

    private function handleCreateType($temp, $data, $worker, $command, &$confirmations): void
    {
        $this->commandCrudTypeHandler()->handleCreateType(
            $temp,
            $data,
            $worker,
            $command,
            $confirmations,
            $this->jsonData,
            $this->commandCrudHelper()
        );
    }

    public function createConfirmationWorkers($commandId, $data, &$confirmations)
    {
        return $this->commandCrudHelper()->appendWorkerConfirmation($commandId, $data, $confirmations);
    }

    private function handleUpdateType($temp, $data, $workerPosition, $command, &$confirmations): void
    {
        $this->commandCrudTypeHandler()->handleUpdateType(
            $temp,
            $data,
            $workerPosition,
            $command,
            $confirmations,
            $this->jsonData,
            $this->commandCrudHelper()
        );
    }

    public function createConfirmationWorkerPosition($commandId, $workerPosition, &$confirmationData)
    {
        return $this->commandCrudHelper()->appendWorkerPositionConfirmation(
            $commandId,
            $workerPosition,
            $confirmationData
        );
    }

    private function handleDeleteType($temp, $data, $workerPosition, $command, &$confirmations): void
    {
        $this->commandCrudTypeHandler()->handleDeleteType(
            $temp,
            $data,
            $workerPosition,
            $command,
            $confirmations,
            $this->jsonData,
            $this->commandCrudHelper(),
            $this->setAdditionalToCommand(...)
        );
    }

    private function handleFortyOneType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleFortyOneType($temp, $data, $command, $confirmations, $this->jsonData);
    }

    public function manyTypeCommandWorkers($data): array
    {
        return $this->manyWorkerHelper()->prepare($data);
    }

    public function manyWorkerCommandConfirmations($commandId, $workerPositions, &$confirmations)
    {
        return $this->manyWorkerHelper()->appendCommandConfirmations($commandId, $workerPositions, $confirmations);
    }

    private function handleFortyThreeType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortyThreeType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFortyFourType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortyFourType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFiftyType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFiftyType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFortyEightType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortyEightType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->singleWorkerVacationHelper(),
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFortySixType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortySixType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->singleWorkerVacationHelper(),
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFortySevenType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortySevenType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->singleWorkerVacationHelper(),
            $this->createConfirmationWorkerPosition(...),
            $this->setAdditionalToCommand(...)
        );
    }

    private function handleFiftyOneType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFiftyOneType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->singleWorkerVacationHelper(),
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFortyNineType($temp, $data, $command, $workerPosition, &$confirmations): void
    {
        $this->singleWorkerVacationTypeHandler()->handleFortyNineType(
            $temp,
            $data,
            $command,
            $workerPosition,
            $confirmations,
            $this->jsonData,
            $this->singleWorkerVacationHelper(),
            $this->createConfirmationWorkerPosition(...)
        );
    }

    private function handleFiftyFiveType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleFiftyFiveType($temp, $data, $command, $confirmations, $this->jsonData);
    }

    private function handleSixtyTwoType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleSixtyTwoType($temp, $data, $command, $confirmations, $this->jsonData);
    }


    private function handleSeventyOneType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleSeventyOneType($temp, $data, $command, $confirmations, $this->jsonData);
    }

    private function handleSeventyTwoType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleSeventyTwoType($temp, $data, $command, $confirmations, $this->jsonData);
    }

    private function handleSeventyThreeType($temp, $data, $command, &$confirmations): void
    {
        $this->manyWorkerTypeHandler()->handleSeventyThreeType(
            $temp,
            $data,
            $command,
            $confirmations,
            $this->jsonData,
            $this->setAdditionalToCommand(...)
        );
    }

    public function createConfirmations($command, $data, &$confirmations)
    {
        $cs = collect($data['confirmations'])->keyBy('id');
        $confirmationIds = $cs->keys()->all();
        $confirmationIds = array_merge($confirmationIds, [$data['director_id']]);
        $confirms = ConfirmationWorker::whereIn('id', $confirmationIds)->get()->keyBy('id');

        foreach ($confirmationIds as $c) {
            $confirmation = $confirms->get($c);
            if (!$confirmation) {
                continue;
            }
            $orderData = $cs->get($c);
            $order = $orderData['order'] ?? (count($cs) + 1);

            $confirmations[] = [
                'command_id' => $command->id,
                'position' => $confirmation->position,
                'type' => (int)$data['director_id'] === (int)$c ? 'd' : 's',
                'worker_id' => $confirmation->worker_id,
                'order' => $order
            ];
        }
        return $confirmations;
    }

    private function saveCommandData($command): void
    {
        $path = 'json/commands/' . $command->id . '.json';
        Storage::disk(config('filesystems.default'))
            ->put($path, json_encode($this->jsonData, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
    }

    public function setAdditionalToCommand($temp, $data): void
    {
        try {
            $this->commandAdditionalTemplateHelper()->apply($temp, $data);
        } catch (Exception $e) {
            Helper::setLog($e, 'commandsSetAdditionalToCommand');
        }
    }

}
