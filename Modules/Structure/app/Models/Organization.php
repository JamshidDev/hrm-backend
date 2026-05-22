<?php

namespace Modules\Structure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;
use Kalnoy\Nestedset\NodeTrait;
use Modules\Economist\Models\EconomistUpload;
use Modules\Economist\Models\OrganizationEconomistUpload;
use Modules\Economist\Models\Statement;
use Modules\Economist\Models\StatementAggregate;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\OrganizationLeader;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Models\HCPDevice;
use Modules\Turnstile\Models\HikCentralAccessLevel;
use Modules\Turnstile\Models\Terminal;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Organization extends Model
{
    use SoftDeletes, NodeTrait, LogsActivity;

    protected $guarded = [];

    public static function getAllChildrenIds($orgId): array
    {
        $org = self::find($orgId);
        if (!$org) {
            return [];
        }
        $childIds = $org->descendants()->pluck('id')->toArray();
        $childIds[] = $orgId;
        return $childIds;
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->where(function ($q) use ($search) {
                $q->whereLike('name', "%$search%")
                    ->orWhereLike('full_name', "%$search%")
                    ->orWhereLike('name_ru', "%$search%")
                    ->orWhereLike('code', "%$search%");
            });
        });
    }

    public function reportForPeriod()
    {
        return $this->hasOneThrough(
            Report::class,
            ReportDetail::class,
            'organization_id',
            'id',
            'id',
            'report_id'
        );
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(__CLASS__, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(__CLASS__, 'parent_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(OrganizationService::class);
    }

    public function full_address(): string
    {
        return implode(', ', array_filter([
            optional($this->city->region)->name,
            optional($this->city)->name,
            $this->address
        ]));
    }

    public function terminals(): BelongsToMany
    {
        return $this->belongsToMany(Terminal::class, 'organization_terminals', 'organization_id', 'terminal_id');
    }

    public function access_levels(): BelongsToMany
    {
        return $this->belongsToMany(HikCentralAccessLevel::class,
            'organization_access_levels',
            'organization_id',
            'hik_central_access_level_id');
    }

    public function polyclinics(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'organization_polyclinics', 'organization_id', 'polyclinic_id');
    }

    public function signatureService(): HasOne
    {
        return $this->hasOne(OrganizationService::class)->where('key', 'e-signature');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'model_has_roles', 'organization_id', 'model_id')
            ->wherePivot('model_type', User::class)
            ->withPivot('role_id');
    }

    public function time_sheet_workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class, 'time_sheet_worker_departments', 'work_place_id', 'worker_id');
    }

    public function department_positions(): HasMany
    {
        return $this->hasMany(DepartmentPosition::class);
    }

    public function worker_positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class)
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }


    public function devices(): HasMany
    {
        return $this->hasMany(HCPDevice::class)->whereNot('serial_number', '');
    }

    public function leaders(): HasMany
    {
        return $this->hasMany(OrganizationLeader::class, 'organization_id');
    }

    public function statements(): HasMany
    {
        return $this->hasMany(Statement::class, 'organization_id');
    }

    public function statement_aggregates(): HasMany
    {
        return $this->hasMany(StatementAggregate::class, 'organization_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class, 'organization_id')
            ->whereNot('status', PositionStatusEnum::FINISHED->value);
    }

    public function scopeAdminOrganizations(Builder $query, Collection $matchingNodes): Builder
    {
        return $query->where(function ($q) use ($matchingNodes) {
            $matchingNodes->each(function ($node) use ($q) {
                $q->orWhere(function ($subQ) use ($node) {
                    $subQ->whereBetween('_lft', [$node->_lft, $node->_rgt])
                        ->orWhere(function ($qq) use ($node) {
                            $qq->where('_lft', '<', $node->_lft)
                                ->where('_rgt', '>', $node->_rgt);
                        });
                });
            });
        });
    }

    public function scopeLeaderOrganizations(Builder $query, User $user): Builder
    {
        $matching = self::query()->descendantsAndSelf($user->organization_id);

        $left = $user->organization->_lft;

        return $query->where(function ($q) use ($matching, $left) {
            $matching->each(function ($node) use ($q, $left) {
                $q->orWhereBetween('_lft', [max($node->_lft - 1, $left), $node->_rgt]);
            });
        });
    }

    public function economistUploads(): HasMany
    {
        return $this->hasMany(EconomistUpload::class)
            ->when(request('year'), fn($q) => $q->where('year', request('year')))
            ->when(request('month'), fn($q) => $q->where('month', request('month')));
    }

    public function uploadStatus(): HasOne
    {
        return $this->hasOne(OrganizationEconomistUpload::class, 'organization_id')
            ->where('year', request('year'))
            ->where('month', request('month'));
    }

    public function stations(): MorphMany
    {
        return $this->morphMany(StationCode::class, 'model');
    }

    public function reportDetail(): HasOne
    {
        return $this->hasOne(ReportDetail::class, 'organization_id');
    }

    public function scopeGetTree($query): Collection
    {
        $organizations = $query->get();
        $parentIds = $organizations
            ->pluck('parent_id')
            ->filter()
            ->unique();


        $hasAllParents = $parentIds->diff($organizations->pluck('id'))->isEmpty();
        return $hasAllParents ? $organizations->toTree() : $organizations;
    }
}
