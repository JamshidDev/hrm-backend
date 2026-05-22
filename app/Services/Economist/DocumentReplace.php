<?php

namespace App\Services\Economist;

use App\Helpers\ConvertHelper;
use App\Helpers\PositionHelper;
use App\Services\SignatureService;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Confirmation\Models\StaffingApproveConfirmation;
use Modules\Economist\Enums\ChangedStatusEnum;
use Modules\Economist\Exports\StaffingApproveExport;
use Modules\Economist\Models\StaffingApprove;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;

class DocumentReplace
{
    use Base64FileUploadTrait;

    public function __construct(protected SignatureService $signatureService)
    {
    }

    public function generate($user, $request): array
    {
        return DB::transaction(function () use ($user, $request) {
            $date = $request->date ?? now()->format('Y-m-d');
            $depIds = $request->get('department_positions');
            $departmentPositionsIds = DepartmentPosition::query()
                ->where('status', ConfirmationStatusEnum::PROCESS->value)
                ->whereIn('id', $depIds)
                ->get()
                ->pluck('id')
                ->toArray();

            if ($request->staffing_approve_id) {
                $staffingApprove = StaffingApprove::query()
                    ->whereNot('confirmation', ConfirmationStatusEnum::SUCCESS->value)
                    ->where('id', $request->staffing_approve_id)->first();

                if (!$staffingApprove) {
                    return ['status' => false, 'message' => 'Staffing Approve not found.'];
                }
            } else {
                $staffingApprove = StaffingApprove::query()
                    ->create([
                        'organization_id' => $user->organization_id,
                        'user_id' => $user->id,
                        'date' => $date,
                        'confirmatory_id' => $request->confirmatory_id,
                        'director_id' => $request->director_id,
                        'generate' => 3
                    ]);
            }

            $director = WorkerPosition::query()
                ->with([
                    'department:id,name,level',
                    'position:id,name',
                    'organization:id,name,full_name',
                    'worker:id,last_name,first_name,middle_name',
                ])
                ->findOrFail($request->director_id);

            $staffingApprove->department_positions()->sync($departmentPositionsIds);
            $confirmations = $this->syncConfirmations($staffingApprove, $request);
            if (!$confirmations['status']) {
                return ['status' => false, 'message' => $confirmations['message']];
            }
            $organization = $user->organization;
            $fileName = $staffingApprove->file;

            $qrCode = $this->signatureService->signatureToImageDigital('staffing-approve', $staffingApprove->uuid);

            Excel::store(new StaffingApproveExport(
                $user,
                $this->changedPositions($user, $departmentPositionsIds),
                $organization,
                $date,
                $director,
                $qrCode),
                $fileName, 'minio');

            $saveDocument = ConvertHelper::docxToPdf($fileName, 'documents/staffing-approve', 'minio');
            if (!$saveDocument['status']) {
                return ['status' => false, 'message' => $saveDocument['msg']];
            }
            return ['status' => true, 'message' => $staffingApprove];
        });
    }

    public function syncConfirmations($staffingApprove, $request): ?array
    {
        if ($request->confirmatory_id === $request->director_id) {
            return ['status' => false, 'message' => trans('messages.not_allowed_confirmatory_and_director')];
        }

        if (in_array($request->director_id, $request->confirmations, true) || in_array($request->confirmatory_id, $request->confirmations, true)) {
            return ['status' => false, 'message' => trans('messages.not_allowed_confirmatory_and_director')];
        }
        $ids = array_merge([$request->director_id, $request->confirmatory_id], $request->confirmations);
        $confirmations = WorkerPosition::query()
            ->with([
                'organization:id,name,full_name',
                'department:id,name,level',
                'position:id,name'
            ])
            ->whereIn('id', $ids)
            ->get();

        $order = 0;
        foreach ($request->confirmations as $confirmation) {
            $c = $confirmations->where('id', $confirmation)->first();
            $order++;
            StaffingApproveConfirmation::updateOrCreate(
                [
                    'staffing_approve_id' => $staffingApprove->id,
                    'worker_id' => $c->worker_id,
                ],
                [

                    'position' => PositionHelper::getShortPosition($c),
                    'type' => 's',
                    'order' => $order
                ]
            );
        }

        $confirmatory = $confirmations->where('id', $request->confirmatory_id)->first();
        $order++;
        StaffingApproveConfirmation::updateOrCreate(
            [
                'staffing_approve_id' => $staffingApprove->id,
                'worker_id' => $confirmatory->worker_id,
            ],
            [

                'position' => PositionHelper::getShortPosition($confirmatory),
                'type' => 'c',
                'order' => $order
            ]
        );

        $director = $confirmations->where('id', $request->director_id)->first();
        $order++;
        StaffingApproveConfirmation::updateOrCreate(
            [
                'staffing_approve_id' => $staffingApprove->id,
                'worker_id' => $director->worker_id,
            ],
            [

                'position' => PositionHelper::getShortPosition($director),
                'type' => 'd',
                'order' => $order
            ]
        );


        return ['status' => true];
    }


    public function changedPositions($user, $depIds = []): array
    {
        $organizationId = request('organization_id', $user->organization_id);
        $positions = DepartmentPosition::query()
            ->where('status', ConfirmationStatusEnum::PROCESS->value)
            ->where('organization_id', $organizationId)
            ->when(count($depIds), function ($query) use ($depIds) {
                $query->whereIn('id', $depIds);
            })
            ->with([
                'department',
                'position',
            ])
            ->get()
            ->groupBy('department_id');

        $data = [];
        foreach ($positions as $departmentId => $ps) {
            $dep = $ps[0]->department;
            $posArr = [];
            foreach ($ps as $position) {
                $posArr[] = [
                    'id' => $position->id,
                    'name' => $position->position?->name,
                    'rate' => $position->rate,
                    'group' => $position->group,
                    'rank' => $position->rank,
                    'salary' => number_format($position->salary, 2),
                    'amount' => number_format(($position->salary * $position->rate), 2),
                    'changed_status' => [
                        'id' => $position->changed_status,
                        'name' => ChangedStatusEnum::get($position->changed_status)
                    ],
                ];
            }

            $data[] = [
                'id' => $dep->id,
                'parent_id' => $dep->parent_id,
                'name' => $dep->name,
                'positions' => $posArr,
            ];
        }
        return $data;
    }
}
