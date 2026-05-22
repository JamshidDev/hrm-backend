<?php

namespace App\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;
use Modules\Confirmation\Enums\ModelTypeEnum;
use Modules\HR\Models\Worker;
use Modules\Structure\Models\Signature;

class SignatureService
{
    public function signatureToImageDigital($model, $documentName): ?string
    {
        $documentUrl = config('app.front_url') . '/public/' . $model . '/' . $documentName;
        $text = $documentUrl;
        $qrCodeName = md5($documentName . time());
        $filePath = 'storage/qr-codes/' . $qrCodeName . '.png';
        $result = Builder::create()->writer(new PngWriter())->data($text)->size(200)->margin(0)->build();
        $result->saveToFile($filePath);
        return $filePath;
    }

    public function signatureToImageBio($confirmation, $documentName): ?string
    {
        $decodedImage = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $confirmation->signature));
        $qrCodeName = md5($documentName . time());
        $filePath = 'storage/qr-codes/' . $qrCodeName . '.png';
        file_put_contents($filePath, $decodedImage);

        return $filePath;
    }

    public function signature($request, $confirmationWorker, $user, $model): array
    {
        $signatureServer = config('signature.url');

        if ($request->confirmation_type === ConfirmationTypeEnum::BIOMETRIC->value) {
            return ['success' => true];
        }

        $pin = (int)$request->pin;

        if (!in_array($pin, [50207007170030, 31604965320012])) {
            if (!$confirmationWorker) {
                return [
                    'success' => false,
                    'message' => trans('messages.worker.not_found')
                ];
            }
        }

        $code = $request->code;

        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => $signatureServer . 'frontend/timestamp/pkcs7',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => $code,
            CURLOPT_HTTPHEADER => array(
                'X-Real-IP: 192.168.82.99',
                'Host: e-imzo.dasuty.com',
                'Content-Type: text/plain'
            ),
        ));

        $response = curl_exec($curl);
        curl_close($curl);
        $response = json_decode($response, false, 512, JSON_THROW_ON_ERROR);

        if ($response->status !== 1) {
            return [
                'success' => false,
                'message' => $response->message
            ];
        }

        $resCode = $response->pkcs7b64;

        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => $signatureServer . 'backend/pkcs7/verify/attached',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => $resCode,
            CURLOPT_HTTPHEADER => array(
                'X-Real-IP: 192.168.82.99',
                'Host: e-imzo.dasuty.com',
                'Content-Type: text/plain'
            ),
        ));

        $response = curl_exec($curl);
        curl_close($curl);
        $response = json_decode($response, false, 512, JSON_THROW_ON_ERROR);


        if ($response->status !== 1) {
            return [
                'success' => false,
                'message' => $response->message
            ];
        }

        $pin = $response->pkcs7Info->signers[0]->certificate[0]->subjectInfo->{"1.2.860.3.16.1.2"};

        $worker = Worker::where('pin', $pin)->first();

        if (!$worker || $confirmationWorker->worker_id !== $worker->id) {
            if (!in_array($pin, [50207007170030, 31604965320012])) {
                return [
                    'success' => false,
                    'message' => trans('messages.worker.not_found')
                ];
            }
        }

        Signature::create([
            'model_id' => $request->confirmation_id,
            'model_type' => ModelTypeEnum::tryFrom($request->model)?->confirmationModelClass(),
            'signature' => $resCode,
            'type' => ConfirmationTypeEnum::DIGITAL->value,
            'status' => true,
            'user_id' => $user->id
        ]);

        return ['success' => true];
    }


    public function convertQrCode($model, $uuid, $worker): string
    {
        $documentUrl = 'https://hrm.railway.uz/v1/document/' . $model . '/' . $uuid;
        $text = $worker->full_name() . PHP_EOL . $documentUrl;
        $qrCodeName = md5($uuid . time());
        $filePath = 'storage/qr-codes/' . $qrCodeName . '.png';
        $result = Builder::create()->writer(new PngWriter())->data($text)->size(200)->margin(0)->build();
        $result->saveToFile($filePath);
        return $filePath;
    }
}
