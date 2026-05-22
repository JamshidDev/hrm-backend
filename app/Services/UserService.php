<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Helpers\UserHelper;
use App\Http\Resources\PaginateResource;
use App\Http\Resources\User\UserOrganizationEditResource;
use App\Http\Resources\User\UserResource;
use App\Http\Resources\User\UserRolesWithOrganizationsResource;
use App\Http\Resources\User\UserWorkerPositionResource;
use App\Jobs\User\DocumentCountJob;
use App\Models\AuthenticationLog;
use App\Models\User;
use Exception;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Chat\Transformers\Notifications\NotificationsResource;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Models\ContractConfirmation;
use Modules\Confirmation\Models\WorkerApplicationConfirmation;
use Modules\Confirmation\Transformers\UnifiedConfirmationResource;
use Reefki\DeviceDetector\Device;
use Spatie\Permission\Models\Role;

class UserService
{
    public function clearCacheUser($user): void
    {
        Cache::forget('access_level_ids_' . $user->id);
    }

    public function authenticationLog($user, $status): void
    {
        $data = [
            'authenticatable_type' => User::class,
            'authenticatable_id' => $user->id,
            'user_agent' => request()->userAgent(),
            'ip_address' => request()->ip(),
        ];

        if ($status === 'login') {
            $data['login_at'] = now();
            $data['login_successful'] = true;
            AuthenticationLog::create($data);
        } else {
            $auth = $user->latestAuthentication();
            $auth->update(['logout_at' => now()]);
        }
    }

    public function logout(User $user): void
    {
        $user->tokens()->delete();
    }

