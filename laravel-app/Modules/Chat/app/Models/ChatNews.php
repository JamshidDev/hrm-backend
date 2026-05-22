<?php

namespace Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatNews extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    public function translations(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ChatNewsTranslation::class);
    }

    public function media(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ChatNewsMedia::class);
    }

    public function views(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ChatNewsView::class);
    }

    public function likes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ChatNewsLike::class);
    }

    public function categories(): BelongsToMany
    {
       return $this->belongsToMany(ChatNewsCategory::class,'chat_categories_news','chat_news_id','chat_news_category_id');
    }
}
