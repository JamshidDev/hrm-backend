<?php

namespace App\Traits;

use App\Exceptions\FileUploadException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait Base64FileUploadTrait
{
    public function uploadBase64File(
        $base64File,
        $folder = 'files',
        $allowedFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx'],
        $fileSize = 1024
    ): string
    {
        if (preg_match('/^data:(\w+)\/(\w+);base64,/', $base64File, $type)) {
            $base64 = substr($base64File, strpos($base64File, ',') + 1);
            $extension = strtolower($type[2]);
        } else {
            $base64 = $base64File;
            $extension = 'jpg';
        }

        if (!in_array($extension, $allowedFileTypes, true)) {
            throw new \Exception(trans('messages.base64_file_not_valid'));
        }

        if ($fileSize < $this->getBase64FileSize($base64)) {
            throw new \Exception(trans('messages.maximum_file_siz') . $fileSize . 'KB');
        }
        $base64 = str_replace(' ', '+', $base64);
        $base64 = base64_decode($base64, true);

        if ($base64 === false) {
            throw new \Exception(trans('messages.base64_file_not_valid'));
        }

        $filename = md5(Str::random(25) . random_int(1, 9999) . time()) . '.' . $extension;

        $filePath = $folder . '/' . $filename;

        $storage = Storage::disk('minio')->put($filePath, $base64);
        if (!$storage) {
            throw new \Exception(trans('messages.base64_file_not_valid'));
        }
        return $filePath;
    }

    public function getBase64FileSize($base64): float
    {
        $length = strlen($base64);
        $padding = substr_count($base64, '=');
        $size = ($length * 3 / 4) - $padding;
        return round($size / 1024, 2);
    }

    public function uploadFormFile($file, $folder = 'files', $allowedFileTypes = ['pdf'], $filename = null, $size = 4): ?string
    {
        if ($file) {
            $fileExtension = $file->getClientOriginalExtension();
            $fileSize = $file->getSize() / 1024;

            if (!in_array(strtolower($fileExtension), $allowedFileTypes, true)) {
                throw FileUploadException::invalidType(trans('messages.file_not_valid') . ' ' . implode(', ', $allowedFileTypes));
            }

            $fileSize = (int)$fileSize;
            if ($fileSize > $size * 1024) {
                throw FileUploadException::maxSizeExceeded(trans('messages.maximum_file_siz') . $fileSize . 'KB');
            }

            if (!$filename) {
                $filename = md5(Str::random(25) . random_int(1, 9999) . time());
            }

            $filename .= '.' . $fileExtension;

            $filePath = $folder . '/' . $filename;
            $store = Storage::disk('minio')->put($filePath, file_get_contents($file));
            if (!$store) {
                return null;
            }
            return $filePath;
        }
        return null;
    }

    public function uploadFileFromPath($filePath, $fileName, $folder = 'files'): false|string
    {
        $file = Storage::disk(config('filesystems.default'))
            ->put($folder . '/' . $fileName, file_get_contents($filePath),
                [
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                    'Pragma' => 'no-cache',
                    'Expires' => '0',
                ]
            );
        if (!$file) {
            throw FileUploadException::storeFailed(trans('messages.invalid_store_photo'));
        }
        return $folder . '/' . $fileName;
    }

}
