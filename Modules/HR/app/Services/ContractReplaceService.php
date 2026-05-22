<?php

namespace Modules\HR\Services;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Traits\Base64FileUploadTrait;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Enums\ContractAdditionalTypeEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\ProbationEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Department;
use Modules\HR\Models\DepartmentPosition;
use Modules\Structure\Models\Position;
use Modules\Structure\Models\Schedule;
use PhpOffice\PhpWord\TemplateProcessor;

class ContractReplaceService
{
    use Base64FileUploadTrait;

    public function contractReplace($user, $request, $worker, $uuid): false|string
    {
        $data = $this->extracted($user, $request, $worker, 'contracts', $request->probation, $uuid);

        $position_name = $request->post_name;

        if ($request->command_status) {
            $commandType = CommandTypeEnum::from((int)$request->command_type)->label();
        } else {
            $commandType = ContractTypeEnum::from((int)$request->type)->label();
        }

        $position_date = Helper::getDateTex(Carbon::parse($request->position_date));
        $contract_to_date = $request->contract_to_date ? Helper::getDateTex(Carbon::parse($request->contract_to_date)) : '';
        $department_name = Department::query()->find($request->deparment_id)?->name;
        $salary = number_format($request->salary, 2) . " so'm";
        $vacation_main_day = $request->vacation_main_day;
        $additional_vacation_day = $request->additional_vacation_day;
        if ($request->probation) {
            $probation = ProbationEnum::get((int)$request->probation, 'uz');
        }
        $work_day = Schedule::find($request->schedule_id)?->name;

        $temp = $this->replace($data);

        $temp->setValue('department_name', $department_name);
        $temp->setValue('position_name', $position_name);
        $temp->setValue('command_type', $commandType);
        $temp->setValue('position_date', $position_date);
        $temp->setValue('salary', $salary);
        $temp->setValue('contract_to_date', $contract_to_date);
        $temp->setValue('vacation_main_days', $vacation_main_day);
        $temp->setValue('additional_vacation_days', $additional_vacation_day);
        $temp->setValue('probation', $probation ?? '');
        $temp->setValue('work_day', $work_day);

        return $this->saveDocument($data, $temp, 'contracts');
    }

    public function extracted($user, $request, $worker, $model, $probation, $uuid): array
    {
        if ($model === 'contracts') {
            $contract_type = ContractTypeEnum::tryFrom($request->type)?->label();
        } else {
            $contract_type = ContractAdditionalTypeEnum::tryFrom($request->type)?->label();
        }

        $documentExample = ModelTypeEnum::tryFrom($model)->typeModel()::query()
            ->where('organization_id', $user->organization_id)
            ->where('type', $request->type)
            ->first();

        $documentPath = $documentExample
            ? Helper::fileUrl($documentExample->file)
            : public_path('resumes/' . $model . '/' . $request->type . '.docx');

        $director = ConfirmationWorker::with('worker.phones')->find($request->director_id);

        return [
            'fileName'               => $uuid . '.docx',
            'documentPath'           => $documentPath,
            'number'                 => $request->number,
            'new_contract_date' => Carbon::parse($request->contract_date),
            'address'                => str_replace(['viloyati', 'shahri'],
                ['v.', 'sh.'],
                $user->organization->city?->region->name),
            'director_full_name'     => $director?->worker->full_name(),
            'director_short_name'    => $director?->worker->short_name(),
            'director_position'      => $director?->position,
            'worker_full_name'       => $worker->full_name(),
            'organization_full_name' => $user->organization->full_name,
            'contract_type'          => $contract_type,
            'passport'               => $worker->passport?->serial_number,
            'pin'                    => $worker->pin,
            'stir'                   => $worker->stir,
            'worker_address'         => $worker->fullCurrentAddress(),
            'worker_phone'           => Helper::phoneFormat($worker->phones?->pluck('phone')->toArray()),
            'director_phone'         => Helper::phoneFormat($director?->phones?->pluck('phone')->toArray()),
            'organization_address'   => $user->organization->full_address(),
            'probation'              => $probation ? ProbationEnum::get((int)$request->probation, 'uz') .
                ' sinov muddati bilan, ' : ''
        ];
    }

