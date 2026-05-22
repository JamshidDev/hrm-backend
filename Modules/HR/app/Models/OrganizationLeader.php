<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class OrganizationLeader extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'worker_position_id',
        'phones'
    ];

    protected $casts = [
        'phones' => 'array'
    ];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

}
