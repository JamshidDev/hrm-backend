<?php

namespace Modules\HR\Models;

use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Speciality;
use Modules\Structure\Models\University;

class WorkerUniversity extends Model
{
    use SoftDeletes;


    protected $guarded = ['id'];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function speciality(): BelongsTo
    {
        return $this->belongsTo(Speciality::class);
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function scopeFilter($query)
    {
        $worker_id = Helper::idUuid(request('uuid'));

        return $query
            ->when($worker_id, function ($q, $worker_id) {
                $q->where('worker_id', $worker_id);
            });
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('from_date'), function ($q, $from_date) {
                $q->whereDate('from_date', $from_date);
            })
            ->when(request('to_date'), function ($q, $to_date) {
                $q->whereDate('to_date', "%$to_date%");
            });
    }

}
