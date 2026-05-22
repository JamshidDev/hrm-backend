<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Channels\DatabaseChannel as BaseDatabaseChannel;

class NotificationDatabaseChannel extends BaseDatabaseChannel
{
    protected function buildPayload($notifiable, Notification $notification): array
    {
        $data = $notification->toDatabase($notifiable);

        if (isset($data['data'], $data['sender_id'])) {
            return [
                'id' => $notification->id,
                'type' => get_class($notification),
                'data' => $data['data'],
                'sender_id' => $data['sender_id'],
                'read_at' => null,
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ];
        }

        return parent::buildPayload($notifiable, $notification);
    }
}
