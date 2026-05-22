<?php

namespace Modules\Confirmation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\HR\Models\Contract;
use Modules\HR\Models\Worker;


class ContractConfirmation extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return $query->where('worker_id', $user->worker_id);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
