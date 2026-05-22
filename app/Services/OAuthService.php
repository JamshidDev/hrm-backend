<?php

namespace App\Services;

use App\Helpers\Helper;
use App\Models\OauthClient;
use App\Models\OauthClientCode;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Str;

class OAuthService
{
    private const int AUTH_CODE_TTL_MINUTES = 10;
    private const int AUTH_CODE_LENGTH = 40;

    public function generateAuthCode(User $user, array $data): string
    {
        $client = $this->findActiveClient($data['client_id']);

        $exists = OauthClientCode::query()
            ->where('oauth_client_id', $client->id)
            ->where('user_id', $user->id)
            ->where('state', $data['state'])
            ->exists();

        if ($exists) {
            throw new HttpResponseException(
                Helper::response('Auth code already exist', [], 400)
            );
        }

        $code = Str::random(self::AUTH_CODE_LENGTH);

        OauthClientCode::query()->create([
            'oauth_client_id' => $client->id,
            'user_id' => $user->id,
            'code' => $code,
            'expires_at' => now()->addMinutes(self::AUTH_CODE_TTL_MINUTES),
            'state' => $data['state'],
            'scope' => $data['scope'],
        ]);

        return $client->redirect_uri
            . '?code=' . $code
            . '&state=' . $data['state']
            . '&scope=' . $data['scope'];
    }

    public function exchangeAuthCode(array $data): array
    {
        $client = OauthClient::query()
            ->where('client_id', $data['client_id'])
            ->where('client_secret', $data['client_secret'] ?? null)
            ->where('in_active', true)
            ->first();

        if (!$client) {
            throw new HttpResponseException(
                Helper::response('Client not found', [], 404)
            );
        }

        $authCode = OauthClientCode::query()
            ->where('oauth_client_id', $client->id)
            ->where('code', $data['code'])
            ->where('expires_at', '>=', now())
            ->first();

        if (!$authCode) {
            throw new HttpResponseException(
                Helper::response('Auth code not found', [], 404)
            );
        }

        $authCode->update(['used' => true]);
        $authCode->load('user');

        return [
            'user' => $authCode->user,
        ];
    }

    private function findActiveClient(string $clientId): OauthClient
    {
        $client = OauthClient::query()
            ->where('client_id', $clientId)
            ->where('in_active', true)
            ->first();

        if (!$client) {
            throw new HttpResponseException(
                Helper::response('Client not found', [], 404)
            );
        }

        return $client;
    }
}
