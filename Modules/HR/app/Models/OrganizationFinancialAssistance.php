<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class OrganizationFinancialAssistance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'worker_id',
        'worker_position_id',
        'command_id',
        'number',
        'reason',
        'amount_text',
        'type',
        'amount',
        'date',
        'created_at',
        'updated_at',
        'deleted_at'
    ];


    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }
}
