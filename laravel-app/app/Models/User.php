<?php

namespace App\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\LMS\Models\LearningCenterUser;
use Modules\Structure\Models\Organization;
use Modules\Turnstile\Models\UserTurnstileDevice;
use Rappasoft\LaravelAuthenticationLog\Traits\AuthenticationLoggable;
use Spatie\Activitylog\Traits\CausesActivity;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use SoftDeletes, HasApiTokens, HasRoles, AuthenticationLoggable, Notifiable, CausesActivity;

    protected $guarded = ['id'];

    protected string $guard_name = 'sanctum';

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($user) {
            $user->uuid = (string)Str::uuid();
        });
    }

    public function full_name(): string
    {
        return $this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name;
    }

    public function scopeSearch($query): Builder
    {
        return $query
            ->when(request('search'), function ($query, $search) {
                $query
                    ->orWhereHas('worker', function ($q) {
                        $q->searchByFullName();
                    })
                    ->orWhereLike('phone', "%$search%")
                    ->orWhereHas('roles', function ($q) use ($search) {
                        $q->whereLike('name', "%$search%");
                    });
            });
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'model_has_roles', 'model_id', 'role_id')
            ->wherePivot('model_type', __CLASS__)
            ->withPivot('organization_id');
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'model_has_roles', 'model_id', 'organization_id')
            ->wherePivot('model_type', __CLASS__)
            ->withPivot('role_id');
    }

    public function allowedOrganizations(): Builder|array|null
    {
        return QueryHelper::childIds($this);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

    public function learning_center(): HasOne
    {
        return $this->hasOne(LearningCenterUser::class)
            ->whereHas('learning_center')
            ->where('status', true);
    }

    public function telegram(): HasOne
    {
        return $this->hasOne(UserTelegram::class)->orderByDesc('created_at');
    }

    public function hcp_devices(): HasMany
    {
        return $this->hasMany(UserTurnstileDevice::class, 'user_id');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function organizationRoles($orgId)
    {
        return $this
            ->roles()
            ->wherePivot('organization_id', $orgId)
            ->get();
    }

    public function hasOrganizationRoles($orgId, array $roles): bool
    {
        return $this
            ->roles()
            ->wherePivot('organization_id', $orgId)
            ->whereIn('name', $roles)
            ->exists();
    }

    public function mobileDevice(): HasOne
    {
        return $this
            ->hasOne(UserMobileKey::class, 'user_id')
            ->where('device_uuid', request()->header('X-Device-UUID'));
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }
}
