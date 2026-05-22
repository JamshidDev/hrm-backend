<?php

namespace Modules\Structure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class OrganizationService extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }


}
