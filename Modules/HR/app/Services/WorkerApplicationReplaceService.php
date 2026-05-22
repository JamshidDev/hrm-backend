<?php

namespace Modules\HR\Services;

use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ApplicationEducationTypeEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Enums\WorkerApplicationTypeEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerPosition;
use PhpOffice\PhpWord\TemplateProcessor;

class WorkerApplicationReplaceService
{
    use Base64FileUploadTrait;

    public function workerApplicationReplace($dto, $user, $director, $workerPosition, $uuid): false|string
    {
        $documentPath = public_path('resumes/worker-application/' . $dto['type'] . '.docx');
        $fileName = $uuid . '.docx';
        $temp = new TemplateProcessor($documentPath);
        $temp->setValue('director_short_name', $director->worker->short_name());
        $temp->setValue('director_position', $director->position);
        $temp->setValue('organization_name', $director->organization->full_name);

        switch ($dto['type']) {
            case WorkerApplicationTypeEnum::ONE->value:
                $this->oneHelper($dto, $user, $temp);
                break;
            case WorkerApplicationTypeEnum::TWO->value:
                if ($dto['contract_to_date'] ?? null) {
                    $reason = Helper::getDateTex(Carbon::parse($dto['contract_to_date'])) . " kuniga qadar";
                } else if ($dto['temporarily_absent'] ?? null) {
                    $lastVacation = Vacation::query()
                        ->where('worker_position_id', $dto['temporarily_absent'] ?? null)
                        ->latest('id')
                        ->first();
                    if (!$lastVacation) {
                        throw HRServiceException::vacationNotFound(trans('messages.worker.not_found'));
                    }

                    $this->twoHelper($dto, $user, $temp);

                    $reason = VacationTypeEnum::get($lastVacation->type, 'uz') . "dan qaytguniga qadar";
                } else {
                    throw HRServiceException::vacationNotFound(trans('messages.worker.not_found'));
                }

                $temp->setValue('reason', $reason);
                break;
            case WorkerApplicationTypeEnum::THREE->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $from = Helper::getDateTex(Carbon::parse($dto['from']));
                $temp->setValue('period_to', Helper::getDateTex(Carbon::parse($dto['period_from'])));
                $temp->setValue('period_from', Helper::getDateTex(Carbon::parse($dto['period_to'])));

                if (array_key_exists('to', $dto) && $dto['to']) {
                    $to = Helper::getDateTex(Carbon::parse($dto['to']));
                    $vacationDate = $from . 'dan ' . $to . 'gacha';
                    $temp->setValue('vacation_date', $vacationDate);
                } else {
                    $from = Helper::getDateTex(Carbon::parse($dto['from'] ?? now()->toDateString()));
                    $temp->setValue('vacation_date', $from . 'dan');
                }

                $temp->setValue('reason', $reason ?? ($dto['reason'] ?? ''));
                break;
            case WorkerApplicationTypeEnum::FOUR->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $this->vacationFourHelper($dto, $temp);
                break;
            case WorkerApplicationTypeEnum::FIVE->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $this->vacationFiveHelper($dto, $temp);
                break;
            case WorkerApplicationTypeEnum::SIX->value:
            case WorkerApplicationTypeEnum::SEVEN->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $this->sixHelper($dto, $temp);
                break;
            case WorkerApplicationTypeEnum::EIGHT->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $this->eightHelper($dto, $temp);
                break;
            case WorkerApplicationTypeEnum::NINE->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $temp->setValue('reason', $dto['reason'] ?? '');
                break;
            case WorkerApplicationTypeEnum::TEN->value:
                $worker = $workerPosition->worker;
                $temp->setValue('worker_short_name', $worker->short_name());
                $temp->setValue('worker_position', $workerPosition->post_name);
                $temp->setValue('reason', $dto['reason'] ?? '');
                $temp->setValue('contract_to_date', Helper::getDateTex(Carbon::parse($dto['contract_to_date'] ?? now()->toDateString())));
                break;
        }

        $newFilePath = 'replaced-files/' . $fileName;
        $temp->saveAs('storage/' . $newFilePath);
        $filePath = $this->uploadFileFromPath(
            'storage/' . $newFilePath,
            $fileName,
            'worker-application'
        );
        Storage::delete($newFilePath);
        return $filePath;
    }

