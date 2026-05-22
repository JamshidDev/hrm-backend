<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class OrganizationPolyclinic extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function polyclinic(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'polyclinic_id');

    }
}
