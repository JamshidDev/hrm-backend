<?php

namespace App\Services;

use App\Models\UserMobileKey;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    protected string $projectId;
    protected string $fcmUrl;

    public function __construct()
    {
        $this->projectId = config('firebase.project_id');
        $this->fcmUrl = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";
    }

    // -------------------------------------------------------------------------
    // Access token
    // -------------------------------------------------------------------------

    protected function getAccessToken(): string
    {
        $client = new GoogleClient();
        $credentials = config('firebase.service_account');

        if (is_string($credentials)) {
            $credentials = json_decode($credentials, true);
        }


        $client->setAuthConfig($credentials);
        $client->addScope('https://www.googleapis.com/auth/firebase.messaging');

        $token = $client->fetchAccessTokenWithAssertion();

        return $token['access_token'];
    }

    // -------------------------------------------------------------------------
    // Single device (platform-aware)
    // -------------------------------------------------------------------------

    /**
     * Send a push notification to a single FCM token.
     *
     * @param string $fcmToken Device FCM registration token
     * @param string $title Notification title
     * @param string $body Notification body
     * @param array $data Custom key-value payload (string values only)
     * @param string $platform 'android' | 'ios' | 'auto' (default: 'auto')
     */
    public function sendToToken(
        string $fcmToken,
        string $title,
        string $body,
        array  $data = [],
        string $platform = 'auto'
    ): array
    {
        $message = $this->buildMessage($fcmToken, $title, $body, $data, $platform);

        return $this->dispatch($message);
    }

    // -------------------------------------------------------------------------
    // Multiple devices
    // -------------------------------------------------------------------------

    /**
     * Send to multiple FCM tokens.
     * Returns an array of ['token' => ..., 'result' => ...] per device.
     */
    public function sendToTokens(
        array  $fcmTokens,
        string $title,
        string $body,
        array  $data = [],
        string $platform = 'auto'
    ): array
    {
        $accessToken = $this->getAccessToken();
        $results = [];

        foreach ($fcmTokens as $token) {
            $message = $this->buildMessage($token, $title, $body, $data, $platform);
            $result = $this->dispatch($message, $accessToken);

            $results[] = [
                'token' => $token,
                'result' => $result,
            ];
        }

        return $results;
    }

    // -------------------------------------------------------------------------
    // Send to a User (all active devices)
    // -------------------------------------------------------------------------

    /**
     * Send a notification to all active devices of a user.
     * Automatically detects the platform per device.
     *
     * @param int|\App\Models\User $user
     */
    public function sendToUser(
        mixed  $user,
        string $title,
        string $body,
        array  $data = []
    ): array
    {
        $userId = is_object($user) ? $user->id : $user;

        $devices = UserMobileKey::where('user_id', $userId)
            ->where('notifications', true)
            ->whereNotNull('fcm_token')
            ->get(['fcm_token', 'platform']);

        if ($devices->isEmpty()) {
            return [];
        }

        $accessToken = $this->getAccessToken();
        $results = [];

        foreach ($devices as $device) {
            $platform = $this->normalizePlatform($device->platform ?? 'auto');
            $message = $this->buildMessage($device->fcm_token, $title, $body, $data, $platform);
            $result = $this->dispatch($message, $accessToken);

            $results[] = [
                'token' => $device->fcm_token,
                'platform' => $platform,
                'result' => $result,
            ];
        }

        return $results;
    }

    // -------------------------------------------------------------------------
    // Topic messaging
    // -------------------------------------------------------------------------

    /**
     * Send a notification to an FCM topic.
     */
    public function sendToTopic(
        string $topic,
        string $title,
        string $body,
        array  $data = []
    ): array
    {
        $message = $this->buildMessage(null, $title, $body, $data, 'auto', $topic);

        return $this->dispatch($message);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    protected function buildMessage(
        ?string $token,
        string  $title,
        string  $body,
        array   $data,
        string  $platform,
        ?string $topic = null
    ): array
    {
        // FCM requires all data values to be strings
        $data = array_map('strval', $data);

        $message = [
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => $data,
        ];

        // Target: token or topic
        if ($token !== null) {
            $message['token'] = $token;
        } elseif ($topic !== null) {
            $message['topic'] = $topic;
        }

        // Platform-specific config
        $resolvedPlatform = $this->normalizePlatform($platform);

        if ($resolvedPlatform === 'android') {
            $message['android'] = $this->androidConfig();
        } elseif ($resolvedPlatform === 'ios') {
            $message['apns'] = $this->apnsConfig($title, $body);
        } else {
            // 'auto' — include both, FCM delivers the right one per device
            $message['android'] = $this->androidConfig();
            $message['apns'] = $this->apnsConfig($title, $body);
        }

        return $message;
    }

    protected function androidConfig(): array
    {
        return [
            'priority' => 'high',
            'notification' => [
                'channel_id' => config('firebase.android_channel_id', 'hrm_railway_mobile'),
                'visibility' => 'PUBLIC',
                'sound' => 'default',
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
            ],
        ];
    }

    protected function apnsConfig(string $title, string $body): array
    {
        return [
            'headers' => [
                'apns-priority' => '10',
                'apns-push-type' => 'alert',
            ],
            'payload' => [
                'aps' => [
                    'alert' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'sound' => 'default',
                    'badge' => 1,
                    'content-available' => 1,
                    'mutable-content' => 1,
                ],
            ],
        ];
    }

    protected function normalizePlatform(string $platform): string
    {
        return match (strtolower($platform)) {
            'ios', 'apple', 'iphone', 'ipad' => 'ios',
            'android' => 'android',
            default => 'auto',
        };
    }

    protected function dispatch(array $message, ?string $accessToken = null): array
    {
        try {
            $accessToken ??= $this->getAccessToken();

            $response = Http::withToken($accessToken)
                ->timeout(10)
                ->post($this->fcmUrl, ['message' => $message]);

            if ($response->failed()) {
                Log::warning('FCM dispatch failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'message' => $message,
                ]);
            }

            return $response->json() ?? [];
        } catch (\Throwable $e) {
            Log::error('FCM dispatch exception', [
                'error' => $e->getMessage(),
                'message' => $message,
            ]);

            return ['error' => $e->getMessage()];
        }
    }
}