    public function replace($data): TemplateProcessor
    {
        $temp = new TemplateProcessor($data['documentPath']);
        $temp->setValue('address', $data['address']);
        $temp->setValue('director_full_name', $data['director_full_name']);
        $temp->setValue('worker_full_name', $data['worker_full_name']);
        $temp->setValue('contract_type', $data['contract_type']);
        $temp->setValue('passport', $data['passport']);
        $temp->setValue('worker_pin', $data['pin']);
        $temp->setValue('new_contract_date', Helper::getDateTex($data['new_contract_date']));
        $temp->setValue('stir', $data['stir']);
        $temp->setValue('worker_address', $data['worker_address']);
        $temp->setValue('organization_full_name', $data['organization_full_name']);
        $temp->setValue('worker_phone', $data['worker_phone']);
        $temp->setValue('director_position', $data['director_position'] . ' ');
        $temp->setValue('director_phone', $data['director_phone']);
        $temp->setValue('organization_address', $data['organization_address']);

        return $temp;
    }

    public function saveDocument($data, $temp, $model): false|string
    {
        $newFilePath = 'replaced-files/' . $data['fileName'];
        $temp->saveAs('storage/' . $newFilePath);
        $filePath = new self()->uploadFileFromPath('storage/' . $newFilePath, $data['fileName'], $model);
        Storage::delete($newFilePath);
        return $filePath;
    }

    public function contractAdditionalReplace($user, $request, $workerPosition, $uuid): false|string
    {
        $data = $this->extracted(
            $user,
            $request,
            $workerPosition->worker,
            'contract-additional',
            $request->probation,
            $uuid
        );
        $temp = $this->replace($data);

        switch ((int)$request->type) {
            case ContractAdditionalTypeEnum::EIGHT->value:
                $contract_number = $workerPosition->contract->number;
                $contract_date = Helper::getDateTex(Carbon::parse($workerPosition->contract->contract_date));
                if ($request->department_position_id) {
                    $departmentPosition = DepartmentPosition::with('position')->find($request->department_position_id);
                    $worker_new_position = PositionHelper::getShortPosition($departmentPosition);
                } else {
                    $worker_new_position = Position::find($request->position_id)->name;
                }
                $temp->setValue('worker_position', PositionHelper::getShortPosition($workerPosition) . ' ');
                $temp->setValue('worker_new_position', $worker_new_position);
                $temp->setValue('contract_number', $contract_number);
                $temp->setValue('contract_date', $contract_date);
                $temp->setValue('number', $data['number']);
                break;
            case ContractAdditionalTypeEnum::ONE->value:
                $contract_number = $workerPosition->contract->number;
                $contract_date = Helper::getDateTex(Carbon::parse($workerPosition->contract->contract_date));
                $temp->setValue('worker_position', PositionHelper::getShortPosition($workerPosition) . ' ');
                $temp->setValue('contract_number', $contract_number);
                $temp->setValue('contract_date', $contract_date);
                $temp->setValue('number', $data['number']);
                break;
            case ContractAdditionalTypeEnum::THIRTEEN->value:
            case ContractAdditionalTypeEnum::TWELVE->value:
                if (!$workerPosition->contract) {
                    throw HRServiceException::contractNotFound(trans('messages.replace.contract_not_found'));
                }
                $contract_number = $workerPosition->contract->number;
                $contract_date = Helper::getDateTex(Carbon::parse($workerPosition->contract->contract_date));
                $contract_to_date = Helper::getDateTex(Carbon::parse($request->contract_to_date));
                $temp->setValue('worker_position', PositionHelper::getShortPosition($workerPosition) . ' ');
                $temp->setValue('contract_number', $contract_number);
                $temp->setValue('contract_date', $contract_date);
                $temp->setValue('contract_to_date', $contract_to_date);
                $temp->setValue('number', $data['number']);
                break;
            default:
                throw HRServiceException::typeNotAllowed(trans('messages.replace.type_not_allowed'));
        }
        return $this->saveDocument($data, $temp, 'contract-additional');
    }
}
