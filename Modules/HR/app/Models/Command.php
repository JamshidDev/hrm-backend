<?php

namespace Modules\HR\Models;

use App\Helpers\QueryHelper;
use App\Models\User;
use Dyrynda\Database\Support\CascadeSoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Confirmation\Models\CommandConfirmation;
use Modules\Confirmation\Models\DocumentChat;
use Modules\Confirmation\Models\DocumentFile;
use Modules\Confirmation\Models\DocumentHistory;
use Modules\Structure\Models\CommandType;
use Modules\Structure\Models\Organization;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Command extends Model
{
    use SoftDeletes, LogsActivity, CascadeSoftDeletes;

    protected $guarded = ['id'];

    protected array $cascadeDeletes = ['confirmations'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(static function ($model) {
            $uuid = (string)Str::uuid();
            $model->uuid = $uuid;
            $model->file = 'commands/' . $uuid . '.docx';
            $model->confirmation_file = 'documents/commands/' . $uuid . '.pdf';
        });
    }

    public function getActivityLogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('Command')
            ->logOnly([
                'organization_id',
                'type',
                'user_id',
                'command_date',
                'command_number',
                'confirmation',
                'generate',
                'deleted_at',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public static function getModelKeyName(): string
    {
        return 'commands';
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function director(): BelongsTo
    {
        return $this->belongsTo(ConfirmationWorker::class);
    }

    public function vacation(): HasOne
    {
        return $this->hasOne(Vacation::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function histories(): MorphMany
    {
        return $this->morphMany(DocumentHistory::class, 'model');
    }

    public function chats(): MorphMany
    {
        $userId = auth()->id();
        return $this->morphMany(DocumentChat::class, 'model')
            ->where(function ($query) use ($userId) {
                $query->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            });
    }

    public function files(): MorphMany
    {
        return $this->morphMany(DocumentFile::class, 'model');
    }

    public function command_type(): BelongsTo
    {
        return $this->belongsTo(CommandType::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeFilter($query, $user, array $filters = [])
    {
        return QueryHelper::filterByOrganizations($query, $user, $filters);
    }

    public function scopeSearch($query): Builder
    {
        return $query->when(request('search'), function ($q, $search) {
            $q->leftJoin('command_confirmations as cc', 'cc.command_id', '=', 'commands.id')
                ->leftJoin('workers as w', 'w.id', '=', 'cc.worker_id')
                ->where(function ($q) use ($search) {
                    $q->whereLike('commands.command_number', "%{$search}%")
                        ->orWhere(function ($q) use ($search) {
                            $terms = explode(' ', trim($search));
                            foreach ($terms as $term) {
                                $q->where(function ($query) use ($term) {
                                    $query->whereLike('w.last_name', "%$term%")
                                        ->orWhereLike('w.first_name', "%$term%")
                                        ->orWhereLike('w.middle_name', "%$term%");
                                });
                            }
                        });
                })
                ->where('cc.type', 'w')
                ->select('commands.*')
                ->distinct();
        });
    }

    public function contract_model(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'contract_model_type', 'contract_model_id');
    }

    public function confirmations(): HasMany
    {
        return $this->hasMany(CommandConfirmation::class, 'command_id');
    }
}
