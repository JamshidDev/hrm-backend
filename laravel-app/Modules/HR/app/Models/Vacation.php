<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class Vacation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'worker_id',
        'worker_position_id',
        'organization_id',
        'contract_id',
        'command_id',
        'type',
        'main_day',
        'second_day',
        'all_day',
        'rest_day',
        'from',
        'to',
        'period_to',
        'period_from',
        'work_day',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

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

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function command(): BelongsTo
    {
        return $this->belongsTo(Command::class);
    }
}
