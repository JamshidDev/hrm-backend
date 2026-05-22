<?php

namespace Modules\Economist\Exceptions;

use App\Exceptions\BusinessException;

class EconomistServiceException extends BusinessException
{
    public static function organizationNotFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function permissionDenied(string $message): self
    {
        return new self($message, 403);
    }
}
