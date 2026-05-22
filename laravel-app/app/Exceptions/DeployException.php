<?php

namespace App\Exceptions;

class DeployException extends BusinessException
{
    public static function uploadFailed(string $message): self
    {
        return new self($message, 400);
    }
}
