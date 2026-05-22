<?php

namespace Modules\Exam\Exceptions;

use App\Exceptions\BusinessException;

class ExamServiceException extends BusinessException
{
    public static function badRequest(string $message): self
    {
        return new self($message, 400);
    }

    public static function forbidden(string $message): self
    {
        return new self($message, 403);
    }

    public static function notFound(string $message): self
    {
        return new self($message, 404);
    }
}
