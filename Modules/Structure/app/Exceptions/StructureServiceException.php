<?php

namespace Modules\Structure\Exceptions;

use App\Exceptions\BusinessException;

class StructureServiceException extends BusinessException
{
    public static function notFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function invalidReportStats(string $message): self
    {
        return new self($message, 400);
    }

    public static function serverError(string $message): self
    {
        return new self($message, 400);
    }
}
