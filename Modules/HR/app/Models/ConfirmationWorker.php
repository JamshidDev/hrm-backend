<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;


class ConfirmationWorker extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];


    protected $table = 'confirmation_workers';

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function scopeFilter($query, array $filters = [])
    {
        $user = auth()->user();
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeSearch($query)
    {
        return $query->when(request('search'), function ($query, $search) {
            $query->whereHas('worker', function ($query) {
                $query->Search();
            })->orWhereLike('position', '%' . $search . '%');
        });
    }
}
