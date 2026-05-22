<?php

namespace Modules\Integration\Services;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Integration\Transformers\StationWorkerPositionResource;
use Modules\Structure\Models\StationCode;

class StationService
{
    public function __construct(
        public IntegrationService $service
    )
    {
    }

    public function index($data, $code): JsonResponse
    {
        $station = StationCode::query()
            ->with('model')
            ->firstWhere('code', $code);

        if (!$station) {
            return Helper::response(trans('messages.not_found'), [], 404);
        }

        $user = auth()->user();
        $baseQuery = WorkerPosition::query()
            ->filter($user, $data)
            ->with([
                'department:id,name,level',
                'worker:id,last_name,first_name,middle_name,photo',
                'organization:id,name,group',
                'position:id,name'
            ]);

        if ($station->model_type === 'Modules\HR\Models\Department') {
            $baseQuery->where('department_id', $station->model_id);
        } else
            if ($station->model_type === 'Modules\Structure\Models\Organization') {
                $baseQuery->where('organization_id', $station->model_id);
            }


        $directorQuery = clone $baseQuery;
        $director = Cache::remember('station_director_' . $code, now()->addHours(2),
            static function () use ($directorQuery) {
                $item = $directorQuery->where('position_id', 437)->first();
                return $item ? new StationWorkerPositionResource($item) : null;
            });

        $deputyQuery = clone $baseQuery;
        $deputies = Cache::remember('station_deputies_' . $code,
            now()->addHours(2), static function () use ($deputyQuery) {
                $items = $deputyQuery->whereIn('position_id', [420, 423, 422])->get();
                return $items ? StationWorkerPositionResource::collection($items) : null;
            });

        $workers = $baseQuery->paginate($data['per_page'] ?? 50);
        $workers = PaginateResource::make($workers, StationWorkerPositionResource::class);

        return Helper::response(true, [
            'name' => $station->model->name ?? '',
            'director' => $director,
            'deputy' => $deputies,
            'workers' => $workers
        ]);
    }

    public function show($workerUuid, $user): JsonResponse
    {
        $workerPosition = WorkerPosition::query()
            ->with('worker:id,uuid')
            ->whereUuid($workerUuid)
            ->first();
        if (!$workerPosition) {
            return Helper::response(trans('messages.not_found'), [], 404);
        }

        $workerUuid = $workerPosition->worker->uuid;
        return Helper::response(true, $this->service->showWorker($workerUuid, $user));
    }

    public function stats($code): JsonResponse
    {
        $station = StationCode::query()
            ->with('model')
            ->firstWhere('code', $code);

        if (!$station) {
            return Helper::response(trans('messages.not_found'), [], 404);
        }

        $user = auth()->user();
        $modelId = $station->model_id;

        $ratesCount = (int)DepartmentPosition::query()
            ->filter($user, [])
            ->when($station->model_type === 'Modules\HR\Models\Department',
                function ($q) use ($modelId) {
                    $q->where('organization_id', $modelId);
                })
            ->when($station->model_type === 'Modules\Structure\Models\Organization',
                function ($q) use ($modelId) {
                    $q->where('department_id', $modelId);
                })
            ->sum('rate');

        $sumRate = WorkerPosition::query()
            ->filter($user, [])
            ->when($station->model_type === 'Modules\HR\Models\Department',
                function ($q) use ($modelId) {
                    $q->where('organization_id', $modelId);
                })
            ->when($station->model_type === 'Modules\Structure\Models\Organization',
                function ($q) use ($modelId) {
                    $q->where('department_id', $modelId);
                })
            ->sum('rate');

        $vacant = $ratesCount - $sumRate;

        $workerPositionQuery = Worker::query()
            ->whereHas('position', function ($q) use ($station, $modelId, $user) {
                $q->filter($user, [])
                    ->when($station->model_type === 'Modules\HR\Models\Department',
                        function ($q) use ($modelId) {
                            $q->where('organization_id', $modelId);
                        })
                    ->when($station->model_type === 'Modules\Structure\Models\Organization',
                        function ($q) use ($modelId) {
                            $q->where('department_id', $modelId);
                        });
            });

        $data = (clone $workerPositionQuery)
            ->selectRaw(
                'COUNT(*) AS total,
                SUM((sex)::int) AS male,
                SUM((NOT sex)::int) AS female,
                SUM(CASE WHEN education = 1 THEN 1 ELSE 0 END) AS higher_education,
                SUM(CASE WHEN education = 2 THEN 1 ELSE 0 END) AS secondary_speciality_education,
                SUM(CASE WHEN education = 3 THEN 1 ELSE 0 END) AS secondary_education,
                SUM(CASE WHEN birthday >= ? THEN 1 ELSE 0 END) AS age31,
                SUM(CASE WHEN birthday >= ? THEN 1 ELSE 0 END) AS age45,
                SUM(CASE WHEN sex AND birthday <= ? THEN 1 ELSE 0 END) AS allowanceMan,
                SUM(CASE WHEN NOT sex AND birthday <= ? THEN 1 ELSE 0 END) AS allowanceWoman',
                [
                    now()->subYears(31),
                    now()->subYears(45),
                    now()->subYears(60),
                    now()->subYears(55)
                ])
            ->first();


        $birthdays_count = (clone $workerPositionQuery)
            ->whereMonth('birthday', '=', now()->format('m'))
            ->count();

        return Helper::response(true, [
            'allowanceMan' => (int)$data?->allowanceMan,
            'allowanceWoman' => (int)$data?->allowanceWoman,
            'total_workers' => $data?->total,
            'total_male' => (int)$data?->male,
            'total_female' => (int)$data?->female,
            'birthdays_count' => $birthdays_count,
            'rates_count' => $ratesCount,
            'vacant' => max($vacant, 0),
            'overstaffed' => min($vacant, 0),
            'higher_education' => (int)$data?->higher_education,
            'secondary_speciality_education' => (int)$data?->secondary_speciality_education,
            'secondary_education' => (int)$data?->secondary_education,
            'age31' => (int)$data?->age31,
            'age32_45' => (int)$data?->age45 - (int)$data?->age31,
            'age46' => $data?->total - (int)$data?->age45,
        ]);
    }

}
