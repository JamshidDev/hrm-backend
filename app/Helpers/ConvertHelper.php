<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Storage;
use Intervention\Image\Interfaces\EncodedImageInterface;
use Intervention\Image\Laravel\Facades\Image;
use Throwable;

class ConvertHelper
{
    public static function docxToPdf($docxPath, $pdfPath, $disc = 'public'): array
    {
        try {
            $fileName = pathinfo($docxPath, PATHINFO_FILENAME) . '.pdf';

            /** Source → local */
            if ($disc === 'minio') {
                $tempDir = storage_path('app/temp');
                if (!file_exists($tempDir) && !mkdir($tempDir, 0775, true) && !is_dir($tempDir)) {
                    return [
                        'status' => false,
                        'msg' => sprintf('Directory "%s" was not created', $tempDir)
                    ];
                }
                $localDocxPath = $tempDir . '/' . basename($docxPath);
                $content = Storage::disk('minio')->get($docxPath);
                if ($content === false || $content === null) {
                    return [
                        'status' => false,
                        'msg' => "MinIO dan faylni o‘qib bo‘lmadi: " . $docxPath
                    ];
                }
                file_put_contents($localDocxPath, $content);
                $docxPath = $localDocxPath;
            } else {
                $content = file_get_contents($docxPath);
            }

            if (!$content) {
                return [
                    'status' => false,
                    'msg' => "Docx o‘qilmadi: {$docxPath}"
                ];
            }

            $pathInfo = pathinfo($docxPath);
            $localPdfPath = $pathInfo['dirname'] . '/';

            if (app()->environment('local')) {
                $soffice = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"';
                $sofficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

                if (!file_exists($sofficePath)) {
                    return [
                        'status' => false,
                        'msg' => "LibreOffice topilmadi: {$sofficePath}"
                    ];
                }

                $command = $soffice
                    . ' --headless --invisible --nolockcheck --nofirststartwizard'
                    . ' --convert-to pdf'
                    . ' --outdir ' . escapeshellarg($localPdfPath)
                    . ' ' . escapeshellarg($docxPath)
                    . ' 2>&1';
            } else {
                $command = 'unoconv -f pdf -o ' . escapeshellarg($localPdfPath . $fileName) . ' ' . escapeshellarg($docxPath) . ' 2>&1';
            }

            exec($command, $output, $returnVar);

            if ($returnVar !== 0) {
                return [
                    'status' => false,
                    'msg' => "Convert xatosi ({$returnVar}):\n" . implode("\n", $output)
                ];
            }
            $localPdfPath .= $fileName;

            $wait = 0;
            while (!file_exists($localPdfPath) && $wait < 20) {
                sleep(1);
                $wait++;
            }

            if (!file_exists($localPdfPath)) {
                return [
                    'status' => false,
                    'msg' => "PDF topilmadi: {$localPdfPath}\nOutput:\n" . implode("\n", $output)
                ];
            }

            $resultPath = trim($pdfPath, '/') . '/' . $fileName;
            if ($disc === 'minio') {
                Storage::disk($disc)->writeStream($resultPath, fopen($localPdfPath, 'rb'));
            } else {
                Storage::disk($disc)->writeStream($resultPath, fopen(public_path($localPdfPath), 'rb'));
            }

            @unlink($docxPath);
            @unlink($localPdfPath);

            return [
                'status' => true,
                'msg' => $resultPath
            ];

        } catch (Throwable $e) {
            Helper::setLog($e, 'ConvertHelper docxToPdf failed');
            return [
                'status' => false,
                'msg' => 'ConvertHelper docxToPdf failed'
            ];
        }
    }

    public static function optimizeBase64Image(string $base64Image): string
    {
        if (!preg_match('/^data:image\/(\w+);base64,/', $base64Image)) {
            throw new \RuntimeException('Base64 format noto‘g‘ri');
        }

        $base64Str = substr($base64Image, strpos($base64Image, ',') + 1);
        $binary = base64_decode($base64Str);

        if ($binary === false) {
            throw new \RuntimeException('Base64 dekod qilishda xatolik');
        }
        if (strlen($base64Image) <= 500) {
            return $base64Image;
        }

        $image = Image::read($base64Image)->resize()->toJpeg(50);

        return 'data:image/jpeg;base64,' . base64_encode((string) $image);
    }

    public static function compressBase64Image($base64Image, $maxSizeKb = 200): string
    {
        // Bo‘sh joylarni to‘g‘rilash
        $base64Image = str_replace(' ', '+', $base64Image);

        // Meta va data ajratish
        if (str_contains($base64Image, ',')) {
            [$meta, $base64Data] = explode(',', $base64Image);
        } else {
            $base64Data = $base64Image;
        }

        // Decode qilib rasm obyektini yaratish
        $imageData = base64_decode($base64Data);
        $image = Image::read($imageData)->resize()->toJpeg(90); // 90 - boshlang‘ich sifat

        // Siqish sikli: 200 KBdan kichik bo‘lguncha sifatni pasaytir
        $quality = 90;
        while (strlen((string) $image) > $maxSizeKb * 1024 && $quality > 10) {
            $quality -= 10;
            $image = Image::read($imageData)->resize()->toJpeg($quality);
        }

        if (strlen((string) $image) > $maxSizeKb * 1024) {
            throw new \RuntimeException("Rasmni {$maxSizeKb}KB gacha siqib bo‘lmadi. Rasm hajmi juda yuqori!");
        }

        // Qayta base64 formatga o‘girish
        return 'data:image/jpeg;base64,' . base64_encode((string) $image);
    }

    public static function compressImage($imageData, $maxSizeKb = 200): EncodedImageInterface
    {
        $image = Image::read($imageData);

        // Avvalo rasmni o‘lchamini tekshiramiz
        $width = $image->width();
        $height = $image->height();

        // Kattaroq rasmlar uchun proporsional resize (masalan, 2000px dan katta bo‘lsa)
        $maxDimension = 1000;
        if ($width > $maxDimension || $height > $maxDimension) {
            $image = $image->scaleDown($maxDimension);
        }

        $target = null;
        $quality = 97;
        $temp = $image->resize()->toJpeg($quality);

        // Siqish iteratsiyasi
        while (strlen((string) $temp) > $maxSizeKb * 1024 && $quality > 40) {
            $quality -= 5;
            $temp = $image->resize()->toJpeg($quality);
        }

        if (strlen((string) $temp) <= $maxSizeKb * 1024) {
            $target = $temp;
        }

        if (!$target) {
            throw new \RuntimeException("Rasmni {$maxSizeKb}KB gacha siqib bo‘lmadi — hajmi juda katta yoki format og‘ir!");
        }

        return $target;
    }

}
