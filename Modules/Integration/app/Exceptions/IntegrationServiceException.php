<?php

namespace Modules\Integration\Exceptions;

use App\Exceptions\BusinessException;

class IntegrationServiceException extends BusinessException
{
    public static function notFound(string $message): self
    {
        return new self($message, 404);
    }

    public static function serverError(string $message): self
    {
        return new self($message, 500);
    }

    public static function eventAlreadyExists(string $message): self
    {
        return new self($message, 400);
    }
}
