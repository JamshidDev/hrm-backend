<?php

namespace Modules\HR\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\DTO\CommandData;
use Modules\HR\Enums\CommandTypeEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Command;
use Modules\HR\Models\ConfirmationWorker;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerPosition;
use RuntimeException;

class CommandService
{
    public function __construct(protected CommandReplaceService $replaceService)
    {}

    public function store(CommandData $dto, $user): ?string
    {
        return DB::transaction(function () use ($dto, $user) {
            $director = ConfirmationWorker::with('worker')->findOrFail($dto->directorId);
            $workerPosition = $this->resolveWorkerPosition($dto);
            $this->checkWorkerDocuments($dto, $workerPosition);
            return $this->replaceService->replace(
                $dto->payload,
                $user,
                $director,
                $workerPosition,
                null,
                $dto->status
            );
        });
    }

    private function resolveWorkerPosition(CommandData $dto): ?WorkerPosition
    {
        if (CommandTypeEnum::isManyType($dto->commandType)) {
            return null;
        }

        return WorkerPosition::with([
            'worker',
            'worker.passport',
            'worker.phones',
            'worker.current_city',
            'worker.current_region',
            'contract'
        ])->findOrFail($dto->workerPositionId);
    }

    private function checkWorkerDocuments(CommandData $dto, ?WorkerPosition $workerPosition): void
    {
        if (!$workerPosition || $dto->status === 'view') {
            return;
        }

        if (!isset($dto->payload['stats'])) {
            return;
        }

        $status = (new WorkerService)->checkWorkerDocument($workerPosition->worker_id);

        if (!$status['status']) {
            throw new RuntimeException(
                trans('messages.you_cannot_create_a_document_for_another_worker_' . $status['type'])
            );
        }
    }

    public function checkWorkerPositionAdditional($type, $workerPositionId): array
    {
        $workerPosition = WorkerPosition::with('worker')->findOrFail($workerPositionId);

        $year = (int)now()->diffInYears(Carbon::parse($workerPosition->worker->experience_date));

        $lastVacation = Vacation::where('worker_id', $workerPosition->worker_id)
            ->latest('id')
            ->first();

        if ($lastVacation) {
            $period1 = $lastVacation->period_to;
            $period2 = Carbon::parse($lastVacation->period_to)->addYear()->format('Y-m-d');
            $rest_day = abs($lastVacation->rest_day);
            $all_day = abs($lastVacation->all_day);
        }

        return match ($type) {
            'pension_count' => [
                'year' => abs($year),
                'count' => abs((int)($year / 5)),
            ],
            'pension_coefficient' => [
                'year' => abs($year),
                'coefficient' => $this->getCoefficient(abs($year)),
            ],
            'salary_withholding', 'compensation' => [
                'period1' => $period1 ?? null,
                'period2' => $period2 ?? null,
                'rest_day' => $rest_day ?? null,
                'all_day' => $all_day ?? null,
                'month' => now()->month,
            ],
            'financial_assistance' => [
                'experience_coefficient' => $this->getCoefficient(abs($year))
            ],
            default => throw ValidationException::withMessages([
                'type' => __('messages.invalid_type'),
            ]),
        };
    }

    private function getCoefficient($experience): int
    {
        if ($experience <= 10) {
            return 30;
        }

        if ($experience <= 20) {
            return 50;
        }

        return 70;
    }

    public function delete($commandId): void
    {
        $command = Command::findOrFail($commandId);
        if ($command->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            throw HRServiceException::approvedDocumentCannotBeDeleted(trans('messages.you_cannot_delete_a_document_that_has_been_approved'));
        }
        $contract = $command->load('contract_model')->contract_model;
        if ($contract && $contract->confirmation === ConfirmationStatusEnum::SUCCESS->value) {
            throw HRServiceException::approvedDocumentCannotBeDeleted(trans('messages.you_cannot_delete_a_document_that_has_been_approved'));
        }
        $command->delete();
    }
}
