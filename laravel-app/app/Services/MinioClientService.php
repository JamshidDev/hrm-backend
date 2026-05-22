<?php

namespace App\Services;
use Aws\S3\S3Client;

class MinioClientService
{
    public static function client(): S3Client
    {
        $config = config('filesystems.disks.minio');

        return new S3Client([
            'version' => 'latest',
            'region'  => $config['region'],
            'endpoint'=> 'https://s3.dasuty.com',
            'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? false,
            'credentials' => [
                'key'    => $config['key'],
                'secret' => $config['secret'],
            ],
        ]);
    }
}
