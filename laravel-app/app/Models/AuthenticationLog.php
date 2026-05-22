<?php

namespace App\Models;

use App\Helpers\Helper;
use App\Helpers\QueryHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuthenticationLog extends Model
{
    public $timestamps = false;

    protected $table = 'authentication_log';

    protected $guarded = ['id'];

    protected $casts = [
        'cleared_by_user' => 'boolean',
        'location' => 'array',
        'login_successful' => 'boolean',
    ];

    protected array $dates = [
        'login_at',
        'logout_at',
    ];

    public function scopeFilterByUserOrganization($query)
    {
        $user = auth()->user();

        if ($user->hasRole('organization')) {
            $users = [$user->id];
        } else {
            $users = QueryHelper::userIds($user);
        }

        return $query->whereIn('authenticatable_id', $users);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authenticatable_id');
    }

    public function __construct(array $attributes = [])
    {
        if (!isset($this->connection)) {
            $this->setConnection(config('authentication-log.db_connection'));
        }

        parent::__construct($attributes);
    }

    public function scopeSearch($query)
    {
        return $query
            ->whereHas('user', function ($query) {
                return $query->Search();
            })
            ->when(request('login_at'), function ($query, $login_at) {
                $query->whereDate('login_at', $login_at);
            })
            ->when(request('ip_address'), function ($query, $ip_address) {
                $query->whereLike('ip_address', "%$ip_address%");
            });
    }

    public function getTable()
    {
        return config('authentication-log.table_name', parent::getTable());
    }

    public function authenticatable(): MorphTo
    {
        return $this->morphTo();
    }
}
