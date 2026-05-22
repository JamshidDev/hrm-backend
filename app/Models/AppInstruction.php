<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AppInstruction extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function photos(): HasMany
    {
        return $this->hasMany(AppInstructionPhoto::class);
    }
}
