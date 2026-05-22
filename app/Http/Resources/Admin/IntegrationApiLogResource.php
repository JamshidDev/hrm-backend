<?php

namespace App\Http\Resources\Admin;

use App\Models\HmacUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IntegrationApiLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $client = null;
        $model = $this->whenLoaded('model');

        if ($model instanceof User) {
            $fullName = trim(collect([
                $model->worker?->last_name,
                $model->worker?->first_name,
                $model->worker?->middle_name,
            ])->filter()->implode(' '));

            $client = [
                'id' => $model->id,
                'type' => 'sanctum_user',
                'name' => $fullName ?: ($model->phone ?? "User #{$model->id}"),
                'secret_type' => 'sanctum_user',
            ];
        } elseif ($model instanceof HmacUser) {
            $client = [
                'id' => $model->id,
                'type' => 'hmac_user',
                'name' => $model->name,
                'secret_type' => $model->secret_type,
            ];
        }

        return [
            'id' => $this->id,
            'model_id' => $this->model_id,
            'model_type' => $this->model_type,
            'client' => $client,
            'secret' => $this->secret,
            'api_type' => $this->api_type,
            'endpoint' => $this->endpoint,
            'method' => $this->method,
            'request_headers' => $this->request_headers,
            'request_body' => $this->request_body,
            'response_status' => $this->response_status,
            'error' => $this->error,
            'duration_ms' => $this->duration_ms,
            'created_at' => $this->created_at->toDateTimeString()
        ];
    }
}