    public function notifications(User $user, array $filters): array|int
    {
        $query = $user->notifications()
            ->when(array_key_exists('read_at', $filters), function ($query) {
                $query->whereNull('read_at');
            });

        if (array_key_exists('count', $filters)) {
            return $query->count();
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->whereRaw("COALESCE(data->>'title', '') ILIKE ?", ["%{$search}%"])
                    ->orWhereRaw("COALESCE(data->>'message', '') ILIKE ?", ["%{$search}%"]);
            });
        }

        $notifications = $query
            ->select('data', 'created_at', 'id', 'read_at')
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 10);

        return [
            'data' => PaginateResource::make($notifications, NotificationsResource::class),
        ];
    }

    public function markNotificationsAsRead(User $user, array $data): void
    {
        if (!empty($data['all'])) {
            $user->unreadNotifications()->update(['read_at' => now()]);
            return;
        }

        $user->unreadNotifications()
            ->whereIn('id', $data['ids'] ?? [])
            ->update(['read_at' => now()]);
    }

    public function organizationHrs(int $organizationId): Collection
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->whereHas('roles', function ($query) {
                $query->whereName('HR')->orWhere('name', 'HrLeader');
            })
            ->whereHas('worker', function ($query) {
                $query->whereHas('position');
            })
            ->with([
                'roles',
                'worker:id,last_name,first_name,middle_name',
                'worker.position.department:id,name,level',
                'worker.position.position:id,name',
                'worker.phones',
            ])
            ->get()
            ->map(fn($user) => [
                'id' => $user->id,
                'worker' => new UserWorkerPositionResource($user),
                'phones' => $user->worker?->phones->pluck('phone')->toArray(),
                'roles' => $user->roles->pluck('name')->toArray(),
            ]);
    }

    public function profile(User $user): UserResource
    {
        $user->load(['roles.permissions'])->loadCount('telegram');

        return new UserResource($user);
    }

    public function me(User $user): array
    {
        $user->load(['worker:id,last_name,first_name,middle_name,photo']);

        $authLogs = $user->authentications()
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn($log) => [
                'ip_address' => $log->ip_address,
                'user_agent' => Device::detect($log->user_agent)->getClient(),
                'login_at' => $log->login_at->toDateTimeString(),
                'logout_at' => $log->logout_at?->toDateTimeString(),
            ]);

        $activityLogs = $user->actions()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($log) => [
                'description' => $log->description,
                'subject_type' => class_basename($log->subject_type),
                'event' => $log->event,
                'created_at' => $log->created_at->toDateTimeString(),
            ]);

        $worker = $user->worker;

        return [
            'user' => [
                'id' => $user->id,
                'last_name' => $worker?->last_name,
                'first_name' => $worker?->first_name,
                'middle_name' => $worker?->middle_name,
                'photo' => Helper::fileUrl($worker?->photo),
                'birthday' => $worker?->birthday,
            ],
            'authLogs' => $authLogs,
            'activityLogs' => $activityLogs,
            'documents' => $this->documents($user),
        ];
    }

    public function verifyToken(User $user): array
    {
        $user->load([
            'worker:id,last_name,first_name,middle_name,photo',
            'organization',
            'roles',
        ]);

        $allowedRoles = Role::query()
            ->whereNotIn('name', ['Worker', 'NBT', 'EMM'])
            ->pluck('name')
            ->toArray();

        $allowed = $user->roles->pluck('name')->intersect($allowedRoles)->isNotEmpty();

        DocumentCountJob::dispatch($user);

        return [
            'valid' => true,
            'user' => [
                'id' => $user->id,
                'short_name' => $user->worker?->short_name(),
                'photo' => Helper::fileUrl($user->worker?->photo),
                'organization' => $user->organization?->name ?? '',
                'can_receive_online_events' => $allowed,
            ],
        ];
    }

    public function updateUserPhotos($user, $data)
    {
        return User::query()
            ->with('worker:id,photo')
            ->whereIn('id', $data['user_ids'] ?? [])
            ->get()
            ->map(fn($user) => [
                'id' => $user->id,
                'photo' => Helper::fileUrl($user->worker?->photo),
            ]);
    }

    public function rolesWithOrganizations(User $user)
    {
        $user->load(['roles', 'organizations']);

        $rolesWithOrganizations = UserHelper::getRoles($user);

        return UserRolesWithOrganizationsResource::collection($rolesWithOrganizations);
    }

    public function changeCurrentOrganization(User $user, int $organizationId): void
    {
        $organization = $user->organizations->firstWhere('id', $organizationId);

        if (!$organization) {
            throw new HttpResponseException(
                Helper::response(trans('messages.organization_not_found'), [], 400)
            );
        }

        $user->update(['organization_id' => $organizationId]);

        Cache::delete('user_roles_' . $user->id);
    }

    public function updateProfile(User $user, array $data): UserResource
    {
        if (!empty($data['password'])) {

            if (Hash::check($data['password'], $user->password)) {
                throw new Exception(trans('You cannot reuse current password'));
            }

            $user->update([
                'password' => Hash::make($data['password'], ['rounds' => 12]),
                'password_changed_at' => now(),
            ]);
        }


        return new UserResource($user);
    }

    public function organizationInfo(User $user): UserOrganizationEditResource
    {
        $user->load(['organization', 'organization.city.region']);

        return new UserOrganizationEditResource($user->organization);
    }

    public function updateOrganizationInfo(User $user, array $data): void
    {
        $org = $user->load('organization')->organization;

        $org->update([
            'command_address' => $data['command_address'],
            'city_id' => $data['city_id'],
            'address' => $data['address'],
        ]);
    }

    public function documents($user): array
    {
        $perPage = 10;
        $page = request('page', 1);

        $contracts = ContractConfirmation::query()
            ->selectRaw("
                contract_confirmations.id,
                contract_confirmations.status,
                contract_confirmations.position,
                contract_confirmations.confirmation_type,
                contract_confirmations.main,
                contract_confirmations.contract_id as document_id,
                'contracts' as type,
                contract_confirmations.created_at
            ")
            ->where('contract_confirmations.worker_id', $user->worker_id)
            ->join('contracts', 'contracts.id', '=', 'contract_confirmations.contract_id')
            ->whereNull('contracts.deleted_at')
            ->where('contracts.generate', 3)
            ->where('contracts.confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);

        $commands = CommandConfirmation::query()
            ->selectRaw("
                command_confirmations.id,
                command_confirmations.status,
                command_confirmations.position,
                command_confirmations.confirmation_type,
                command_confirmations.main,
                command_confirmations.command_id as document_id,
                'commands' as type,
                command_confirmations.created_at
            ")
            ->join('commands', 'commands.id', '=', 'command_confirmations.command_id')
            ->where('command_confirmations.worker_id', $user->worker_id)
            ->whereNull('commands.deleted_at')
            ->where('commands.generate', 3)
            ->where('commands.confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);

        $applications = WorkerApplicationConfirmation::query()
            ->selectRaw("
                worker_application_confirmations.id,
                worker_application_confirmations.status,
                worker_application_confirmations.position,
                worker_application_confirmations.confirmation_type,
                worker_application_confirmations.main,
                worker_application_confirmations.worker_application_id as document_id,
                'worker-application' as type,
                worker_application_confirmations.created_at
            ")
            ->join(
                'worker_applications',
                'worker_applications.id',
                '=',
                'worker_application_confirmations.worker_application_id'
            )
            ->where('worker_application_confirmations.worker_id', $user->worker_id)
            ->whereNull('worker_applications.deleted_at')
            ->where('worker_applications.generate', 3)
            ->where('worker_applications.confirmation', '!=', ConfirmationStatusEnum::SUCCESS->value);

        $union = $contracts->unionAll($applications)->unionAll($commands);

        $total = DB::query()->fromSub($union, 'documents')->count();

        $items = DB::query()
            ->fromSub($union, 'documents')
            ->orderByDesc('created_at')
            ->forPage($page, $perPage)
            ->get();

        return [
            'data' => UnifiedConfirmationResource::collection($items),
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => ceil($total / $perPage),
            ],
        ];
    }
}
