<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\City;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\Region;

class VacancyPosition extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }
    
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function department_position(): BelongsTo
    {
        return $this->belongsTo(DepartmentPosition::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(VacancyApplication::class, 'vacancy_position_id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(VacancyApplication::class, 'vacancy_position_id');
    }
}
