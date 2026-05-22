<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Structure\Models\Organization;

class Pensioner extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function scopeSearch($query): Builder
    {
        if ($query) {
            $terms = explode(' ', trim(request('search')));
            foreach ($terms as $term) {
                $query->where(function ($query) use ($term) {
                    $query->whereLike('last_name', "%$term%")
                        ->orWhereLike('first_name', "%$term%")
                        ->orWhereLike('middle_name', "%$term%")
                        ->orWhereLike('pin', "%$term%");
                });
            }
        }
        return $query;
    }

}
