<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Signature\SignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Confirmation\Enums\ModelTypeEnum;
use RuntimeException;

class SignatureController extends Controller
{
    public function challenge(): JsonResponse
    {
        $response = Http::withHeaders([
            'X-REAL-IP'    => '192.168.82.99',
            'Host'         => 'hrm.railway.uz',
            'Content-Type' => 'text/plain'
        ])->get(config('signature.url') . 'frontend/challenge');

        if ($response->successful()) {
            return Helper::response(true, $response->json());
        }

        return Helper::response(true, $response->body(), 400);
    }

    public function auth(Request $request): JsonResponse
    {
        $content = $request->code;

        $data = $this->signatureAuth($content);

        if (!$data['status']) {
            return Helper::response($data['message'], [], 400);
        }
        $response = $data['message'];

        if ($response->status === 1) {
            $pin = $response->subjectCertificateInfo->subjectName->{'1.2.860.3.16.1.2'};

            $user = User::whereHas('worker', static function ($query) use ($pin) {
                $query->where('pin', $pin);
            })->first();

            if (!$user) {
                return Helper::response(trans('messages.user_not_found'), [], 400);
            }

            $token = $user->createToken('web')->plainTextToken;

            return response()->json([
                'access_token' => $token,
                'message' => trans('messages.auth.login_success'),
            ]);
        }

        return Helper::response($response, 400);
    }

