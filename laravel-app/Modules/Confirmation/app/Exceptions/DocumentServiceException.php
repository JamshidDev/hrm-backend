<?php

namespace Modules\Confirmation\Exceptions;

use App\Exceptions\BusinessException;

class DocumentServiceException extends BusinessException
{
    public static function documentNotFound(string $message): self
    {
        return new self($message, 404);
    }

    public static function badRequest(string $message): self
    {
        return new self($message, 400);
    }
}
