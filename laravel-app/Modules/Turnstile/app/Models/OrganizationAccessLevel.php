<?php

namespace Modules\Turnstile\Models;

use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;

class OrganizationAccessLevel extends Model
{
    protected $guarded = ['id'];

    public $timestamps = false;

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

}
