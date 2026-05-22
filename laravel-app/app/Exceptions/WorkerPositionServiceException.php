<?php

namespace App\Exceptions;

class WorkerPositionServiceException extends BusinessException
{
    public static function workerPositionNotFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function departmentPositionNotFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function workerAlreadyHasActivePosition(string $message): self
    {
        return new self($message, 400);
    }
}
