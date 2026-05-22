<?php

namespace App\Jobs\HCP;

use App\Helpers\Helper;
use App\Http\Middleware\PreventDuplicateImport;
use App\Models\User;
use App\Services\HikCentralService;
use Carbon\Carbon;
use GuzzleHttp\Promise\Utils;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Worker;
use Modules\Turnstile\Models\HikCentralAccessLevelDevice;
use Modules\Turnstile\Models\HikCentralDevice;
use Modules\Turnstile\Models\SyncHCPAccessLog;
use Modules\Turnstile\Models\TerminalEvent;
use Throwable;

class SyncEventsHCPOptimizedJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 36000;

    private const int INSERT_BUFFER_SIZE = 2000;
    private const int MAX_PARALLEL_PAGES = 5;
    private const int WORKER_LOOKUP_CHUNK_SIZE = 2000;

    protected User $user;

    protected array $devices;
    protected Carbon $fDate;
    protected Carbon $tDate;
    protected SyncHCPAccessLog $syncHCPAccessLog;

    public function middleware(): array
    {
        return [new PreventDuplicateImport('sync_organization_events_hcp_lock_' . $this->user->id)];
    }

    public function __construct($syncHCPAccessLog, $devices, $user, $fDate, $tDate)
    {
        $this->syncHCPAccessLog = $syncHCPAccessLog;
        $this->devices = $devices;
        $this->user = $user;
        $this->fDate = Carbon::parse($fDate)->startOfDay();
        $this->tDate = Carbon::parse($tDate)->endOfDay();
    }

    public function handle(): void
    {
        $created = now()->toDateTimeString();
        $eventBuffer = [];
        $eventsCount = 0;

        try {
            $devicesByIndexCode = HikCentralDevice::query()
                ->select('id', 'hik_central_device_id', 'area_name', 'status')
                ->get()
                ->keyBy(static fn($device) => (string)$device->hik_central_device_id);

            $accessLevelByDeviceId = HikCentralAccessLevelDevice::query()
                ->pluck('hik_central_access_level_id', 'hik_central_device_id');

            $hikCentralService = new HikCentralService();

            $perPage = 500;
            $firstPage = $hikCentralService->doorEvents(
                $this->fDate->toIso8601String(),
                $this->tDate->toIso8601String(),
                $this->devices,
                $perPage
            );

            $total = 0;
            if ($firstPage['status']) {
                $firstPageData = $firstPage['data']->data ?? null;
                $total = (int)($firstPageData->total ?? 0);
                $this->appendEventsFromPages(
                    [$firstPageData->list ?? []],
                    $devicesByIndexCode,
                    $accessLevelByDeviceId,
                    $eventBuffer,
                    $created,
                    $eventsCount
                );
            }

            $lastPage = (int)ceil($total / $perPage);

            for ($page = 2; $page <= $lastPage; $page += self::MAX_PARALLEL_PAGES) {
                $pages = range($page, min($page + self::MAX_PARALLEL_PAGES - 1, $lastPage));
                $promises = [];

                foreach ($pages as $currentPage) {
                    $promises[$currentPage] = $hikCentralService->doorEventsAsync(
                        $this->fDate->toIso8601String(),
                        $this->tDate->toIso8601String(),
                        $this->devices,
                        $perPage,
                        $currentPage
                    );
                }

                $results = Utils::settle($promises)->wait();
                $lists = [];

                foreach ($pages as $currentPage) {
                    $pageResult = $hikCentralService->resolveAsyncDoorEventsResult($results[$currentPage] ?? null);
                    if (!$pageResult['status']) {
                        continue;
                    }

                    $lists[] = $pageResult['data']->list ?? [];
                }

                $this->appendEventsFromPages(
                    $lists,
                    $devicesByIndexCode,
                    $accessLevelByDeviceId,
                    $eventBuffer,
                    $created,
                    $eventsCount
                );
            }

            $eventsCount += $this->flushEventBuffer($eventBuffer);

            $this->syncHCPAccessLog->update([
                'status' => 3,
                'events_count' => $eventsCount,
            ]);

        } catch (Throwable $e) {
            $logId = (string)Str::uuid();
            Cache::forget('sync_organization_events_hcp_lock_' . $this->user->id);
            Helper::setLog($e, "[$logId] Sync HCP events failed:");
            $this->syncHCPAccessLog->update(['error' => $logId, 'status' => 2]);
            throw $e;
        } finally {
            Cache::lock('sync_organization_events_hcp_lock_' . $this->user->id)->release();
        }
    }

    private function appendEventsFromPages(
        array      $lists,
        Collection $devicesByIndexCode,
        Collection $accessLevelByDeviceId,
        array      &$eventBuffer,
        string     $created,
        int        &$eventsCount
    ): void
    {
        $cardNos = [];

        foreach ($lists as $list) {
            foreach ($list as $item) {
                if (!empty($item->cardNo) && strlen($item->cardNo) === 7) {
                    $cardNos[] = (int)$item->cardNo;
                }
            }
        }

        $workers = $this->getWorkers(array_unique($cardNos));

        foreach ($lists as $list) {
            foreach ($list as $item) {
                $device = $devicesByIndexCode->get((string)$item->doorIndexCode);
                if (!$device) {
                    continue;
                }

                $key = (int)$item->cardNo;
                $worker = $workers->get($key);

                if (!$worker) {
                    continue;
                }

                $eventBuffer[] = [
                    'worker_id' => (int)$worker['id'],
                    'hik_central_access_level_id' => $accessLevelByDeviceId->get($device->id),
                    'worker_position_id' => $worker['position_id'] ?? null,
                    'event_date_and_time' => $item->eventTime,
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

                if (count($eventBuffer) >= self::INSERT_BUFFER_SIZE) {
                    $eventsCount += $this->flushEventBuffer($eventBuffer);
                }
            }
        }
    }

    private function getWorkers($cardNos): Collection
    {
        if (!$cardNos) {
            return collect();
        }

        $workers = collect();

        foreach (array_chunk($cardNos, self::WORKER_LOOKUP_CHUNK_SIZE) as $cardNosChunk) {
            $chunkWorkers = Worker::query()
                ->select(
                    'workers.id',
                    'workers.card',
                    'workers.pin',
                    'workers.last_name',
                    'workers.first_name',
                    'workers.middle_name',
                    'wp.id as position_id'
                )
                ->leftJoin('worker_positions as wp', function ($join) {
                    $join->on('wp.worker_id', '=', 'workers.id')
                        ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                        ->whereRaw('wp.id = (SELECT MAX(id) FROM worker_positions WHERE worker_id = workers.id)');
                })
                ->where(function ($q) use ($cardNosChunk) {
                    $q->whereIn('workers.card', $cardNosChunk)
                        ->orWhereIn('workers.pin', $cardNosChunk);
                })
                ->get();

            $workers = $workers->merge($chunkWorkers);
        }

        return $workers
            ->unique('id')
            ->mapWithKeys(function ($w) {
                $keyCard = $w->card ?? null;
                $keyPin = $w->pin ?? null;

                $data = [
                    'id' => $w->id,
                    'position_id' => $w->position_id,
                    'last_name' => $w->last_name,
                    'first_name' => $w->first_name,
                    'middle_name' => $w->middle_name,
                ];

                $result = [];
                if ($keyCard) $result[$keyCard] = $data;
                if ($keyPin) $result[$keyPin] = $data;

                return $result;
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
