<?php

namespace App\Providers;

use App\Guards\CustomPersonalToken;
use App\Services\ChangePushRabbitService;
use App\Services\RabbitService;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{

    public function register(): void
    {
        // Rabbit connection
        $this->app->singleton(RabbitService::class, function ($app) {
            return new RabbitService();
        });

        // ChangePushRabbitService container create singleton RabbitService
        $this->app->singleton(ChangePushRabbitService::class, function ($app) {
            return new ChangePushRabbitService($app->make(RabbitService::class));
        });
    }

    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(CustomPersonalToken::class);

        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }
    }
}
