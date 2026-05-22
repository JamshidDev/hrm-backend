<?php

namespace App\Exceptions;

class AIServiceException extends BusinessException
{
    public static function emptyQuestion(string $message): self
    {
        return new self($message, 400);
    }
}
