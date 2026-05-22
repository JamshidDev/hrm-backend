<?php

namespace App\Services\Telegram;

use App\Helpers\Helper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\Telegram\ProfileInfoResource;
use App\Http\Resources\Telegram\TelegramUserInfoResource;
use App\Http\Resources\User\UserInfoResource;
use App\Http\Resources\User\UserTelegramAccountsResource;
use App\Models\TelegramAction;
use App\Models\User;
use App\Models\UserTelegram;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Modules\Economist\Models\Statement;
use Modules\Economist\Services\StatementService;
use Modules\HR\Enums\MedStatusEnum;
use Modules\HR\Models\Med;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\TerminalEvent;

readonly class TelegramService
{
    public function __construct(private StatementService $statementService)
    {
    }

    public function paginateAccounts(array $filters)
    {
        $perPage = $filters['per_page'] ?? 10;
        $search = $filters['search'] ?? null;

        $accounts = UserTelegram::query()
            ->with(['user.worker:id,last_name,first_name,middle_name,photo'])
            ->when($search, function ($query, $search) {
                $query->whereHas('user', function ($query) {
                    $query->whereHas('worker', function ($query) {
                        $query->searchByFullName();
                    });
                })
                ->orWhereLike('phone', '%' . $search . '%')
                ->orWhereLike('chat_id', '%' . $search . '%');
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return PaginateResource::make($accounts, UserTelegramAccountsResource::class);
    }

    public function register(string $uuid, int $chatId): void
    {
        $user = User::query()->whereUuid($uuid)->first();

        if (!$user || !$user->worker_id) {
            $this->throwUserNotFound();
        }

        UserTelegram::updateOrCreate(
            ['user_id' => $user->id],
            ['chat_id' => $chatId, 'phone' => $user->phone],
        );
    }

    public function check(string $phone, string $pin): array
    {
        $user = User::query()->where('phone', $phone)->first();

        if (!$user || !$user->worker_id) {
            $this->throwUserNotFound();
        }

        $user->load(['telegram', 'worker']);

        if ($user->worker->pin !== $pin) {
            $this->throwUserNotFound();
        }

        return [
            'user' => new UserInfoResource($user),
            'account' => $user->telegram ? new UserTelegramAccountsResource($user->telegram) : null,
        ];
    }

    public function deactivate(string $chatId): void
    {
        UserTelegram::query()
            ->where('chat_id', $chatId)
            ->update(['active' => false]);
    }

    public function detachMany(array $chatIds): void
    {
        UserTelegram::query()
            ->whereIn('chat_id', $chatIds)
            ->update(['active' => false]);
    }

    public function userInfoByChatId(string $chatId): ?TelegramUserInfoResource
    {
        $account = UserTelegram::query()
            ->with(['user.worker'])
            ->where('chat_id', $chatId)
            ->first();

        return $account ? new TelegramUserInfoResource($account) : null;
    }

    public function listServices(User $user): array
    {
        $services = [];

        if ($user->hcp_devices_count) {
            $services[] = $this->serviceItem('hcp_devices');
        }

        foreach (
            [
                'salary_months',
                'terminal-photo',
                'user-verify-photos',
                'user-process-photos',
                'user-terminal-logs',
                'user-med-histories',
                'user-petitions',
            ] as $key
        ) {
            $services[] = $this->serviceItem($key);
        }

        return $services;
    }

    public function petitionTypes(): array
    {
        return [
            ['id' => 1, 'name' => 'Shikoyat'],
            ['id' => 2, 'name' => 'Tashakkurnoma'],
        ];
    }

    public function profile(User $user): ProfileInfoResource
    {
        $user->load([
            'worker',
            'worker.positions',
            'worker.positions.department',
            'worker.positions.position',
            'worker.positions.organization',
            'worker.phones',
            'worker.photos',
        ]);

        return new ProfileInfoResource($user->worker);
    }

    public function medHistories(User $user, ?array $request = null): Collection
    {
        $meds = Med::query()
            ->where('worker_id', $user->worker_id)
            ->orderByDesc('to')
            ->get()
            ->map(fn($med) => [
                'from' => $med->from,
                'to' => $med->to,
                'status' => MedStatusEnum::get($med->status),
            ]);

        if ($request !== null) {
            $this->logAction($user->id, $request);
        }

        return $meds;
    }

    public function terminalLogs(User $user, ?string $date, array $request): Collection
    {
        $day = Carbon::parse($date ?? now()->format('Y-m-d'));
        $start = $day->startOfDay()->toDateTimeString();
        $end = $day->copy()->addDay()->startOfDay()->toDateTimeString();

        $events = TerminalEvent::query()
            ->where('worker_id', $user->worker_id)
            ->where('event_date_and_time', '>=', $start)
            ->where('event_date_and_time', '<', $end)
            ->orderByDesc('event_date_and_time')
            ->get()
            ->map(function ($event) {
                $d = Carbon::parse($event->event_date_and_time);
                return [
                    'event_date' => $d->format('Y-m-d'),
                    'event_time' => $d->format('H:i:s'),
                    'auth_type' => $event->auth_type,
                    'device' => $event->device_name,
                    'direction' => $event->direction,
                    'mask_status' => $event->mask_status,
                    'temperature' => $event->temperature,
                ];
            });

        $this->logAction($user->id, $request);

        return $events;
    }

    public function salaryMonths(User $user): array
    {
        $months = Statement::query()
            ->wherePin($user->worker?->pin)
            ->select(['year', 'month'])
            ->groupBy('year', 'month')
            ->get();

        return [
            'check_salary_key' => md5('salary'),
            'months' => $months,
        ];
    }

    public function salary(User $user, ?string $year, ?string $month, array $request): array
    {
        $statements = Statement::query()
            ->wherePin($user->worker?->pin)
            ->where('year', $year)
            ->where('month', $month)
            ->get();

        $this->logAction($user->id, $request);

        $amounts = [];
        $this->statementService->getStatements($statements, $amounts);

        return ['salary' => $amounts];
    }

    public function hcpDevices(User $user, array $request): array
    {
        $user->load(['hcp_devices']);

        $devices = HCPDevice::query()->get();

        $data = $user->hcp_devices
            ->map(function ($device) use ($devices) {
                $d = $devices->firstWhere('device_id', (string)$device->hik_central_device_id);
                if (!$d) {
                    return null;
                }
                return [
                    'id' => $d->device_id,
                    'name' => $d->name,
                    'status' => $d->status ? 1 : 2,
                ];
            })
            ->whereNotNull()
            ->sortByDesc('status')
            ->values()
            ->toArray();

        $this->logAction($user->id, $request);

        return $data;
    }

    public function logAction(int $userId, array $request): void
    {
        TelegramAction::query()->create([
            'user_id' => $userId,
            'request' => $request,
        ]);
    }

    private function serviceItem(string $key): array
    {
        return [
            'id' => md5($key),
            'name' => trans('messages.telegram.services.' . str_replace('-', '_', $key)),
        ];
    }

    private function throwUserNotFound(): never
    {
        throw new HttpResponseException(
            Helper::response(trans('messages.user_not_found'), [], 400)
        );
    }
}
