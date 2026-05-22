<?php

namespace App\Models;

use App\Enums\ExportTaskEnum;
use App\Helpers\Helper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Redis;

class UserExportTask extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function boot(): void
    {
        parent::boot();

        static::updated(static function ($model) {
            if (in_array($model->status, [2, 3], true)) {
                $data = [
                    'alert' => 'info',
                    'type' => 'task.completed',
                    'taskId' => $model->id,
                    'duration' => 3000,
                    'file' => Helper::fileUrl($model->file),
                    'title' => ExportTaskEnum::get($model->type),
                    'message' => trans('messages.export.export_completed'),
                    'action' => null
                ];
                $msgData = json_encode(['userId' => $model->user_id, 'data' => $data], JSON_THROW_ON_ERROR);
                Redis::publish('notifications', $msgData);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeFilter($query, $user, array $filters = []): Builder
    {
        return $query->whereHas('user', function ($query) use ($user, $filters) {
            $query->filter($user, $filters);
        })->orWhere('user_id', $user->id);
    }
}
