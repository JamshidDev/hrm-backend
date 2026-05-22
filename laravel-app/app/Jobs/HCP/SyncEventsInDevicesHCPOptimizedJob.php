<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Http\Middleware\PreventDuplicateImport;
use App\Services\HikCentralService;
use Carbon\Carbon;
use GuzzleHttp\Promise\Utils;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LaravelIdea\Helper\Modules\HR\Models\_IH_Worker_QB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\HCPDeviceEvent;
use Modules\Turnstile\Models\HikCentralAccessLevelDevice;
use Modules\Turnstile\Models\HikCentralDevice;
use Modules\Turnstile\Models\SyncHCPAccessLog;
use Modules\Turnstile\Models\TerminalEvent;
use Throwable;

class SyncEventsInDevicesHCPOptimizedJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    private const int INSERT_BUFFER_SIZE = 2000;
    private const int WORKER_LOOKUP_CHUNK_SIZE = 2000;
    private const int MAX_PARALLEL_DEVICE_GROUPS = 5;
    private const int MAX_PARALLEL_PAGES_PER_GROUP = 10;

    protected SyncHCPAccessLog $syncHCPAccessLog;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('sync_events_hcp_lock')];
    }

    public function __construct($syncHCPAccessLog)
    {
        $this->syncHCPAccessLog = $syncHCPAccessLog;
    }

    public function handle(): void
    {
        $created = now()->toDateTimeString();
        $eventBuffer = [];
        $eventsCount = 0;

        try {
            $devices = HikCentralDevice::query()->get();
            $devicesGroup = $devices->groupBy('last_sync');
            $accessLevelByDeviceId = HikCentralAccessLevelDevice::query()
                ->pluck('hik_central_access_level_id', 'hik_central_device_id');

            $deviceEventsStats = [];
            $hikCentralService = new HikCentralService();
            $perPage = 500;
            $groupContexts = [];

            foreach ($devicesGroup as $groupKey => $items) {
                $lastDate = $groupKey ? Carbon::parse($groupKey) : now()->subMinutes(5);
                $endDate = $lastDate->clone()->addDay(30) < now()
                    ? $lastDate->clone()->addDay(30)
                    : now();

                $groupContexts[$groupKey] = [
                    'device_ids' => $items->pluck('hik_central_device_id')
                        ->map(static fn($id) => (string)$id)
                        ->toArray(),
                    'org_device_ids' => $items->pluck('id')->toArray(),
                    'devices_by_index_code' => $items->keyBy(static fn($device) => (string)$device->hik_central_device_id),
                    'last_date' => $lastDate,
                    'end_date' => $endDate,
                ];
            }

            foreach (array_chunk(array_keys($groupContexts), self::MAX_PARALLEL_DEVICE_GROUPS) as $groupKeysChunk) {
                $firstPagePromises = [];

                foreach ($groupKeysChunk as $groupKey) {
                    $context = $groupContexts[$groupKey];

                    $firstPagePromises[$groupKey] = $hikCentralService->doorEventsAsync(
                        $context['last_date']->toIso8601String(),
                        $context['end_date']->toIso8601String(),
                        $context['device_ids'],
                        $perPage
                    );
                }

                $firstPageResults = Utils::settle($firstPagePromises)->wait();

                foreach ($groupKeysChunk as $groupKey) {
                    $context = &$groupContexts[$groupKey];
                    $firstPageResult = $hikCentralService->resolveAsyncDoorEventsResult($firstPageResults[$groupKey] ?? null);
                    $context['lists'] = [];
                    $context['total'] = 0;

                    if (!$firstPageResult['status']) {
                        unset($context);
                        continue;
                    }

                    $context['total'] = (int)($firstPageResult['data']->total ?? 0);
                    $context['lists'][] = $firstPageResult['data']->list ?? [];

                    $lastPage = (int)ceil($context['total'] / $perPage);

                    if ($lastPage <= 1) {
                        unset($context);
                        continue;
                    }

                    foreach (array_chunk(range(2, $lastPage), self::MAX_PARALLEL_PAGES_PER_GROUP) as $pagesChunk) {
                        $pagePromises = [];

                        foreach ($pagesChunk as $page) {
                            $pagePromises[$page] = $hikCentralService->doorEventsAsync(
                                $context['last_date']->toIso8601String(),
                                $context['end_date']->toIso8601String(),
                                $context['device_ids'],
                                $perPage,
                                $page
                            );
                        }

                        $pageResults = Utils::settle($pagePromises)->wait();

                        foreach ($pagesChunk as $page) {
                            $pageResult = $hikCentralService->resolveAsyncDoorEventsResult($pageResults[$page] ?? null);

                            if (!$pageResult['status']) {
                                continue;
                            }

                            $context['lists'][] = $pageResult['data']->list ?? [];
                        }
                    }

                    unset($context);
                }
            }

            foreach ($groupContexts as $context) {
                [$groupEventBuffer, $activeDeviceIds, $deviceEventsCount] = $this->buildEventRowsForGroup(
                    $context['lists'] ?? [],
                    $context['devices_by_index_code'],
                    $accessLevelByDeviceId,
                    $created
                );

                foreach ($groupEventBuffer as $eventRow) {
                    $eventBuffer[] = $eventRow;

                    if (count($eventBuffer) >= self::INSERT_BUFFER_SIZE) {
                        $eventsCount += $this->flushEventBuffer($eventBuffer);
                    }
                }

                $activeIds = array_keys($activeDeviceIds);
                $inactiveIds = array_values(array_diff($context['device_ids'], $activeIds));

                if ($activeIds) {
                    HikCentralDevice::query()
                        ->whereIn('hik_central_device_id', $activeIds)
                        ->update(['last_sync' => $context['end_date']]);
                }

                if ($inactiveIds) {
                    HikCentralDevice::query()
                        ->whereIn('hik_central_device_id', $inactiveIds)
                        ->update(['last_sync' => $context['last_date']]);
                }

                foreach ($deviceEventsCount as $deviceId => $count) {
                    $deviceEventsStats[] = [
                        'sync_h_c_p_access_log_id' => $this->syncHCPAccessLog->id,
                        'hik_central_device_id' => $deviceId,
                        'start_time' => $context['last_date'],
                        'end_time' => $context['end_date'],
                        'events_count' => $count,
                        'created_at' => $created,
                        'updated_at' => $created,
                    ];
                }

                foreach (array_diff($context['org_device_ids'], array_keys($deviceEventsCount)) as $deviceId) {
                    $deviceEventsStats[] = [
                        'sync_h_c_p_access_log_id' => $this->syncHCPAccessLog->id,
                        'hik_central_device_id' => $deviceId,
                        'start_time' => $context['last_date'],
                        'end_time' => $context['end_date'],
                        'events_count' => 0,
                        'created_at' => $created,
                        'updated_at' => $created,
                    ];
                }
            }

            $eventsCount += $this->flushEventBuffer($eventBuffer);

            if ($deviceEventsStats) {
                foreach (array_chunk($deviceEventsStats, self::INSERT_BUFFER_SIZE) as $statsChunk) {
                    HCPDeviceEvent::query()->insert($statsChunk);
                }
            }

            $this->syncHCPAccessLog->update([
                'status' => 3,
                'events_count' => $eventsCount,
            ]);
        } catch (Throwable $e) {
            $logId = (string)Str::uuid();
            Cache::forget('sync_events_hcp_lock');
            Helper::setLog($e, "[$logId] Sync HCP events failed:");
            $this->syncHCPAccessLog->update(['error' => $logId, 'status' => 2]);
        } finally {
            Cache::lock('sync_events_hcp_lock')->release();
        }
    }

    private function buildEventRowsForGroup(
        array      $lists,
        Collection $devicesByIndexCode,
        Collection $accessLevelByDeviceId,
        string     $created
    ): array
    {
        $cardNos = [];
        $pinNos = [];

        foreach ($lists as $list) {
            foreach ($list as $item) {
                if (!empty($item->cardNo)) {
                    $length = strlen($item->cardNo);

                    if ($length === 7) {
                        $cardNos[] = (int)$item->cardNo;
                    } elseif ($length === 14) {
                        $pinNos[] = (int)$item->cardNo;
                    }
                }
            }
        }

        [$workersByCard, $workersByPin] = $this->getWorkers(
            array_values(array_unique($cardNos)),
            array_values(array_unique($pinNos))
        );
        $eventRows = [];
        $activeDeviceIds = [];
        $deviceEventsCount = [];

        foreach ($lists as $list) {
            foreach ($list as $item) {
                $device = $devicesByIndexCode->get($item->doorIndexCode);
                if (!$device) {
                    continue;
                }

                $normalizedCardNo = $item->cardNo;
                $length = strlen($normalizedCardNo);
                $worker = $length === 7
                    ? $workersByCard->get((int)$normalizedCardNo)
                    : $workersByPin->get((int)$normalizedCardNo);

                if (!$worker) {
                    continue;
                }

                $eventRows[] = [
                    'worker_id' => (int)$worker['id'],
                    'hik_central_access_level_id' => $accessLevelByDeviceId->get($device->id),
                    'worker_position_id' => $worker['position_id'] ?? null,
                    'event_date_and_time' => Carbon::parse($item->eventTime)->toDateTimeString(),
                    'auth_type' => 'ACSEventFaceVerifyPass',
                    'device_name' => $device->area_name,
                    'resource_name' => $item->doorName,
                    'last_name' => $worker['last_name'],
                    'first_name' => $worker['first_name'],
                    'middle_name' => $worker['middle_name'],
                    'direction' => $device->status ?? false,
                    'temperature' => $item->temperatureStatus,
                    'mask_status' => $item->wearMaskStatus,
                    'created_at' => $created,
                    'updated_at' => $created,
                ];

                $activeDeviceIds[(string)$item->doorIndexCode] = (string)$item->doorIndexCode;
                $deviceEventsCount[$device->id] = ($deviceEventsCount[$device->id] ?? 0) + 1;
            }
        }

        return [$eventRows, $activeDeviceIds, $deviceEventsCount];
    }

    private function getWorkers(array $cardNos, array $pinNos): array
    {
        if (!$cardNos && !$pinNos) {
            return [collect(), collect()];
        }

        $workersByCard = [];
        $workersByPin = [];

        foreach (array_chunk($cardNos, self::WORKER_LOOKUP_CHUNK_SIZE) as $cardNosChunk) {
            $this->appendWorkersByColumn('card', $cardNosChunk, $workersByCard);
        }

        foreach (array_chunk($pinNos, self::WORKER_LOOKUP_CHUNK_SIZE) as $pinNosChunk) {
            $this->appendWorkersByColumn('pin', $pinNosChunk, $workersByPin);
        }

        return [collect($workersByCard), collect($workersByPin)];
    }

    private function appendWorkersByColumn(string $column, array $values, array &$target): void
    {
        if (!$values) {
            return;
        }

        foreach ($this->baseWorkerLookupQuery()->whereIn('workers.' . $column, $values)->get() as $worker) {
            $lookupValue = $worker->{$column};

            if (!filled($lookupValue)) {
                continue;
            }

            $target[$lookupValue] = [
                'id' => $worker->id,
                'position_id' => $worker->position_id,
                'last_name' => $worker->last_name,
                'first_name' => $worker->first_name,
                'middle_name' => $worker->middle_name,
            ];
        }
    }

    private function baseWorkerLookupQuery(): Builder|_IH_Worker_QB
    {
        $latestActivePositions = DB::table('worker_positions')
            ->selectRaw('worker_id, MAX(id) as position_id')
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->groupBy('worker_id');

        return Worker::query()
            ->select(
                'workers.id',
                'workers.card',
                'workers.pin',
                'workers.last_name',
                'workers.first_name',
                'workers.middle_name',
                'latest_active_positions.position_id'
            )
            ->leftJoinSub($latestActivePositions, 'latest_active_positions', function ($join) {
                $join->on('latest_active_positions.worker_id', '=', 'workers.id');
            });
    }

    private function flushEventBuffer(array &$eventBuffer): int
    {
        if (!$eventBuffer) {
            return 0;
        }

        $inserted = DB::transaction(function () use (&$eventBuffer) {
            return TerminalEvent::query()->insertOrIgnore($eventBuffer);
        });

        $eventBuffer = [];

        return (int)$inserted;
    }
}
