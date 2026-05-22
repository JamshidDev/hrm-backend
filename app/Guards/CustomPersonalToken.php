<?php

namespace App\Guards;

use Laravel\Sanctum\PersonalAccessToken;

class CustomPersonalToken extends PersonalAccessToken
{
    protected $table = 'personal_access_tokens';

    public function touch($attribute = null): bool
    {
        return true;
    }

    public function save(array $options = [])
    {
        $this->last_used_at = $this->getOriginal('last_used_at');
        return parent::save($options);
    }
}
