<?php

namespace Modules\Economist\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganizationEconomistUpload extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];
}
