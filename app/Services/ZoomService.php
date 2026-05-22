<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Models\ZoomMeeting;
use App\Models\ZoomMeetingEvent;
use Carbon\Carbon;
use Exception;
use GuzzleHttp\Client;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Http;

class ZoomService
{
    protected Client $client;
    protected string $clientId;
    protected string $clientSecret;
    protected string $accountId;
    protected string $accessToken = "";
    protected string $tokenExpiresAt;

    public function __construct()
    {
        $this->clientId = config('services.zoom.client');
        $this->clientSecret = config('services.zoom.secret');
        $this->accountId = config('services.zoom.account');
        $this->client = new Client(['base_uri' => 'https://api.zoom.us/v2/']);
        $this->authenticate();
    }

    protected function authenticate(): void
    {
        // Token hali mavjud emas yoki expired bo'lsa
        if (!$this->accessToken || time() >= $this->tokenExpiresAt) {

            $response = $this->client->post('https://zoom.us/oauth/token', [
                'form_params' => [
                    'grant_type' => 'account_credentials',
                    'account_id' => $this->accountId
                ],
                'headers' => [
                    'Authorization' => 'Basic ' . base64_encode($this->clientId . ':' . $this->clientSecret),
                    'Content-Type' => 'application/x-www-form-urlencoded'
                ],
            ]);

            $data = json_decode($response->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $this->accessToken = $data['access_token'];
            $this->tokenExpiresAt = time() + $data['expires_in'] - 60; // safety margin 60s
        }
    }

    public function createMeeting($topic, $time, $duration)
    {
        $this->authenticate(); //tokenni yangilash

        $response = $this->client->post("users/me/meetings", [
            'headers' => [
                'Authorization' => "Bearer {$this->accessToken}",
                'Content-Type' => 'application/json'
            ],
            'json' => [
                'topic' => $topic,
                'type' => 2, //Scheduled meeting
                'start_time' => $time,
                'duration' => $duration,
                'timezone' => 'Asia/Tashkent',
                'settings' => [
                    "host_video" => true,   // O'qituvchi kamerasi yoqilsin
                    "participant_video" => false,  // Xodimlarga majburiy kamera yoqilmasin
                    "join_before_host" => true,  // O'qituvchi kirmaguncha dars boshlanmasin
                    "mute_upon_entry" => true,   // Xodimlar avtomatik mute bo'lib kirsin
                    "waiting_room" => false,  // Waiting room ishlatilmasin
                    "approval_type" => 2,      // Registration kerak emas
                    "registration_type" => 0,      // Xodimlar to'g'ridan-to'g'ri join qilishi mumkin
                    "audio" => "both", // Kompyuter yoki telefon orqali kirish imkoniyati
                    "auto_recording" => "cloud", // Avtomatik yozib olinmasin (kerak bo'lsa -> "cloud"/"local")
                    "enforce_login" => false,  // Faqat Zoom account bilan kirishga majbur qilmang
                    "meeting_authentication" => false   // Meeting authentication shart emas
                ]
            ]
        ]);

        return json_decode($response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function getPastMeetingParticipants(string $meetingUUID, int $page_size = 30, string $next_page_token = '')
    {
        $url = "https://api.zoom.us/v2/past_meetings/" . urlencode($meetingUUID) . "/participants";

        $response = Http::withToken($this->accessToken)
            ->get($url, [
                'page_size' => $page_size,
                'next_page_token' => $next_page_token
            ])->throw();

        return $response->json();
    }

    public function handleWebhook(array $request): ?array
    {
        $payload = $request['payload'] ?? [];

        if ($payload['object']['id'] ?? null) {
            $meet = ZoomMeeting::query()
                ->where('zoom_id', $payload['object']['id'])
                ->first();

            if (!$meet) {
                throw new Exception(trans('messages.zoom.not_found'));
            }

            ZoomMeetingEvent::create([
                'event' => $payload['event'] ?? null,
                'zoom_meeting_id' => $meet->id,
                'details' => $payload,
            ]);
        }


        if (($request['event'] ?? null) === 'endpoint.url_validation') {
            $plainToken = $payload['plainToken'] ?? null;

            return [
                'plainToken' => $plainToken,
                'encryptedToken' => hash_hmac('sha256', $plainToken, config('services.zoom.event_secret')),
            ];
        }

        return null;
    }

    public function checkMeeting(string $meetUuid, string $meetId): array
    {
        $meet = ZoomMeeting::query()
            ->where('zoom_uuid', $meetUuid)
            ->where('zoom_id', $meetId)
            ->first();

        if (!$meet) {
            throw new HttpResponseException(
                Helper::response(trans('messages.meet_not_found'), [], 404)
            );
        }

        $endsAt = Carbon::parse($meet->meet_date_and_time)->addMinutes($meet->duration);

        if ($endsAt->lessThanOrEqualTo(now())) {
            throw new HttpResponseException(
                Helper::response(trans('messages.meet_not_available'), [], 403)
            );
        }

        if ($meet->status === 2) {
            throw new HttpResponseException(
                Helper::response(trans('messages.meet_ended'), [], 403)
            );
        }

        return [
            'start_url' => $meet->details['start_url'] ?? null,
            'join_url' => $meet->details['join_url'] ?? null,
        ];
    }
}
