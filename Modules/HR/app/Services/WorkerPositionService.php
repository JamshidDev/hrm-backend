<?php

namespace Modules\HR\Services;

use App\Helpers\PositionHelper;
use App\Helpers\WorkerResumeHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\HR\DTO\WorkerPositionDTO;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Transformers\Department\DepartmentListResource;
use Modules\Structure\Transformers\Organization\OrganizationListResource;
use Modules\Structure\Transformers\Position\PositionMinimalResource;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class WorkerPositionService
{
    public function update(int $id, WorkerPositionDTO $dto): WorkerPosition
    {
        return DB::transaction(function () use ($id, $dto) {
            $workerPosition = WorkerPosition::with('contract')->findOrFail($id);
            $workerPosition->contract?->update([
                'number' => $dto->contractNumber,
                'contract_date' => $dto->contractDate,
                'type' => $dto->type,
                'user_id' => auth()->id(),
            ]);

            $positionData = $dto->positionData;

            if ($dto->departmentPositionId) {
                $dp = DepartmentPosition::findOrFail($dto->departmentPositionId);

                $positionData['department_id'] = $dp->department_id;
                $positionData['position_id'] = $dp->position_id;
                $positionData['department_position_id'] = $dp->id;
            }
            $workerPosition->update($positionData);
            return $workerPosition;
        });
    }

    public function delete(WorkerPosition $workerPosition): void
    {
        $otherCarers = WorkerPosition::query()
            ->whereNot('id', $workerPosition->id)
            ->where('worker_id', $workerPosition->worker_id)
            ->where('organization_id', $workerPosition->organization_id)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->count();

        if (!$otherCarers && $workerPosition->status === PositionStatusEnum::ACTIVE->value) {
            throw HRServiceException::workerPositionHasOtherCareers(trans('messages.worker.worker_position_has_other_carers'));
        }
        $workerPosition->delete();
    }

    public function positions($positions): array
    {
        if (!$positions) {
            return [];
        }
        $a = [];
        foreach ($positions->sortBy('position_date') as $position) {
            if ($position->to) {
                $to = $position->to;
            } else {
                $nextPosition = $positions->where('id', '>', $position->id)->first();
                if ($nextPosition) {
                    if ($nextPosition->contract_id === $position->contract_id) {
                        $to = $nextPosition->position_date;
                    } else {
                        $to = $position->contract->contract_to_date;
                    }
                } else {
                    $to = null;
                }
            }

            $a[] = [
                'id' => $position?->id,
                'organization' => $position->organization ? new OrganizationListResource($position->organization) : null,
                'department' => $position->department ? new DepartmentListResource($position->department) : null,
                'position' => $position->position ? new PositionMinimalResource($position->position) : null,
                'full_position' => $position ? PositionHelper::getFullPosition($position) : null,
                'from' => $position?->position_date,
                'to' => $to
            ];
        }
        return $a;
    }

    public function downloadResume($uuid = null, $user = null, $id = null): BinaryFileResponse
    {
        $workerPosition = WorkerPosition::query()
            ->with([
                'worker.city',
                'worker.region',
                'worker.relatives',
                'worker.languages',
                'worker.nationality',
                'worker.universities.speciality',
                'worker.universities.university',
                'worker.party',
                'worker.academic_degree',
                'worker.academic_title',
                'department',
                'organization'
            ]);

        if ($user) {
            $workerPosition = $workerPosition->where('worker_id', $user->worker_id)->find($id);
        } else {
            $workerPosition = $workerPosition->whereUuid($uuid)->first();
        }

        $temp = WorkerResumeHelper::downloadResume($workerPosition);
        $fullName = preg_replace('/[\/\\\\]/', '-', $workerPosition?->worker->full_name());
        $filename = Str::slug($fullName) . '.docx';

        return response()->download($temp->save(), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend();
    }
}
