<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LivenessSession extends Model
{
    protected $fillable = [
        'session_id',
        'user_id',
        'status',
        'success',
        'type',
        'device_uuid',
        'refImage',
        'liveImage',
        'face_status',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function photos(): HasMany
    {
        return $this->hasMany(LivenessSessionPhoto::class, 'liveness_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
