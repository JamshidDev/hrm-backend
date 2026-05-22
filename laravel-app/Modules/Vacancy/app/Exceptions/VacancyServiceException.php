<?php

namespace Modules\Vacancy\Exceptions;

use App\Exceptions\BusinessException;

class VacancyServiceException extends BusinessException
{
    public static function noPhoto(string $message): self
    {
        return new self($message, 400);
    }

    public static function incompleteProfile(string $message): self
    {
        return new self($message, 400);
    }

    public static function vacancyExpired(string $message): self
    {
        return new self($message, 400);
    }

    public static function alreadyApplied(string $message): self
    {
        return new self($message, 400);
    }

    public static function examStarted(string $message): self
    {
        return new self($message, 400);
    }
}
