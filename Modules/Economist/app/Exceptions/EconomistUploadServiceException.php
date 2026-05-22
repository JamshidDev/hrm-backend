<?php

namespace Modules\Economist\Exceptions;

use App\Exceptions\BusinessException;

class EconomistUploadServiceException extends BusinessException
{
    public static function permissionDenied(string $message): self
    {
        return new self($message, 403);
    }

    public static function uploadApprovedFile(string $message): self
    {
        return new self($message, 400);
    }

    public static function uploadedFileNotFound(string $message): self
    {
        return new self($message, 400);
    }
}
