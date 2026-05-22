<?php

namespace Modules\ProjectService\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
// use Modules\ProjectService\Database\Factories\TranslateFactory;

class Translate extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [];

    // protected static function newFactory(): TranslateFactory
    // {
    //     // return TranslateFactory::new();
    // }
}
