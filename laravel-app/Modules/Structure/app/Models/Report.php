<?php

namespace Modules\Structure\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Confirmation\Models\ReportConfirmation;
use Modules\HR\Models\ConfirmationWorker;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected array $cascadeDeletes = ['confirmations'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'report/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/report/' . $uuid . '.pdf';
        });
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class, 'director_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(ReportDetail::class, 'report_id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(ReportConfirmation::class, 'report_id');
    }

    public static function getModelKeyName(): string
    {
        return 'report';
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DocumentFile::class, 'model');
    }

    public function chats(): MorphMany
    {
        $userId = auth()->id();
        return $this->morphMany(DocumentChat::class, 'model')
            ->where(function ($query) use ($userId) {
                $query->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            });
    }
}
