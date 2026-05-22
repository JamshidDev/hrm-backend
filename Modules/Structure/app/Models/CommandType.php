<?php

namespace Modules\Structure\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;


class CommandType extends Model
{
    use SoftDeletes, LogsActivity;


    protected $guarded = ['id'];

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logUnguarded()
            ->logOnlyDirty();
    }

    public function scopeFilter($query)
    {
        $user = auth()->user();
        return $query->where('organization_id', $user->organization_id);
    }

    public function scopeSearch($query)
    {
        return $query
            ->when(request('search'), function ($q, $search) {
                $q->whereLike('name', "%$search%");
            });
    }

    public function scopeFilterOrganization($query, array $filters = [])
    {
        $user = auth()->user();
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
