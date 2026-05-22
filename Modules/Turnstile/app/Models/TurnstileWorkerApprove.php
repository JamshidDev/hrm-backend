<?php

namespace Modules\Turnstile\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;

class TurnstileWorkerApprove extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function receiver_organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'receiver_organization_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function receiver_user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_user_id');
    }

    public function worker_positions(): BelongsToMany
    {
        return $this->belongsToMany(WorkerPosition::class, 'turnstile_worker_approve_worker_positions',
            'turnstile_worker_approve_id', 'worker_position_id');
    }

    public function access_levels(): BelongsToMany
    {
        return $this->belongsToMany(HikCentralAccessLevel::class, 'turnstile_worker_access_levels',
            'turnstile_worker_approve_id', 'hik_central_access_level_id');
    }

    public function workers(): HasMany
    {
        return $this->hasMany(TurnstileWorkerApproveWorkerPosition::class, 'turnstile_worker_approve_id');
    }

    public function access_level(): HasMany
    {
        return $this->hasMany(TurnstileWorkerAccessLevel::class, 'turnstile_worker_approve_id');
    }
}
