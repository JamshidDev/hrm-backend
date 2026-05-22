<?php

namespace Modules\Turnstile\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhoto;

class HcpAddedWorkerLog extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'worker_id');
    }

    public function worker_photo(): BelongsTo
    {
        return $this->belongsTo(WorkerPhoto::class, 'worker_photo_id');
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }
}
