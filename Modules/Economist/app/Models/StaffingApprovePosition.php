<?php

namespace Modules\Economist\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
// use Modules\Economist\Database\Factories\StaffingApprovePositionFactory;

class StaffingApprovePosition extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [];

    // protected static function newFactory(): StaffingApprovePositionFactory
    // {
    //     // return StaffingApprovePositionFactory::new();
    // }
}
