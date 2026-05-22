<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Position;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DepartmentPosition extends Model
{
    use SoftDeletes, LogsActivity;

    protected $guarded = ['id'];

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->whereHas('department', function ($builder) use ($search) {
                $builder->whereLike('name', "%$search%");
            })->orWhereHas('position', function ($builder) use ($search) {
                $builder->whereLike('name', "%$search%");
            });
        });
    }

    public function scopeJoinSearch($query)
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->where(function ($q2) use ($search) {
                $q2->where('d.name', 'ilike', "%$search%")
                    ->orWhere('p.name', 'ilike', "%$search%");
            });
        });
    }

    public function scopeFilterByOrganizationsWithJoin($query, $user)
    {
        $organizationIds = QueryHelper::childIds($user);

        return $query
            ->when($organizationIds, function ($query, $organizationIds) {
                $query->whereIn('dp.organization_id', $organizationIds);
            })
            ->when(request('organizations'), function ($query, $organizations) {
                $ids = explode(',', $organizations);
                $query->whereIn('dp.organization_id', $ids);
            })
            ->when(request('organization_id'), function ($query, $organizationId) {
                $query->where('dp.organization_id', $organizationId);
            })
            ->when(request('departments'), function ($query, $departments) {
                $query->whereIn('dp.department_id', explode(',', $departments));
            })
            ->when(request('department_id'), function ($query, $departmentId) {
                $query->where('dp.department_id', $departmentId);
            });
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        $query->when(request('departments'), function ($q, $departments) {
            $q->whereIn('department_id', explode(',', $departments));
        })->when(request('department_id'), function ($q, $department_id) {
            $q->where('department_id', $department_id);
        });

        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeFilterByDepartments($query)
    {
        return $query
            ->when(request('departments'), function ($q, $departments) {
                $q->whereIn('department_id', explode(',', $departments));
            });
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()->logUnguarded()->logOnlyDirty();
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class)->withTrashed();
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class)->withTrashed();
    }

    public function worker_positions(): HasMany
    {
        return $this->hasMany(WorkerPosition::class)
            ->where('status', PositionStatusEnum::ACTIVE->value);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class)->withTrashed();
    }

    protected function rate(): Attribute
    {
        return Attribute::make(
            get: static fn($value) => $value / 100,
            set: static fn($value) => (int)round(((float)str_replace(',', '.', $value)) * 100),
        );
    }
}
