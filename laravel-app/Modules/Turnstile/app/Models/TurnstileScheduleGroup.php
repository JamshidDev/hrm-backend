<?php

namespace Modules\Turnstile\Models;

use App\Helpers\QueryHelper;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TurnstileScheduleGroup extends Model
{
    use SoftDeletes, CascadeSoftDeletes;

    protected $guarded = ['id'];

    protected $cascadeDeletes = ['workers'];
    public function workers(): HasMany
    {
        return $this->hasMany(TurnstileWorkerSchedule::class, 'turnstile_schedule_group_id');
    }

    public function schedule_type(): BelongsTo
    {
        return $this->belongsTo(TurnstileScheduleType::class, 'turnstile_schedule_type_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }
}
