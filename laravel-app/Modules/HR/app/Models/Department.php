<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Kalnoy\Nestedset\NodeTrait;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\StationCode;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Department extends Model
{
    use SoftDeletes, NodeTrait, LogsActivity;

    protected $guarded = ['id'];


    public function scopeFilterByOrganizations($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeFilterByOrganizationsWithJoin($query, $user)
    {
        $organizationIds = QueryHelper::childIds($user);

        return $query
            ->when($organizationIds, function ($query, $organizationIds) {
                $query->whereIn('departments.organization_id', $organizationIds);
            })
            ->when(request('organizations'), function ($query, $organizations) {
                $ids = explode(',', $organizations);
                $query->whereIn('departments.organization_id', $ids);
            })
            ->when(request('organization_id'), function ($query, $organizationId) {
                $query->where('departments.organization_id', $organizationId);
            });
    }

    public function scopeFilterByOrganization($query, $user)
    {
        return QueryHelper::filterDepartmentByOrganization($query, $user);
    }

    public function scopeFilterByOrganizationStructure($query, $user)
    {
        return QueryHelper::filterDepartmentByOrganization($query, $user);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(__CLASS__);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function children(): HasMany
    {
        return $this->hasMany(__CLASS__, 'parent_id');
    }

    public function locations(): HasMany
    {
        return $this->hasMany(DepartmentLocation::class);
    }


    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereLike('name', "%$search%");
        });
    }

    public function stations(): MorphMany
    {
        return $this->morphMany(StationCode::class, 'model');
    }


    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('Department')
            ->logOnly([
                'organization_id',
                'sort',
                'name',
                '_lft',
                '_rgt',
                'parent_id',
                'level',
                'deleted_at'
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function time_sheet_workers(): BelongsToMany
    {
        return $this->belongsToMany(Worker::class, 'time_sheet_worker_departments', 'department_id', 'worker_id');
    }

    public function department_positions(): HasMany
    {
        return $this->hasMany(DepartmentPosition::class);
    }

    public function worker_positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class)->where('status', PositionStatusEnum::ACTIVE->value);
    }
}
