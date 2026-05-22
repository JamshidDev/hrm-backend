<?php

namespace App\Jobs\HR;

use App\Enums\ExportJobStatusEnum;
use App\Helpers\Helper;
use App\Helpers\PositionHelper;
use App\Models\User;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Maatwebsite\Excel\Facades\Excel;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\EducationEnum;
use Modules\HR\Enums\MaritalStatusEnum;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Exports\WorkerExport;
use Modules\HR\Models\WorkerPosition;

class WorkersExportToExcelJob implements ShouldQueue
{
    use Queueable;

    protected array $columns;
    protected array $query;
    protected int $userId;

    protected UserExportTask $task;

    public function __construct($columns, $task, $query, $userId)
    {
        $this->columns = $columns;
        $this->task = $task;
        $this->query = $query;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        $user = User::findOrFail($this->userId);
        try {
            $columns = $this->columns;
            request()->merge($this->query);

            $workerBase = [
                'last_name',
                'first_name',
                'middle_name',
                'birthday',
                'sex',
                'pin',
                'work_experience',
                'address',
                'education',
                'experience_date',
                'marital_status'
            ];

            $workerFunc = ['full_name'];

            $workerBelongs = [
                'region'         => 'name',
                'city'           => 'name',
                'country'        => 'name',
                'current_region' => 'name',
                'current_city'   => 'name',
                'nationality'    => 'name',
            ];
            $workerHas = ['photo' => 'photo'];

            $positionBase = ['group', 'rank', 'rate', 'position_date', 'type', 'position_id', 'department_id', 'organization_id'];
            $positionFunc = ['full_position', 'short_position'];
            $positionBelongs = [
                'department'   => 'name',
                'position'     => 'name',
                'contract'     => 'number',
            ];

            [$workerDirect, $workerForeign, $workerWith, $workerForeignIds] = $this->prepareColumns(
                $columns,
                $workerBase,
                $workerBelongs
            );
            $workerHasWith = collect($columns)
                ->filter(fn($col) => array_key_exists($col, $workerHas))
                ->map(fn($col) => 'worker.' . $col . ':id,worker_id,' . $workerHas[$col])
                ->toArray();

            if (array_intersect(['passport_serial_number', 'passport_from_date', 'passport_to_date', 'passport_address'], $columns)) {
                $workerHasWith[] = 'worker.passport:id,worker_id,serial_number,from_date,to_date,address';
            }

            if (array_intersect(['universities', 'specialities'], $columns)) {
                $workerHasWith[] = 'worker.universities.university';
                $workerHasWith[] = 'worker.universities.speciality';
            }

            if (array_intersect(['phones'], $columns)) {
                $workerHasWith[] = 'worker.phones';
            }

            if (array_intersect(['med_from', 'med_to', 'med_status'], $columns)) {
                $workerHasWith[] = 'worker.med';
            }

            $workerRelation = 'worker:id,' . implode(',', array_merge($workerDirect, $workerForeignIds, $workerBase));

            [$positionDirect, $positionForeign, $positionWith, $positionForeignIds] = $this->prepareColumns(
                $columns,
                $positionBase,
                $positionBelongs,
                null
            );

            foreach ($positionWith as $key => $v) {
                if ($v === "department:id,name") {
                    $positionWith[$key] = "department:id,name,level";
                    break;
                }
            }

            $positionWith[] = "organization:id,full_name,name";

            $with = array_merge([$workerRelation], $workerWith, $workerHasWith, $positionWith);

            $select = array_merge(['id', 'worker_id', 'organization_id'], $positionDirect, $positionForeignIds);

            $with = array_unique($with);
            $positions = WorkerPosition::query()
                ->filter($user, $this->query)
                ->remainingFilter()
                ->select($select)
                ->with($with)
                ->get();

            $collection = $positions->map(function ($position) use (
                $columns,
                $workerHas,
                $workerBelongs,
                $positionBelongs,
                $workerDirect,
                $workerFunc,
                $positionDirect,
                $positionFunc
            ) {
                return collect($columns)->mapWithKeys(function ($col) use (
                    $position,
                    $workerHas,
                    $workerBelongs,
                    $positionBelongs,
                    $workerDirect,
                    $workerFunc,
                    $positionDirect,
                    $positionFunc
                ) {
                    return match (true) {
                        isset($workerBelongs[$col]) =>
                        [$col => $position->worker?->$col?->{$workerBelongs[$col]} ?? ''],

                        isset($positionBelongs[$col]) =>
                        [$col => $position->$col?->{$positionBelongs[$col]} ?? ''],

                        $col === 'sex' =>
                        [$col => $position->worker?->sex ? 'Erkak' : 'Ayol'],

                        $col === 'marital' => (function () use ($position, $col) {
                            if ((int)$position->worker?->marital_status === MaritalStatusEnum::TWO->value) {
                                return [$col => $position->worker?->sex ? 'Uylangan' : 'Turmushga chiqqan'];
                            }
                            return [$col => MaritalStatusEnum::get((int)$position->worker?->marital_status) ?? ''];
                        })(),

                        $col === 'type' =>
                        [$col => ContractTypeEnum::getMinimized($position->type)],

                        $col === 'passport_serial_number' =>
                        [$col => $position->worker?->passport?->serial_number ?? ''],

                        $col === 'organization_name' =>
                        [$col => $position->organization?->name ?? ''],

                        $col === 'passport_from_date' =>
                        [$col => $position->worker?->passport?->from_date ?? ''],

                        $col === 'passport_to_date' =>
                        [$col => $position->worker?->passport?->to_date ?? ''],

                        $col === 'passport_address' =>
                        [$col => $position->worker?->passport?->address ?? ''],

                        $col === 'universities' => (function () use ($position, $col) {
                            if ($position->worker?->universities) {
                                $universities = $position->worker->universities->map(function ($university) {
                                    $from = Carbon::parse($university?->from_date ?? now()->toDateString())->year;
                                    $to   = Carbon::parse($university?->to_date ?? now()->toDateString())->year;
                                    return $from . '-' . $to . ', ' . $university->university?->name;
                                })->toArray();

                                return [$col => implode('; ', $universities)];
                            }
                            return [$col => ''];
                        })(),

                        $col === 'phones' => (function () use ($position, $col) {
                            if ($position->worker?->phones) {
                                $phones = Helper::formatUzPhoneNumber(
                                    $position->worker->phones->pluck('phone')->toArray()
                                );
                                return [$col => implode('; ', $phones)];
                            }
                            return [$col => ''];
                        })(),

                        $col === 'specialities' => (function () use ($position, $col) {
                            if ($position->worker?->universities) {
                                $specialities = $position->worker->universities
                                    ->map(fn($u) => $u->speciality?->name)
                                    ->toArray();

                                return [$col => implode('; ', $specialities)];
                            }
                            return [$col => ''];
                        })(),

                        $col === 'work_experience' =>
                        [$col => Helper::formatExperience($position->worker?->work_experience)],

                        $col === 'position_experience' =>
                        [$col => $position->position_date],

                        $col === 'med_from' =>
                        [$col => $position->worker?->med?->from ?? ''],

                        $col === 'med_to' =>
                        [$col => $position->worker?->med?->to ?? ''],

                        $col === 'education' =>
                        [$col => EducationEnum::get($position->worker?->education)],

                        $col === 'med_status' =>
                        [$col => MedStatusEnum::get($position->worker?->med?->status) ?? ''],

                        isset($workerHas[$col]) =>
                        [$col => $position->worker?->{$workerHas[$col]}->$col ?? ''],

                        in_array($col, $workerDirect, true) =>
                        [$col => $position->worker?->$col ?? ''],

                        in_array($col, $workerFunc, true) =>
                        [$col => $position->worker?->$col() ?? ''],

                        in_array($col, $positionFunc, true) =>
                        match ($col) {
                            'full_position'  => [$col => PositionHelper::getFullPosition($position)],
                            'short_position' => [$col => PositionHelper::getShortPosition($position)],
                            default          => [$col => $position],
                        },

                        in_array($col, $positionDirect, true) =>
                        [$col => $position->$col ?? ''],

                        default =>
                        [$col => ''],
                    };
                });
            });

            $fileName = 'tasks/export/' . md5($this->task->id) . '.xlsx';
            Excel::store(new WorkerExport($collection, $columns, $columns), $fileName, 'minio');

            $this->task->update(['file'   => $fileName, 'status' => ExportJobStatusEnum::DONE->value]);
        } catch (Exception $e) {
            Helper::setLog($e, 'Workers export failed:');
            $this->task->update(['status' => ExportJobStatusEnum::ERROR->value, 'error' => $e->getMessage()]);
        }
    }


    protected function prepareColumns(
        array $columns,
        array $staticColumns,
        array $belongsTo = [],
        $model = 'worker.'
    ): array {
        $direct = array_values(array_intersect($columns, $staticColumns));
        $foreign = array_values(array_intersect($columns, array_keys($belongsTo)));
        $with = array_map(static fn($col) => $model . $col . ':id,' . $belongsTo[$col], $foreign);
        $foreignIds = array_map(static fn($col) => $col . '_id', $foreign);

        return [$direct, $foreign, $with, $foreignIds];
    }
}
