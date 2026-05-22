<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class RabbitService
{
    protected $connection;
    protected $channel;
    protected string $queue;
    protected string $exchange;

    public function __construct(string $queue = 'Hrm', string $exchange = 'employee.events')
    {
        $this->queue = $queue;
        $this->exchange = $exchange;

        $this->connect();
        $this->setupBindings();
    }

    private function connect(): void
    {
        $this->connection = new AMQPStreamConnection(
            config('services.rabbitmq.host'),
            config('services.rabbitmq.port'),
            config('services.rabbitmq.user'),
            config('services.rabbitmq.password')
        );

        $this->channel = $this->connection->channel();
    }

    private function setupBindings(): void
    {
        // Exchange
        $this->channel->exchange_declare(
            $this->exchange,
            'topic',
            false,
            true,
            false
        );

        // Queue
        $this->channel->queue_declare(
            $this->queue,
            false,
            true,
            false,
            false
        );

        // Bind all relevant event types
        $bindings = [
            'worker.update',
            'worker.contract.update',
            'worker.position.update',
        ];

        foreach ($bindings as $routingKey) {
            $this->channel->queue_bind($this->queue, $this->exchange, $routingKey);
        }
    }

    /**
     * Listen for events (consumer)
     */
    public function listen(): void
    {
        echo "[*] Waiting for messages...\n";

        $callback = function (AMQPMessage $msg) {
            try {
                $payload = json_decode($msg->body, true, 512, JSON_THROW_ON_ERROR);

                Log::info('rabbit-event-received', [
                    'routing_key' => $msg->getRoutingKey(),
                    'data' => $payload,
                ]);

                // TODO: Here you can dispatch Laravel Jobs
                // Job::dispatch($payload);

                $msg->ack();

            } catch (Throwable $e) {
                Log::error('rabbit-event-error', [
                    'error' => $e->getMessage(),
                    'body' => $msg->body
                ]);

                // Ack qilinmasa queue’da qolib ketadi → qayta ishlaysiz
                $msg->nack();
            }
        };

        $this->channel->basic_consume(
            $this->queue,
            '',
            false,
            false,
            false,
            false,
            $callback
        );

        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    /**
     * Publish events to RabbitMQ
     */
    public function publish(string $routingKey, array $payload): void
    {
        // Alohida connection ochish — publisher uchun tavsiya etiladi
        $connection = new AMQPStreamConnection(
            config('services.rabbitmq.host'),
            config('services.rabbitmq.port'),
            config('services.rabbitmq.user'),
            config('services.rabbitmq.password'),
        );

        $channel = $connection->channel();

        $channel->exchange_declare(
            $this->exchange,
            'topic',
            false,
            true,
            false
        );

        $msg = new AMQPMessage(
            json_encode($payload, JSON_THROW_ON_ERROR),
            ['delivery_mode' => 2] // persistent
        );

        $channel->basic_publish($msg, $this->exchange, $routingKey);

        $channel->close();
        $connection->close();
    }

    /**
     * Helper to publish worker event
     */
    public function publishWorkerEvent($data, string $type): void
    {
        $this->publish($type, [
            'type' => $type,
            'payload' => $data,
            'changed_at' => now()->toDateTimeString()
        ]);
    }
}