    public function oneHelper($dto, $user, TemplateProcessor $temp): void
    {
        $departmentPosition = DepartmentPosition::with([
            'department',
            'organization'
        ])->findOrFail($dto['department_position_id'] ?? null);
        $worker = $user->load('worker')->worker;
        $worker_full_birthday_address = $worker->fullBirthdayAddress();
        $position = PositionHelper::getFullPosition($departmentPosition);
        $temp->setValue('worker_short_name', $worker->short_name());
        $temp->setValue('worker_full_birthday_address', $worker_full_birthday_address);
        $temp->setValue('from_date', Helper::getDateTex(Carbon::parse($dto['from_date'] ?? now()->toDateString())));
        $temp->setValue('rate', $dto['rate'] ?? 1);
        $temp->setValue('post_name', $position);
    }

    public function twoHelper($dto, $user, TemplateProcessor $temp): void
    {
        $workerPosition = WorkerPosition::findOrFail($dto['temporarily_absent'] ?? null);
        $worker = $user->load('worker')->worker;
        $worker_full_birthday_address = $worker->fullBirthdayAddress();
        $temp->setValue('worker_short_name', $worker->short_name());
        $temp->setValue('worker_full_birthday_address', $worker_full_birthday_address);
        $temp->setValue('from_date', Helper::getDateTex(Carbon::parse($dto['from_date'] ?? now()->toDateString())));
        $temp->setValue('rate', $dto['rate'] ?? 1);
        $temp->setValue('post_name', PositionHelper::getShortPosition($workerPosition));
    }

    public function vacationFourHelper($dto, $temp): void
    {
        $from = Helper::getDateTex(Carbon::parse($dto['from']));
        $text = '';
        if (!array_key_exists('to', $dto)) {
            $dto['to'] = null;
        }
        if (!array_key_exists('from', $dto)) {
            $dto['from'] = null;
        }
        if (!array_key_exists('from_time', $dto)) {
            $dto['from_time'] = null;
        }
        if (!array_key_exists('to_time', $dto)) {
            $dto['to_time'] = null;
        }
        if ($dto['to']) {
            $to = Helper::getDateTex(Carbon::parse($dto['to']));
            if ($dto['to'] === $dto['from']) {
                $text .= $from . ' kuni';
                if ($dto['from_time']) {
                    $text .= 'soat ' . $dto['from_time'] . 'dan ';
                }
                if ($dto['to_time']) {
                    $text .= ' soat ' . $dto['to_time'] . 'gacha';
                }
            } else {
                $to = Helper::getDateTex(Carbon::parse($dto['to']));
                if ($dto['from_time']) {
                    $text .= $from . ' soat ' . $dto['from_time'] . 'dan ';
                } else {
                    $text .= $from . 'dan ';
                }

                if ($dto['to_time']) {
                    $text .= $to . ' soat ' . $dto['to_time'] . 'gacha';
                } else {
                    $text .= $to . 'gacha';
                }
            }
        } else {
            $text .= $from . ' kuni';
            if ($dto['from_time']) {
                $text .= 'soat ' . $dto['from_time'] . 'dan ';
            }
            if ($dto['to_time']) {
                $text .= ' soat ' . $dto['to_time'] . 'gacha';
            }
        }

        $temp->setValue('vacation_date', $text);
    }

    public function vacationFiveHelper($dto, $temp): void
    {
        $from = Helper::getDateTex(Carbon::parse($dto['from'] ?? now()->toDateString()));
        $to = Helper::getDateTex(Carbon::parse($dto['to'] ?? now()->toDateString()));
        $text = $from . 'dan ' . $to . 'gacha';

        $temp->setValue('vacation_date', $text);
    }

    public function sixHelper($dto, $temp): void
    {
        $from_date = Helper::getDateTex(Carbon::parse($dto['from_date'] ?? now()->toDateString()));
        $department_position = DepartmentPosition::findOrFail($dto['department_position_id'] ?? null);
        $position = PositionHelper::getFullPosition($department_position);
        $temp->setValue('new_position', $position);
        $temp->setValue('from_date', $from_date);
        $temp->setValue('reason', $dto['reason'] ?? '');
    }

    public function eightHelper($dto, $temp): void
    {
        $uni_date = Helper::getDateTex(Carbon::parse($dto['univer_date'] ?? now()->toDateString()));
        $temp->setValue('univer_date', $uni_date);
        $temp->setValue('univer_number', $dto['univer_number'] ?? '');
        $temp->setValue('education_type', ApplicationEducationTypeEnum::tryFrom($dto['education_type'] ?? 1)
            ?->label('uz'));
    }
}
