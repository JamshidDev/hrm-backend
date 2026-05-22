<?php

namespace App\Console\Commands;

use App\Services\RabbitService;
use Illuminate\Console\Command;

class ListenRabbit extends Command
{
    protected $signature = 'rabbit:listen';
    protected $description = 'Listen RabbitMQ events';

    public function handle(): void
    {
        $listener = new RabbitService();
        $listener->listen();
    }
}
