<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class WorkerBusinessTrip extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'contract_id',
        'worker_position_id',
        'worker_id',
        'command_id',
        'work_place_id',
        'department_id',
        'to_organization',
        'type',
        'from',
        'to',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    public function scopeFilter($query, array $filters = [])
    {
        $user = auth()->user();
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($q) {
            $q->whereHas('worker', function ($q) {
                $q->searchByFullName();
            });
        });
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function command(): BelongsTo
    {
        return $this->belongsTo(Command::class);
    }

    public function worker_position(): BelongsTo
    {
        return $this->belongsTo(WorkerPosition::class);
    }

}
