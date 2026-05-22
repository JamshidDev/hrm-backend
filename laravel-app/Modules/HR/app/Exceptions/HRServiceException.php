<?php

namespace Modules\HR\Exceptions;

use App\Exceptions\BusinessException;

class HRServiceException extends BusinessException
{
    public static function invalidCommandType(string $message): self
    {
        return new self($message, 400);
    }

    public static function approvedDocumentCannotBeDeleted(string $message): self
    {
        return new self($message, 400);
    }

    public static function contractNotFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function typeNotAllowed(string $message): self
    {
        return new self($message, 400);
    }

    public static function departmentPositionHasWorkers(string $message): self
    {
        return new self($message, 400);
    }

    public static function vacationNotFound(string $message): self
    {
        return new self($message, 400);
    }

    public static function tokenExpired(string $message): self
    {
        return new self($message, 403);
    }

    public static function workerNotFound(string $message): self
    {
        return new self($message, 404);
    }

    public static function userNotFound(string $message, int $status = 403): self
    {
        return new self($message, $status);
    }

    public static function currentPhotoCannotBeDeleted(string $message): self
    {
        return new self($message, 409);
    }

    public static function workerPositionHasOtherCareers(string $message): self
    {
        return new self($message, 400);
    }

    public static function workerAlreadyExists(string $message): self
    {
        return new self($message, 400);
    }

    public static function workerPhoneExists(string $message): self
    {
        return new self($message, 400);
    }

    public static function permissionDenied(string $message): self
    {
        return new self($message, 403);
    }

    public static function validation(string $message): self
    {
        return new self($message, 422);
    }

    public static function vacancyHasApplicationNotChecked(string $message): self
    {
        return new self($message, 400);
    }

    public static function organizationNotAllowedPermission(string $message): self
    {
        return new self($message, 403);
    }

    public static function dontDeleteStartedExam(string $message): self
    {
        return new self($message, 403);
    }
}