    public function signatureAuth($pkcs7): array
    {
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL            => config('signature.url') . 'backend/auth',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING       => '',
            CURLOPT_MAXREDIRS      => 10,
            CURLOPT_TIMEOUT        => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => $pkcs7,
            CURLOPT_HTTPHEADER     => array(
                'X-Real-IP: 192.168.82.99',
                'Host: hrm.railway.uz',
                'Content-Type: text/plain'
            ),
        ));

        $response = curl_exec($curl);

        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($httpCode !== 200) {
            throw new RuntimeException($response);
        }

        curl_close($curl);
        $response = json_decode($response, false, 512, JSON_THROW_ON_ERROR);

        if ($response->status !== 1) {
            return [
                'status'  => false,
                'message' => $response->message
            ];
        }

        return [
            'status'  => true,
            'message' => $response
        ];
    }

    public function upload(Request $request): JsonResponse
    {
        Log::info('upload', $request->all());
        return response()->json();
    }

    public function init(Request $request, SignatureService $eimzo): JsonResponse
    {
        $request->validate([
            'model' => 'required|string|in:contracts,commands,worker-application',
            'document_id' => 'required|integer'
        ]);

        // 1. Hujjatni DB dan olish
        $modelType = ModelTypeEnum::tryFrom($request->model)?->model();
        $document = $modelType::find($request->document_id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Hujjat topilmadi',
                'error_code' => 'DOCUMENT_NOT_FOUND'
            ], 404);
        }

        // 2. E-IMZO serverga so'rov - siteId va documentId olish
        $eimzoResponse = Http::timeout(30)->post(config('signature.url') . 'frontend/mobile/sign');

        if (!$eimzoResponse->successful() || $eimzoResponse->json('status') !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'E-IMZO server bilan aloqa xatosi',
                'error_code' => 'EIMZO_SERVER_ERROR'
            ], 500);
        }

        $siteId = $eimzoResponse->json('siteId');
        $eimzoDocumentId = $eimzoResponse->json('documentId');

        // 3. Fayl contentini olish
        $fileContent = Storage::disk('minio')->get($document->confirmation_file);

        // 4. QR kod va deep link yaratish (SignatureService)
        $result = $eimzo->generate($siteId, $eimzoDocumentId, $fileContent);

        // MUHIM: Cache'ga saqlash - verify uchun kerak!
        Cache::put("eimzo_sign_{$eimzoDocumentId}", [
            'model' => $request->model,
            'document_id' => $request->document_id,
            'hash' => $result['hash'],
            'created_at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        return response()->json([
            'success' => true,
            'data' => [
                'site_id' => $siteId,
                'document_id' => $eimzoDocumentId,
                'hash' => $result['hash'],
                'crc32' => $result['crc32'],
                'qr_code' => $result['qr_code'],
                'deep_link' => $result['deep_link'],
            ]
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $request->validate([
            'document_id' => 'required|string'
        ]);

        $documentId = $request->document_id;

        // E-IMZO serverdan status so'rash
        $response = Http::timeout(10)->asForm()->post(
            config('signature.url') . 'frontend/mobile/status',
            ['documentId' => $documentId]
        );

        $status = $response->json('status');

        $messages = [
            1 => 'PKCS7 yuklandi - tayyor',
            2 => 'Imzo kutilmoqda',
            -1 => 'Redis ulanish xatosi',
            -2 => 'DocumentID topilmadi (vaqt tugadi)',
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $status,
                'message' => $messages[$status] ?? 'Noma\'lum status'
            ]
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'document_id' => 'required|string'
        ]);
        $documentId = $request->document_id;

        // 1. Cache dan ma'lumotlarni olish
        $signData = Cache::get("eimzo_sign_{$documentId}");

        if (!$signData) {
            return response()->json([
                'success' => false,
                'data' => [
                    'status' => -2,
                    'message' => 'Imzolash sessiyasi tugadi. Qayta urinib ko\'ring.'
                ]
            ], 400);
        }

        // 2. Hujjatni olish va base64 ga o'girish
        $modelType = ModelTypeEnum::tryFrom($signData['model'])?->model();
        $document = $modelType::find($signData['document_id']);

        if (!$document) {
            return response()->json([
                'success' => false,
                'data' => [
                    'status' => -3,
                    'message' => 'Hujjat topilmadi'
                ]
            ], 404);
        }

        $fileContent = Storage::disk('minio')->get($document->confirmation_file);
        $documentBase64 = base64_encode($fileContent);

        // 3. E-IMZO serverga verify so'rovi
        $response = Http::timeout(30)
            ->withHeaders(['X-Real-IP' => '192.168.82.99',])
            ->asForm()->post(config('signature.url') . 'backend/mobile/verify',
            [
                'documentId' => $documentId,
                'document' => $documentBase64,
            ]
        );

        $status = $response->json('status');

        // 4. Xatolik tekshirish
        if ($status !== 1) {
            $errorMessages = [
                -4 => 'Noto\'g\'ri PKCS7 strukturasi',
                -5 => 'Imzo tekshiruvdan o\'tmadi',
                -6 => 'Sertifikat yaroqsiz',
                -7 => 'Sertifikat muddati o\'tgan',
                -8 => 'Sertifikat statusi tekshirilmadi (OCSP xatosi)',
                -9 => 'Imzolash vaqti oshib ketdi',
            ];

            return response()->json([
                'success' => false,
                'data' => [
                    'status' => $status,
                    'message' => $errorMessages[$status] ?? 'Imzo tekshiruvdan o\'tmadi'
                ]
            ], 400);
        }

        // 5. Muvaffaqiyatli - ma'lumotlarni olish
        $subjectInfo = $response->json('subjectCertificateInfo');
        $verificationInfo = $response->json('verificationInfo');
        $pkcs7Attached = $response->json('pkcs7Attached');

        // 6. Hujjatni DB da yangilash
        $d = [
            'signed_at' => now(),
            'signed_by' => auth()->id(),
            'pkcs7_data' => $pkcs7Attached,
            'signer_serial' => $subjectInfo['serialNumber'] ?? null,
            'signer_name' => $subjectInfo['subjectName']['CN'] ?? null,
            'signer_pin' => $subjectInfo['subjectName']['1.2.860.3.16.1.2'] ?? null,
            'signing_time' => $verificationInfo['signingTime'] ?? null,
            'timestamped_time' => $verificationInfo['timestampedTime'] ?? null,
        ];

//        $document->update($d);

        // 7. Imzolangan faylni alohida saqlash (optional)
        if ($pkcs7Attached) {
//            $signedPath = "signed/{$signData['model']}/{$document->id}.p7s";
//            Storage::put($signedPath, base64_decode($pkcs7Attached));
//            $document->update(['signed_file_path' => $signedPath]);
        }

        // 8. Cache ni tozalash
        Cache::forget("eimzo_sign_{$documentId}");

        return response()->json([
            'success' => true,
            'data' => [
                'status' => 1,
                'message' => 'Hujjat muvaffaqiyatli imzolandi',
                'signer' => [
                    'serial_number' => $subjectInfo['serialNumber'] ?? null,
                    'full_name' => $subjectInfo['subjectName']['CN'] ?? null,
                    'pin' => $subjectInfo['subjectName']['1.2.860.3.16.1.2'] ?? null,
                    'uid' => $subjectInfo['subjectName']['UID'] ?? null,
                    'valid_from' => $subjectInfo['validFrom'] ?? null,
                    'valid_to' => $subjectInfo['validTo'] ?? null,
                ],
                'signing_time' => $verificationInfo['signingTime'] ?? null,
                'timestamped_time' => $verificationInfo['timestampedTime'] ?? null,
            ]
        ]);
    }

}
