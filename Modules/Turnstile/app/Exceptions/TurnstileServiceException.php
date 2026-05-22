<?php

namespace Modules\Turnstile\Exceptions;

use App\Exceptions\BusinessException;

class TurnstileServiceException extends BusinessException
{
    public static function serverError(string $message): self
    {
        return new self($message, 400);
    }

    public static function maxAccessLevelsExceeded(string $message): self
    {
        return new self($message, 400);
    }

    public static function invalidEndDate(string $message): self
    {
        return new self($message, 400);
    }

    public static function groupHasWorkers(string $message): self
    {
        return new self($message, 400);
    }

    public static function receiverOrganizationIsCurrent(string $message): self
    {
        return new self($message, 400);
    }

    public static function approvedCannotBeEdited(string $message): self
    {
        return new self($message, 400);
    }

    public static function approvedCannotBeDeleted(string $message): self
    {
        return new self($message, 400);
    }
}
