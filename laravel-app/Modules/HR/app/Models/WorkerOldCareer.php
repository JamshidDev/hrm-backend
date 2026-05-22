<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkerOldCareer extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function scopeFilter($query)
    {
        return $query->where('worker_id', Helper::idUuid(request('uuid')));
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('post_name'), function ($q, $post_name) {
                $q->whereLike('post_name', "%$post_name%");
            });
    }
}
