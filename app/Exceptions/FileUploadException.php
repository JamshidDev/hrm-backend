<?php

namespace App\Exceptions;

class FileUploadException extends BusinessException
{
    public static function invalidType(string $message): self
    {
        return new self($message, 400);
    }

    public static function maxSizeExceeded(string $message): self
    {
        return new self($message, 400);
    }

    public static function storeFailed(string $message): self
    {
        return new self($message, 400);
    }
}
